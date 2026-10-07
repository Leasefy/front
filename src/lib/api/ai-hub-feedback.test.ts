/**
 * El pulgar del chat (02-10-2026): un envío que falla tira el fallo ENTERO
 * (`ApiError` con status, `code` y cuerpo), no `Error('ai-hub chat feedback
 * 403')`. Así la pantalla dice por qué (permiso, sesión, un fallo nuestro con
 * su referencia, la conexión) en vez de un «no pude guardar» para todo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (extra?: HeadersInit) => new Headers(extra),
}));

import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { enviarFeedbackDeChat } from './ai-hub-feedback';

const FEEDBACK = { turnId: 't-1', pregunta: '¿cuánto debe?', respuesta: 'Debe $1.000.000.', veredicto: 'up' as const };

let contesta: () => Response;
beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
  vi.stubGlobal('fetch', vi.fn(async () => contesta()));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const enviar = () => enviarFeedbackDeChat({ agencyId: 'ag-1', feedback: FEEDBACK }).catch((e) => e);

describe('enviarFeedbackDeChat', () => {
  it('un 403 llega como ApiError con su code; el texto nunca es «ai-hub chat feedback 403»', async () => {
    contesta = () => new Response(JSON.stringify({ error: 'Forbidden — no eres miembro activo', code: 'SIN_MEMBRESIA_ACTIVA' }), { status: 403 });
    const e = await enviar();
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(403);
    expect(e.code).toBe('SIN_MEMBRESIA_ACTIVA');
    expect(e.message).not.toMatch(/feedback|403|Forbidden/);
  });

  it('un 5xx conserva la referencia para el traductor', async () => {
    contesta = () =>
      new Response(
        JSON.stringify({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor', referencia: 'ab12cd34' }),
        { status: 500 },
      );
    const texto = mensajeParaLaPersona(await enviar(), { accion: 'guardar tu valoración' });
    expect(texto).toContain('No pudimos guardar tu valoración: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
  });

  it('sin cuerpo: un ApiError con el status, sin texto inventado', async () => {
    contesta = () => new Response(null, { status: 502 });
    const e = await enviar();
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(502);
    expect(e.message).toBe('');
  });
});
