/**
 * @vitest-environment happy-dom
 */
/**
 * El hook del chat y las tarjetas del EJECUTOR (24-09):
 *
 *   · el SSE `proceso_iniciado` (antes del `done`) llega a la tarjeta en curso
 *     de su ejecución y despierta al Centro de procesos del panel;
 *   · un `done` VIEJO (sin `ejecucion`) deja el hilo como siempre;
 *   · `refrescarEjecucion` pone al día la tarjeta en SU mensaje, y sólo ahí
 *     (la misma ejecución pudo pasar antes por otro mensaje como propuesta).
 */

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ agency: { id: '504bdd59-d05f-4ae2-99c5-b71e6accb58c' } }),
}));

const { streamChatTurn, fetchEjecucion, invalidar } = vi.hoisted(() => ({
  streamChatTurn: vi.fn(),
  fetchEjecucion: vi.fn(),
  invalidar: vi.fn(),
}));

vi.mock('@/lib/api/ai-hub-chat', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/ai-hub-chat')>('@/lib/api/ai-hub-chat');
  return {
    ...real,
    isAgentConfigured: () => true,
    streamChatTurn: (...a: unknown[]) => streamChatTurn(...a),
    postChatTurn: vi.fn(),
    fetchEjecucion: (...a: unknown[]) => fetchEjecucion(...a),
  };
});
vi.mock('@/lib/api/refresco-de-datos', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/refresco-de-datos')>('@/lib/api/refresco-de-datos');
  return { ...real, invalidar: (...a: unknown[]) => invalidar(...a) };
});

import { useBetaChat } from './useBetaChat';
import { handleSSEEvent, type ChatStreamHandlers } from '@/lib/api/ai-hub-chat';
import { leerTarjetaDeEjecucion } from '@/lib/chat/tarjetas-de-ejecucion';
import {
  AGENCIA,
  EJECUCION,
  PROCESO,
  doneConEjecucion,
  enCurso,
  hecha,
  propuestaDeRenovacion,
} from '@/lib/chat/tarjetas-de-ejecucion.fixtures';

beforeEach(() => {
  localStorage.clear();
  streamChatTurn.mockReset();
  fetchEjecucion.mockReset();
  invalidar.mockReset();
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

/** El stream del micro, evento por evento, con el MISMO lector que usa el chat. */
function streamDelMicro(eventos: string[]) {
  streamChatTurn.mockImplementation(async (args: { handlers: ChatStreamHandlers }) => {
    for (const e of eventos) handleSSEEvent(e, args.handlers);
  });
}
const sse = (evento: string, data: unknown) => `event: ${evento}\ndata: ${JSON.stringify(data)}`;

const ultimoDelAsistente = (s: ReturnType<typeof montar>) =>
  [...s.actual.messages].reverse().find((m) => m.role === 'assistant');

afterEach(() => {
  vi.useRealTimers();
});

describe('el SSE `proceso_iniciado`', () => {
  it('llega a la tarjeta en curso de su ejecución y despierta al Centro de procesos (sin abrirlo)', async () => {
    streamDelMicro([
      sse('message', { type: 'message', responseText: 'Lo estoy haciendo…', suggestedActions: [] }),
      sse('proceso_iniciado', { type: 'proceso_iniciado', procesoId: PROCESO, ejecucionId: EJECUCION }),
      // El `done` trae la tarjeta en curso SIN el proceso todavía.
      sse('done', doneConEjecucion(enCurso(null), { responseText: 'Lo estoy haciendo…', camino: 'directo:confirmar' })),
    ]);
    const s = montar();
    act(() => s.actual.sendMessage('Sí, hazlo', { intencion: { accion: 'confirmar', propuestaId: EJECUCION } }));
    await esperarA(() => ultimoDelAsistente(s)?.ejecucion?.tipo === 'en_curso');
    const ejecucion = ultimoDelAsistente(s)!.ejecucion!;
    expect(ejecucion.tipo === 'en_curso' && ejecucion.procesoId).toBe(PROCESO);
    expect(invalidar).toHaveBeenCalledWith('procesos');
    s.soltar();
  });
});

describe('compatibilidad', () => {
  it('un `done` VIEJO (sin `ejecucion`) deja la confirmación de siempre y ninguna tarjeta nueva', async () => {
    const viejo = {
      responseText: 'Antes de hacerlo, confírmame:',
      suggestedActions: [],
      dispatches: [],
      camino: 'directo:confirmacion',
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
    streamDelMicro([sse('done', viejo)]);
    const s = montar();
    act(() => s.actual.sendMessage('Registrar el pago'));
    await esperarA(() => ultimoDelAsistente(s)?.confirmacion?.propuestaId === EJECUCION);
    expect(ultimoDelAsistente(s)!.ejecucion).toBeUndefined();
    expect(ultimoDelAsistente(s)!.ensayo).toBeUndefined();
    s.soltar();
  });
});

describe('refrescarEjecucion', () => {
  it('pide la tarjeta al día y la pone SÓLO en su mensaje', async () => {
    // Turno 1: la propuesta. Turno 2: la misma ejecución, ya en curso.
    streamDelMicro([sse('done', doneConEjecucion(propuestaDeRenovacion()))]);
    const s = montar();
    act(() => s.actual.sendMessage('Abrir la renovación'));
    await esperarA(() => ultimoDelAsistente(s)?.ejecucion?.tipo === 'propuesta');
    const propuestaId = ultimoDelAsistente(s)!.id;
    await esperarA(() => !s.actual.isStreaming && !s.actual.isThinking);

    streamDelMicro([sse('done', doneConEjecucion(enCurso(), { responseText: 'Lo estoy haciendo…' }))]);
    act(() => s.actual.sendMessage('Sí, hazlo', { intencion: { accion: 'confirmar', propuestaId: EJECUCION } }));
    await esperarA(() => ultimoDelAsistente(s)?.ejecucion?.tipo === 'en_curso');
    const enCursoId = ultimoDelAsistente(s)!.id;

    fetchEjecucion.mockResolvedValue(leerTarjetaDeEjecucion(hecha(true)));
    let devuelta: unknown;
    await act(async () => {
      devuelta = await s.actual.refrescarEjecucion(enCursoId, EJECUCION);
    });
    expect(fetchEjecucion).toHaveBeenCalledWith({ agencyId: AGENCIA, ejecucionId: EJECUCION });
    expect(devuelta).toMatchObject({ tipo: 'resultado', estado: 'hecha' });
    const porId = (id: string) => s.actual.messages.find((m) => m.id === id)!;
    expect(porId(enCursoId).ejecucion).toMatchObject({ tipo: 'resultado', estado: 'hecha' });
    // La propuesta del turno anterior (misma ejecución) NO se convierte en otra tarjeta de resultado.
    expect(porId(propuestaId).ejecucion?.tipo).toBe('propuesta');
    s.soltar();
  });

  it('si el micro no la tiene (404 → null), no toca nada', async () => {
    streamDelMicro([sse('done', doneConEjecucion(enCurso()))]);
    const s = montar();
    act(() => s.actual.sendMessage('Emitir'));
    await esperarA(() => ultimoDelAsistente(s)?.ejecucion?.tipo === 'en_curso');
    fetchEjecucion.mockResolvedValue(null);
    await act(async () => {
      await s.actual.refrescarEjecucion(ultimoDelAsistente(s)!.id, EJECUCION);
    });
    expect(ultimoDelAsistente(s)!.ejecucion?.tipo).toBe('en_curso');
    s.soltar();
  });
});
