/**
 * El pensamiento en vivo en el hook del chat (02-10-2026), por la red de verdad
 * (el `fetch` es falso; el stream, su lectura y el cliente, reales):
 *
 *  1. Cada paso del micro llega MIENTRAS el turno corre, se actualiza en su
 *     lugar y el «progreso» del micro va al paso que corre.
 *  2. Al llegar la respuesta se cierra y queda guardado en el mensaje
 *     («Cómo lo pensó · 8,4 s»), junto al razonamiento del `done`.
 *  3. Con un micro viejo (sin el evento) no hay pensamiento: mandan los pasos de siempre.
 */
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: '504bdd59-d05f-4ae2-99c5-b71e6accb58c' } }),
}));

import { useBetaChat } from './useBetaChat';
import { setAccessToken } from '@/lib/api/client';
import type { ChatMessage } from '@/lib/types/beta-chat';

const linea = (e: string, d: unknown) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;
const DONE = {
  responseText: 'Tienes 14 contratos que vencen en noviembre.',
  suggestedActions: [],
  dispatches: [],
  pendingApprovals: [],
  accionesPropuestas: [],
  entidades: [],
  bloques: [],
  razonamiento: [{ texto: 'Era la pregunta de un dato puntual de tu operación.' }],
  generatedAt: new Date().toISOString(),
};

/** Un stream que suelta la primera parte y espera a `soltar()` para el resto. */
let soltar: () => void = () => undefined;
function streamEnDosTiempos(primero: string[], despues: string[]): Response {
  const enc = new TextEncoder();
  const cuerpo = new ReadableStream<Uint8Array>({
    async start(c) {
      for (const p of primero) c.enqueue(enc.encode(p));
      await new Promise<void>((r) => (soltar = r));
      for (const p of despues) c.enqueue(enc.encode(p));
      c.close();
    },
  });
  return new Response(cuerpo, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

let respuesta: () => Response;

beforeEach(() => {
  localStorage.clear();
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
  setAccessToken('token-de-prueba');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (new URL(url).pathname.endsWith('/ai-hub/chat/stream')) return respuesta();
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    })
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const root: Root = createRoot(contenedor);
  const ref: { current: ReturnType<typeof useBetaChat> | null } = { current: null };
  function Sonda() {
    ref.current = useBetaChat();
    return null;
  }
  act(() => root.render(<Sonda />));
  return {
    get actual() {
      return ref.current!;
    },
    soltar() {
      act(() => root.unmount());
      contenedor.remove();
    },
  };
}

async function esperarA(cond: () => boolean, ms = 8000): Promise<void> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (cond()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

const ultimoAsistente = (s: ReturnType<typeof montar>) =>
  [...s.actual.messages].reverse().find((m) => m.role === 'assistant') as
    | (ChatMessage & { pensamiento?: { pasos: Array<{ id: string; estado: string }>; duracionMs: number } })
    | undefined;

describe('el pensamiento en vivo en el hook', () => {
  it('llega mientras corre, se actualiza en su lugar, y queda guardado en el mensaje al responder', async () => {
    respuesta = () =>
      streamEnDosTiempos(
        [
          linea('pensamiento', { type: 'pensamiento', id: 'pregunta', fase: 'pregunta', estado: 'listo', texto: 'Contratos que vencen entre el 1 y el 30 de noviembre de 2026', ms: 0 }),
          linea('pensamiento', { type: 'pensamiento', id: 'despacho-d-1', fase: 'despacho', estado: 'en_curso', agente: 'reportes', dispatchId: 'd-1', texto: 'Le pido al especialista de reportes: “x”…', ms: 3580 }),
          linea('progreso', { type: 'progreso', texto: 'Revisando las 14 filas de contratos…' }),
        ],
        [
          linea('pensamiento', { type: 'pensamiento', id: 'despacho-d-1', fase: 'despacho', estado: 'listo', agente: 'reportes', dispatchId: 'd-1', texto: 'Le pedí al especialista de reportes: “x”', resultado: { texto: '14 contratos', cifra: 14, formato: 'numero' }, ms: 6280 }),
          linea('message', { type: 'message', responseText: DONE.responseText, suggestedActions: [] }),
          linea('done', DONE),
        ]
      );
    const s = montar();
    act(() => s.actual.sendMessage('¿Cuántos contratos vencen en noviembre?'));

    // Mientras corre: los pasos que llegaron, el que corre con su «ahora».
    await esperarA(() => (s.actual.pensamiento?.pasos.length ?? 0) === 2 && Boolean(s.actual.pensamiento?.pasos[1]?.actividad));
    expect(s.actual.pensamiento!.fin).toBeNull();
    expect(s.actual.pensamiento!.pasos[1]).toMatchObject({ id: 'despacho-d-1', estado: 'en_curso', actividad: 'Revisando las 14 filas de contratos…' });

    act(() => soltar());
    await esperarA(() => ultimoAsistente(s)?.status === 'complete' && !s.actual.isStreaming);

    // Se actualizó EN SU LUGAR (no se duplicó) y se cerró.
    expect(s.actual.pensamiento!.pasos.map((p) => `${p.id}:${p.estado}`)).toEqual(['pregunta:listo', 'despacho-d-1:listo']);
    expect(s.actual.pensamiento!.fin).not.toBeNull();
    // Guardado en el mensaje para «Cómo lo pensó», con el razonamiento del `done`.
    const m = ultimoAsistente(s)!;
    expect(m.pensamiento?.pasos.map((p) => p.id)).toEqual(['pregunta', 'despacho-d-1']);
    expect(m.pensamiento?.duracionMs).toBeGreaterThanOrEqual(0);
    expect((m as { razonamiento?: unknown }).razonamiento).toEqual(DONE.razonamiento);
    s.soltar();
  });

  it('un micro viejo (sin el evento): no hay pensamiento y el mensaje no guarda ninguno', async () => {
    respuesta = () =>
      streamEnDosTiempos(
        [linea('progreso', { type: 'progreso', texto: 'Buscando…' })],
        [linea('message', { type: 'message', responseText: 'Hola.', suggestedActions: [] }), linea('done', { ...DONE, responseText: 'Hola.', razonamiento: undefined })]
      );
    const s = montar();
    act(() => s.actual.sendMessage('hola'));
    await esperarA(() => s.actual.turnSteps.length > 0);
    expect(s.actual.pensamiento?.pasos ?? []).toHaveLength(0);
    act(() => soltar());
    await esperarA(() => ultimoAsistente(s)?.status === 'complete' && !s.actual.isStreaming);
    expect(ultimoAsistente(s)?.pensamiento).toBeUndefined();
    s.soltar();
  });
});
