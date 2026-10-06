/**
 * El cliente del chat tira el fallo ENTERO (02-10-2026): un `ApiError` con su
 * status, su `code` y el cuerpo, cuyo texto es SÓLO el `message` del sobre.
 *
 * Antes: `executeAction` tiraba `new Error(err.error ?? 'execute action NNN')`
 * (el `error` en inglés del micro, o «execute action 409»), `resolveChatApproval`
 * tiraba `Error('ai-hub approval 403')`, y el chat, a falta de `message`,
 * usaba el `error` del cuerpo o «ai-hub chat stream 500» como texto. El
 * traductor mostraba todo eso tal cual.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  executeAction,
  fetchEjecucion,
  handleSSEEvent,
  postChatTurn,
  resolveChatApproval,
  streamChatTurn,
} from './ai-hub-chat';

/** Lo que nunca puede llegar a la persona. */
const CRUDO = /\b[1-5]\d\d\b|ai-hub|approve|approval|execute action|Forbidden|Internal Server Error|conversation/i;

const SOBRE_403 = { statusCode: 403, code: 'SIN_PERMISO', message: 'Tu rol no puede hacer esto en el chat.' };
const SOBRE_500 = {
  statusCode: 500,
  code: 'ERROR_INTERNO',
  message: 'Error interno del servidor',
  referencia: 'ab12cd34',
};
const VIEJO_403 = { error: 'Forbidden — tu rol sólo puede consultar, no ejecutar acciones', code: 'ROL_SOLO_CONSULTA' };

const respuesta = (status: number, cuerpo?: unknown) =>
  cuerpo === undefined ? new Response(null, { status }) : new Response(JSON.stringify(cuerpo), { status });

/** El error con el que rechazó (o un `Error` si no rechazó, para que la prueba falle). */
const fallo = (p: Promise<unknown>) =>
  p.then(
    () => new ApiError(-1, 'no falló'),
    (x: unknown) => x as ApiError,
  );

let contesta: () => Response;
beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
  vi.stubGlobal('fetch', vi.fn(async () => contesta()));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const LLAMADAS: Array<[string, () => Promise<unknown>]> = [
  ['postChatTurn', () => postChatTurn({ agencyId: 'ag-1', message: 'hola' })],
  ['streamChatTurn', () => streamChatTurn({ agencyId: 'ag-1', message: 'hola', handlers: {} })],
  ['executeAction', () => executeAction({ agencyId: 'ag-1', workItemId: 'wi-1', action: 'approve' })],
  ['resolveChatApproval', () => resolveChatApproval({ agencyId: 'ag-1', approvalId: 'ap-1', outcome: 'approved' })],
  ['fetchEjecucion', () => fetchEjecucion({ agencyId: 'ag-1', ejecucionId: 'ej-1' })],
];

describe.each(LLAMADAS)('%s: el fallo llega entero y se dice por el traductor', (_nombre, llamar) => {
  it('un 403 con el sobre: ApiError 403 con su code, y el texto es el `message` del sobre', async () => {
    contesta = () => respuesta(403, SOBRE_403);
    const e = await fallo(llamar());
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(403);
    expect(e.code).toBe('SIN_PERMISO');
    expect(mensajeParaLaPersona(e)).toBe('Tu rol no puede hacer esto en el chat.');
  });

  it('un 403 del cuerpo viejo: el `error` en inglés nunca es el texto', async () => {
    contesta = () => respuesta(403, VIEJO_403);
    const e = await fallo(llamar());
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(403);
    expect(e.message).toBe('');
    const texto = mensajeParaLaPersona(e, { porDefecto: 'No se pudo.' });
    expect(texto).toBe('No se pudo.');
    expect(texto).not.toMatch(CRUDO);
  });

  it('un 500 con referencia: «de nuestro lado» + la referencia', async () => {
    contesta = () => respuesta(500, SOBRE_500);
    const e = await fallo(llamar());
    expect(e).toBeInstanceOf(ApiError);
    const texto = mensajeParaLaPersona(e, { accion: 'hacerlo' });
    expect(texto).toContain('No pudimos hacerlo: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(CRUDO);
  });

  it('una respuesta sin cuerpo: ni «ai-hub … 500» ni «execute action 500»', async () => {
    contesta = () => respuesta(500);
    const e = await fallo(llamar());
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(500);
    const texto = mensajeParaLaPersona(e, { accion: 'hacerlo' });
    expect(texto).toContain('algo falló de nuestro lado');
    expect(texto).not.toMatch(CRUDO);
  });

  it('un 409 sin cuerpo: lo de por defecto, nunca «… 409»', async () => {
    contesta = () => respuesta(409);
    const e = await fallo(llamar());
    const texto = mensajeParaLaPersona(e, { porDefecto: 'No se pudo.' });
    expect(texto).toBe('No se pudo.');
  });
});

describe('lo que ya estaba bien no se rompe', () => {
  it('fetchEjecucion: un 404 sigue siendo `null`, no un error', async () => {
    contesta = () => respuesta(404, { error: 'no existe' });
    await expect(fetchEjecucion({ agencyId: 'ag-1', ejecucionId: 'ej-1' })).resolves.toBeNull();
  });

  it('un 429 sigue diciendo cuánto esperar', async () => {
    contesta = () =>
      new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429, headers: { 'Retry-After': '45' } });
    const e = await fallo(executeAction({ agencyId: 'ag-1', workItemId: 'wi-1', action: 'approve' }));
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(429);
    expect(e.message).not.toContain('Too many');
    expect(e.detalle?.reintentarEnSegundos).toBe(45);
  });
});

describe('el evento `error` del stream', () => {
  it('trae el sobre aparte del `error` interno: el `message` en español y la referencia', () => {
    const vistos: unknown[] = [];
    handleSSEEvent(
      'event: error\ndata: {"error":"Upstream exploded","statusCode":500,"code":"ERROR_INTERNO","message":"Se cayó la consulta.","referencia":"ab12cd34"}',
      { onError: (m, meta) => vistos.push([m, meta]) },
    );
    expect(vistos).toEqual([
      ['Upstream exploded', { status: 500, code: 'ERROR_INTERNO', mensaje: 'Se cayó la consulta.', referencia: 'ab12cd34' }],
    ]);
  });
});
