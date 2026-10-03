/**
 * Lo puro del «¿Aprendo esto?»: a qué URL va (siempre una ruta REAL del micro)
 * y en qué respuestas vale la pena ofrecerlo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { rutaDelMicro } from '@/lib/api/contrato-del-chat-del-micro';
import type { ChatMessage } from '@/lib/types/beta-chat';

import { decidirAprendizaje, propuestaDeshecha, urlDeAprender, valeLaPenaOfrecer } from './aprender';

const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
const TURNO = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';
const ORIGINAL = process.env.NEXT_PUBLIC_AGENT_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
});
afterEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = ORIGINAL;
});

describe('urlDeAprender', () => {
  it('arma la ruta que el micro expone (GET y POST)', () => {
    const url = urlDeAprender(AGENCIA, TURNO)!;
    expect(rutaDelMicro('GET', url)).not.toBeNull();
    expect(rutaDelMicro('POST', url)).not.toBeNull();
  });

  it('sin micro, sin agencia o con un turno que no es del servidor: no hay a dónde ir', () => {
    expect(urlDeAprender(AGENCIA, 'msg-123')).toBeNull();
    expect(urlDeAprender(null, TURNO)).toBeNull();
    delete process.env.NEXT_PUBLIC_AGENT_URL;
    expect(urlDeAprender(AGENCIA, TURNO)).toBeNull();
  });
});

describe('valeLaPenaOfrecer', () => {
  const base = { role: 'assistant', status: 'complete', turnoId: TURNO } as Pick<
    ChatMessage,
    'role' | 'status' | 'turnoId' | 'entidades' | 'resultado'
  >;

  it('con tarjetas, con un «Deshacer» o tras una definición; si no, no', () => {
    expect(valeLaPenaOfrecer({ ...base, entidades: [{ tipo: 'contrato', id: 'c-1', titulo: '#1' }] as ChatMessage['entidades'] }, null)).toBe(true)
    const deshecha = { ...base, resultado: { propuestaId: 'p-1', estado: 'deshecha', titulo: '', resumen: 'x', deshacer: null } } as typeof base
    expect(valeLaPenaOfrecer(deshecha, null)).toBe(true);
    expect(propuestaDeshecha(deshecha)).toBe('p-1');
    expect(valeLaPenaOfrecer(base, 'acá le decimos la 81 al edificio de la Calle 81 Sur')).toBe(true);
    expect(valeLaPenaOfrecer(base, '¿cuánto tengo en cartera?')).toBe(false);
  });

  it('nunca en un mensaje sin turno del servidor, sin terminar o de la persona', () => {
    const conTarjetas = { entidades: [{ tipo: 'contrato', id: 'c-1', titulo: '#1' }] as ChatMessage['entidades'] };
    expect(valeLaPenaOfrecer({ ...base, ...conTarjetas, turnoId: undefined }, null)).toBe(false);
    expect(valeLaPenaOfrecer({ ...base, ...conTarjetas, status: 'streaming' } as typeof base, null)).toBe(false);
    expect(valeLaPenaOfrecer({ ...base, ...conTarjetas, role: 'user' }, null)).toBe(false);
  });
});

/**
 * 02-10-2026 · La decisión del administrador ya no se traga el fallo: un no-OK
 * lanza el `ApiError` entero (`falloDelMicro`) y la red caída su `TypeError`,
 * para que «¿Aprendo esto?» lo diga por el traductor. Antes todo era `null`.
 */
describe('decidirAprendizaje', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const decidir = () => decidirAprendizaje(AGENCIA, TURNO, { id: 'lesson-1', decision: 'aprender' });

  it('el 403 `SOLO_ADMINISTRADOR` llega entero, con su code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'SOLO_ADMINISTRADOR', code: 'SOLO_ADMINISTRADOR' }), { status: 403 })),
    );
    const e = await decidir().catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 403, code: 'SOLO_ADMINISTRADOR' });
  });

  it('un 5xx llega con su referencia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ statusCode: 500, code: 'ERROR_INTERNO', referencia: 'ab12cd34' }), { status: 500 }),
      ),
    );
    const e = await decidir().catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.detalle.referencia).toBe('ab12cd34');
  });

  it('sin internet en el navegador, la red caída lanza su `TypeError` (es «la conexión», no «no se guardó»)', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
      await expect(decidir()).rejects.toBeInstanceOf(TypeError);
    } finally {
      enLinea.mockRestore();
    }
  });

  it('🔴 ARREGLOS-4 · el micro caído con el back sano es «el asistente no está disponible» (503), no la conexión', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const e = await decidir().catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(503);
  });

  it('lo que salió bien se devuelve tal cual; sin a dónde mandarlo, `null` sin preguntar', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ aplicado: true, estado: 'aprendido', motivo: '', leccionesEnUso: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(decidir()).resolves.toMatchObject({ aplicado: true, estado: 'aprendido' });
    await expect(decidirAprendizaje(AGENCIA, 'no-es-un-turno', { id: 'lesson-1', decision: 'aprender' })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
