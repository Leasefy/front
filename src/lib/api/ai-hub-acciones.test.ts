/**
 * El carril de acciones del chat, del lado del front.
 *
 * Dos cosas que importan:
 *   - el evento `accion_propuesta` del stream llega a la tarjeta, y una
 *     propuesta sin id se ignora (un botón que no lleva a ningún lado es peor
 *     que no tener botón);
 *   - confirmar/cancelar hablan con el agente y traducen el código HTTP, sin
 *     inventar un resultado: un 410 es «venció», no «no se pudo».
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import {
  cancelarAccion,
  confirmarAccion,
  ErrorDeAccion,
  propuestaVencida,
  type BackendAccionPropuesta,
} from './ai-hub-acciones';
import { handleSSEEvent } from './ai-hub-chat';

const AGENCIA = '11111111-1111-4111-8111-111111111111';

const PROPUESTA: BackendAccionPropuesta = {
  id: 'p-1',
  accion: 'recordatorio_pago',
  titulo: 'Recordatorio de pago',
  resumen: 'Recordatorio a 3 inquilinos',
  canal: 'hilo_directo',
  destinatarios: [{ nombre: 'Laura', contacto: 'lau•••@x.co' }],
  total: 3,
  texto: 'Hola, tienes un pago pendiente.',
  estado: 'pendiente',
  venceEn: new Date(Date.now() + 600_000).toISOString(),
};

const fetchOriginal = globalThis.fetch;
const urlOriginal = process.env.NEXT_PUBLIC_AGENT_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_AGENT_URL;
  else process.env.NEXT_PUBLIC_AGENT_URL = urlOriginal;
});

describe('evento accion_propuesta', () => {
  it('entrega la propuesta al manejador', () => {
    const onAccionPropuesta = vi.fn();
    handleSSEEvent(
      `event: accion_propuesta\ndata: ${JSON.stringify({ type: 'accion_propuesta', propuesta: PROPUESTA })}`,
      { onAccionPropuesta },
    );
    expect(onAccionPropuesta).toHaveBeenCalledWith(PROPUESTA);
  });

  it('ignora una propuesta sin id: no se puede confirmar', () => {
    const onAccionPropuesta = vi.fn();
    handleSSEEvent(
      `event: accion_propuesta\ndata: ${JSON.stringify({ propuesta: { ...PROPUESTA, id: '' } })}`,
      { onAccionPropuesta },
    );
    expect(onAccionPropuesta).not.toHaveBeenCalled();
  });
});

describe('confirmarAccion', () => {
  it('manda sólo el id de la propuesta y devuelve el resultado', async () => {
    const respuesta = {
      propuestaId: 'p-1',
      estado: 'ejecutada',
      yaEjecutada: false,
      resultado: { enviados: 3, fallidos: [], resumen: 'Listo: 3 recordatorios enviados.' },
      resueltaEn: new Date().toISOString(),
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(respuesta), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const r = await confirmarAccion({ agencyId: AGENCIA, propuestaId: 'p-1' });
    expect(r.resultado?.enviados).toBe(3);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://agente.test/api/agency/${AGENCIA}/ai-hub/chat/acciones/p-1/confirmar`);
    expect(init.method).toBe('POST');
    // Nada del contenido viaja desde el front: lo que se ejecuta es lo guardado.
    expect(init.body).toBeUndefined();
  });

  it('un 410 llega como ErrorDeAccion con su código, para poder decir «venció»', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: 'La propuesta venció.' }), { status: 410 }),
    ) as unknown as typeof fetch;
    await expect(confirmarAccion({ agencyId: AGENCIA, propuestaId: 'p-1' })).rejects.toMatchObject({
      name: 'ErrorDeAccion',
      status: 410,
    });
  });

  it('un 403 también conserva el código', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    const error = await confirmarAccion({ agencyId: AGENCIA, propuestaId: 'p-1' }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorDeAccion);
    expect((error as ErrorDeAccion).status).toBe(403);
  });
});

describe('cancelarAccion', () => {
  it('pega en /cancelar', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            propuestaId: 'p-1',
            estado: 'cancelada',
            yaEjecutada: false,
            resultado: null,
            resueltaEn: new Date().toISOString(),
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const r = await cancelarAccion({ agencyId: AGENCIA, propuestaId: 'p-1' });
    expect(r.estado).toBe('cancelada');
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('/cancelar');
  });
});

describe('propuestaVencida', () => {
  it('es verdad cuando la hora ya pasó', () => {
    expect(propuestaVencida({ ...PROPUESTA, venceEn: new Date(Date.now() - 1000).toISOString() })).toBe(true);
    expect(propuestaVencida(PROPUESTA)).toBe(false);
  });
});
