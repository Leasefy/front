/**
 * El turno del chat, por donde de verdad duele:
 *
 *  1. El texto se MUESTRA cuando llega el evento `message`, no al `done`.
 *     Medido en vivo: el micro manda la respuesta completa en `message` y el
 *     front la escondía hasta el cierre del stream → 25 s de pantalla muerta y
 *     después el texto de golpe.
 *  2. Cambiar de conversación ABORTA el turno en vuelo. Antes el `fetch`
 *     seguía y sus handlers volvían a prender `isStreaming`/`isAgentsRunning`:
 *     la conversación nueva quedaba con el compositor bloqueado.
 *  3. El historial ya NO se borra cada día natural.
 */

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: 'ag-1' } }),
}));

const streamChatTurn = vi.fn();
const postChatTurn = vi.fn();

vi.mock('@/lib/api/ai-hub-chat', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/ai-hub-chat')>(
    '@/lib/api/ai-hub-chat',
  );
  return {
    ...real,
    isAgentConfigured: () => true,
    streamChatTurn: (...a: unknown[]) => streamChatTurn(...a),
    postChatTurn: (...a: unknown[]) => postChatTurn(...a),
  };
});

import {
  aprobacionADecision,
  podarConversacionesViejas,
  useBetaChat,
} from './useBetaChat';
import type { BackendPendingApproval } from '@/lib/api/ai-hub-chat';
import type { Conversation } from '@/lib/types/beta-chat';

beforeEach(() => {
  localStorage.clear();
  streamChatTurn.mockReset();
  postChatTurn.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Monta el hook y deja leer su valor actual (el repo no usa @testing-library). */
function montar() {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const root: Root = createRoot(contenedor);
  const ref: { current: ReturnType<typeof useBetaChat> | null } = { current: null };

  function Sonda() {
    ref.current = useBetaChat();
    return null;
  }
  act(() => {
    root.render(<Sonda />);
  });
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

/** Espera (bombeando el reloj de React) hasta que la condición se cumpla. */
async function esperarA(cond: () => boolean, ms = 4000): Promise<void> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (cond()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  expect(cond()).toBe(true);
}

/** Texto visible del asistente: el del mensaje o el que se está tecleando. */
function textoDelAsistente(s: ReturnType<typeof montar>): string {
  const m = [...s.actual.messages].reverse().find((x) => x.role === 'assistant');
  return m?.content || s.actual.streamingContent || '';
}

describe('el texto se ve cuando llega `message`, no al `done`', () => {
  it('con el stream abierto (sin `done` todavía) la respuesta ya está a la vista', async () => {
    // El stream emite `message` y se queda colgado: es el escenario real —
    // entre `message` y `done` corre el especialista, decenas de segundos.
    let soltar!: () => void;
    const colgado = new Promise<void>((r) => {
      soltar = r;
    });
    streamChatTurn.mockImplementation(async (args: { handlers: Record<string, unknown> }) => {
      const h = args.handlers as {
        onMessage: (t: string, a: unknown[]) => void;
      };
      h.onMessage('Tienes 10 inmuebles arrendados y 2 disponibles.', []);
      await colgado;
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('¿cuántos inmuebles tengo?');
    });

    await esperarA(() => textoDelAsistente(s).includes('Tienes 10 inmuebles'));
    // El `done` nunca llegó: si el texto se ve, se vio al `message`.
    expect(textoDelAsistente(s)).toContain('Tienes 10 inmuebles');
    soltar();
    s.soltar();
  });

  it('el `done` reconcilia el mismo texto sin reiniciarlo y cierra el turno', async () => {
    streamChatTurn.mockImplementation(async (args: { handlers: Record<string, unknown> }) => {
      const h = args.handlers as {
        onMessage: (t: string, a: unknown[]) => void;
        onDone: (f: unknown) => void;
      };
      h.onMessage('Respuesta final del asistente.', []);
      h.onDone({
        responseText: 'Respuesta final del asistente.',
        suggestedActions: [],
        dispatches: [],
      });
    });

    const s = montar();
    act(() => {
      s.actual.sendMessage('hola');
    });

    await esperarA(() => textoDelAsistente(s).includes('Respuesta final'));
    await esperarA(() => s.actual.isStreaming === false, 8000);
    expect(textoDelAsistente(s)).toBe('Respuesta final del asistente.');
    expect(s.actual.isThinking).toBe(false);
    s.soltar();
  });
});

describe('cambiar de conversación aborta el turno en vuelo', () => {
  it('aborta el fetch y deja la UI desbloqueada, sin cartel de error', async () => {
    let señal: AbortSignal | undefined;
    streamChatTurn.mockImplementation(
      async (args: { signal?: AbortSignal; handlers: Record<string, unknown> }) => {
        señal = args.signal;
        const h = args.handlers as { onMessage: (t: string, a: unknown[]) => void };
        h.onMessage('Voy a mitad de camino…', []);
        await new Promise<void>((resolve) => {
          args.signal?.addEventListener('abort', () => resolve());
        });
        throw new DOMException('Aborted', 'AbortError');
      },
    );

    const s = montar();
    act(() => {
      s.actual.sendMessage('pregunta larga');
    });
    await esperarA(() => señal !== undefined);

    act(() => {
      s.actual.createConversation();
    });
    await esperarA(() => señal!.aborted === true);

    // La conversación NUEVA no puede quedar con el compositor bloqueado.
    await esperarA(() => s.actual.isStreaming === false);
    expect(s.actual.isAgentsRunning).toBe(false);
    expect(s.actual.isThinking).toBe(false);
    // Y abortar es intencional: ni respaldo POST ni mensaje de error.
    expect(postChatTurn).not.toHaveBeenCalled();
    expect(s.actual.messages).toHaveLength(0);
    s.soltar();
  });
});

describe('el historial ya no se borra cada día', () => {
  it('poda por antigüedad (30 días) en vez de vaciar al cambiar de fecha', () => {
    const ahora = new Date('2026-09-05T12:00:00Z');
    const conv = (id: string, dias: number): Conversation =>
      ({
        id,
        title: id,
        messages: [],
        createdAt: new Date(ahora.getTime() - dias * 86_400_000),
        updatedAt: new Date(ahora.getTime() - dias * 86_400_000),
      }) as Conversation;

    const podadas = podarConversacionesViejas(
      [conv('ayer', 1), conv('hace-veinte', 20), conv('hace-cien', 100)],
      ahora,
    );
    expect(podadas.map((c) => c.id)).toEqual(['ayer', 'hace-veinte']);
  });
});

describe('aprobacionADecision — la MISMA conversión para el stream y el respaldo POST', () => {
  it('convierte la aprobación vinculante en la tarjeta de decisión', () => {
    const ap: BackendPendingApproval = {
      id: 'ap-1',
      agent: 'cobranza',
      actionType: 'payment_plan',
      title: 'Acuerdo de pago',
      description: '3 cuotas de $1.200.000',
      payloadPreview: { cuotas: '3' },
      options: [
        { id: 'si', label: 'Aprobar', description: 'Se registra la decisión', recommendation: 'recommended' },
      ],
      requiresApproval: true,
    };
    expect(aprobacionADecision(ap)).toMatchObject({
      id: 'ap-1',
      approvalId: 'ap-1',
      title: 'Acuerdo de pago',
      category: 'cobranza',
    });
  });
});
