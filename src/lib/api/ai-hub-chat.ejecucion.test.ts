/**
 * El servicio del chat y el EJECUTOR (24-09): el SSE `proceso_iniciado`, las
 * claves nuevas del `done` (`ejecucion`, `ensayo`) —con un `done` viejo que
 * no las trae— y `GET …/ai-hub/chat/ejecuciones/{id}`.
 *
 * 🔴 La ruta se compara contra el CONTRATO del micro (`rutaDelMicro`): una
 * prueba que espía `fetch` dice qué pedimos, no si eso existe.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => {
    const h = new Headers(extra);
    h.set('Authorization', 'Bearer token-de-la-persona');
    return h;
  },
}));

import { erroresContraElEsquema, rutaDelMicro } from '@/lib/api/contrato-del-chat-del-micro';
import { fetchEjecucion, handleSSEEvent, type ChatStreamHandlers } from './ai-hub-chat';
import {
  AGENCIA,
  EJECUCION,
  PROCESO,
  doneConEjecucion,
  enCurso,
  hecha,
  propuestaDeRenovacion,
} from '@/lib/chat/tarjetas-de-ejecucion.fixtures';

type Final = Parameters<NonNullable<ChatStreamHandlers['onDone']>>[0];

describe('SSE `proceso_iniciado`', () => {
  it('llega con sus dos ids antes del `done`', () => {
    const eventos: unknown[] = [];
    handleSSEEvent(
      `event: proceso_iniciado\ndata: ${JSON.stringify({ type: 'proceso_iniciado', procesoId: PROCESO, ejecucionId: EJECUCION })}`,
      { onProcesoIniciado: (e) => eventos.push(e) },
    );
    expect(eventos).toEqual([{ procesoId: PROCESO, ejecucionId: EJECUCION }]);
  });

  it('sin sus ids (o con JSON roto) se ignora sin romper el stream', () => {
    const onProcesoIniciado = vi.fn();
    handleSSEEvent('event: proceso_iniciado\ndata: {"type":"proceso_iniciado","procesoId":""}', { onProcesoIniciado });
    handleSSEEvent('event: proceso_iniciado\ndata: {roto', { onProcesoIniciado });
    expect(onProcesoIniciado).not.toHaveBeenCalled();
  });
});

describe('el `done` con la tarjeta del ejecutor', () => {
  it('trae la tarjeta leída y el modo ensayo', () => {
    let final: Final | null = null;
    handleSSEEvent(`event: done\ndata: ${JSON.stringify(doneConEjecucion(enCurso(), { ensayo: true }))}`, {
      onDone: (f) => (final = f),
    });
    expect(final!.ejecucion).toMatchObject({ tipo: 'en_curso', ejecucionId: EJECUCION, procesoId: PROCESO });
    expect(final!.ensayo).toBe(true);
  });

  it('un `done` VIEJO (sin `ejecucion` ni `ensayo`) sigue trayendo la confirmación de siempre', () => {
    let final: Final | null = null;
    const viejo = {
      responseText: 'Antes de hacerlo, confírmame:',
      suggestedActions: [],
      dispatches: [],
      confirmacion: {
        propuestaId: EJECUCION,
        accion: 'registrar_pago',
        titulo: 'Registrar el pago',
        frase: 'Voy a registrar el pago de $1.550.000.',
        pregunta: '¿Lo hago?',
        porQue: '',
        modo: 'copiloto',
        riesgo: { muevePlata: true, escribeATerceros: false, irreversible: false },
        venceEn: null,
      },
    };
    handleSSEEvent(`event: done\ndata: ${JSON.stringify(viejo)}`, { onDone: (f) => (final = f) });
    expect(final!.ejecucion).toBeNull();
    expect(final!.ensayo).toBe(false);
    expect(final!.confirmacion?.propuestaId).toBe(EJECUCION);
  });

  it('una tarjeta que este panel no entiende queda en `null` (el hilo usa lo de siempre)', () => {
    let final: Final | null = null;
    handleSSEEvent(`event: done\ndata: ${JSON.stringify(doneConEjecucion({ tipo: 'plan', ejecucionId: EJECUCION }))}`, {
      onDone: (f) => (final = f),
    });
    expect(final!.ejecucion).toBeNull();
  });
});

describe('GET …/ai-hub/chat/ejecuciones/{id}', () => {
  afterEach(() => vi.unstubAllGlobals());

  const responder = (status: number, cuerpo: unknown) =>
    vi.fn(async (_url: string, _init?: RequestInit) =>
      ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => cuerpo }) as unknown as Response,
    );

  it('pide la ruta que el micro expone, con el token de la persona, y devuelve la tarjeta', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
    const cuerpo = { tarjeta: hecha(true) };
    const fetchFalso = responder(200, cuerpo);
    vi.stubGlobal('fetch', fetchFalso);

    const tarjeta = await fetchEjecucion({ agencyId: AGENCIA, ejecucionId: EJECUCION });

    const [url, init] = fetchFalso.mock.calls[0]!;
    expect(url).toBe(`http://micro.test/api/agency/${AGENCIA}/ai-hub/chat/ejecuciones/${EJECUCION}`);
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-de-la-persona');
    const ruta = rutaDelMicro('GET', url);
    expect(ruta, 'la ruta no existe en el contrato del micro').not.toBeNull();
    // Y lo que devuelve el doble es lo que el micro de verdad responde.
    expect(erroresContraElEsquema(ruta!.ruta.respuesta!, cuerpo, 'respuesta')).toEqual([]);
    expect(tarjeta).toMatchObject({ tipo: 'resultado', estado: 'hecha', deshacer: { etiqueta: 'Anular el recibo' } });
  });

  it('404 (no es tuya, o falta la migración del micro) → `null`, sin lanzar', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
    vi.stubGlobal('fetch', responder(404, { error: 'No encontré esa acción del chat (o no es tuya).' }));
    await expect(fetchEjecucion({ agencyId: AGENCIA, ejecucionId: EJECUCION })).resolves.toBeNull();
  });

  it('un 5xx lanza (quien la pidió decide si vuelve a preguntar)', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
    vi.stubGlobal('fetch', responder(503, { error: 'caído' }));
    await expect(fetchEjecucion({ agencyId: AGENCIA, ejecucionId: EJECUCION })).rejects.toMatchObject({ status: 503 });
  });

  it('una respuesta sin tarjeta entendible → `null`', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
    vi.stubGlobal('fetch', responder(200, { tarjeta: { ...propuestaDeRenovacion(), tipo: 'plan' } }));
    await expect(fetchEjecucion({ agencyId: AGENCIA, ejecucionId: EJECUCION })).resolves.toBeNull();
  });
});
