/**
 * @vitest-environment happy-dom
 */
/**
 * El pensamiento en vivo en la conversación (Nico, 02-10-2026):
 *  · mientras piensa, el pensamiento ocupa el lugar de las frases fijas y de la
 *    tarjeta de los pasos, con el tiempo corriendo en la cabecera;
 *  · cuando responde, queda plegado en «Cómo lo pensó» ARRIBA de la respuesta
 *    (y «Cómo lo pensó» ya no se repite debajo);
 *  · con un micro viejo (sin pasos), después de un momento, las frases de siempre.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto, nada } = vi.hoisted(() => ({
  nada: () => null,
  contexto: {
    isLoading: false,
    messages: [] as unknown[],
    sendMessage: vi.fn(),
    isThinking: false,
    isStreaming: false,
    streamingContent: '',
    activeAgentBlock: null,
    isAgentsRunning: false,
    turnSteps: [] as unknown[],
    pensamiento: null as unknown,
    retryAgent: vi.fn(),
    selectDecisionOption: vi.fn(),
    confirmarAccionDelMensaje: vi.fn(),
    cancelarAccionDelMensaje: vi.fn(),
    activeConversationId: 'c-1' as string | null,
  },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({ useBetaChatContext: () => contexto }));
vi.mock('./ChatConversationBar', () => ({ ChatConversationBar: nada }));
vi.mock('./ChatInput', () => ({ ChatInput: nada }));
vi.mock('./BetaWelcome', () => ({ BetaWelcome: nada }));
vi.mock('./BetaSkeletons', () => ({ ChatMessageSkeleton: nada }));
vi.mock('./WorkspaceView', () => ({ WorkspaceView: nada }));
vi.mock('./AgentTaskProgress', () => ({ AgentTaskProgress: nada }));
vi.mock('./AgentTaskThread', () => ({ AgentTaskThread: () => <div data-testid="tarjeta-de-pasos" /> }));
vi.mock('./TypingIndicator', () => ({ TypingIndicator: () => <div data-testid="frases-de-espera" /> }));
vi.mock('./UserBubble', () => ({ UserBubble: ({ message }: { message: { content: string } }) => <p>{message.content}</p> }));
vi.mock('./AssistantBubble', () => ({
  AssistantBubble: ({ message, antesDeLasAcciones }: { message: { content: string }; antesDeLasAcciones?: React.ReactNode }) => (
    <div data-testid="respuesta">
      <p>{message.content}</p>
      {antesDeLasAcciones}
    </div>
  ),
}));
vi.mock('./MessageActions', () => ({ MessageActions: nada }));
vi.mock('./AccionPropuestaCard', () => ({ AccionPropuestaCard: nada }));
vi.mock('./DecisionCard', () => ({ DecisionCard: nada }));
vi.mock('@/components/agentes/equipo-de-agentes-context', () => ({
  EquipoDeAgentesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEquipoDeAgentes: () => ({ abrir: () => {}, cerrar: () => {}, abierto: false, disponible: false }),
}));
vi.mock('@/lib/hooks/use-scroll-del-turno', () => ({ useScrollDelTurno: () => ({ verResto: false, irAlResto: () => {} }) }));

import { ChatContainer } from './ChatContainer';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  Object.assign(contexto, { isThinking: false, isStreaming: false, isAgentsRunning: false, pensamiento: null, turnSteps: [] });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});
const pintar = () => act(() => root.render(<ChatContainer />));
const q = (id: string) => container.querySelector(`[data-testid="${id}"]`);

const t0 = new Date('2026-10-02T10:00:00-05:00');
const pregunta = { id: 'u-1', role: 'user', content: '¿Cuántos contratos vencen en noviembre?', timestamp: t0, status: 'sent' };
const respuesta = (over: Record<string, unknown> = {}) => ({
  id: 'a-1',
  role: 'assistant',
  content: '',
  timestamp: t0,
  status: 'sending',
  ...over,
});
const PASOS = [
  { id: 'pregunta', fase: 'pregunta', estado: 'listo', texto: 'Contratos que vencen entre el 1 y el 30 de noviembre de 2026' },
  { id: 'despacho-d1', fase: 'despacho', estado: 'en_curso', agente: 'reportes', texto: 'Le pido al especialista de reportes: “x”…' },
];

describe('el pensamiento en la conversación', () => {
  it('pensando: el pensamiento EN VIVO en lugar de las frases fijas, con el tiempo en la cabecera', () => {
    contexto.messages = [pregunta, respuesta()];
    contexto.isThinking = true;
    contexto.turnSteps = [{ id: 'entender', kind: 'entender', status: 'running' }];
    contexto.pensamiento = { pasos: PASOS, inicio: Date.now() - 2_000, fin: null };
    pintar();
    expect(q('pensamiento-del-turno')?.getAttribute('data-vivo')).toBe('true');
    expect(q('frases-de-espera')).toBeNull();
    expect(q('reloj-del-turno')).not.toBeNull();
    expect(container.textContent).toContain('Contratos que vencen entre el 1 y el 30 de noviembre de 2026');
  });

  it('trabajando un especialista: el pensamiento, no la tarjeta de los pasos', () => {
    contexto.messages = [pregunta, respuesta({ status: 'streaming' })];
    contexto.isAgentsRunning = true;
    contexto.turnSteps = [{ id: 'x', kind: 'agente', agentType: 'reportes', status: 'running' }];
    contexto.pensamiento = { pasos: PASOS, inicio: Date.now() - 4_000, fin: null };
    pintar();
    expect(q('pensamiento-del-turno')?.getAttribute('data-vivo')).toBe('true');
    expect(q('tarjeta-de-pasos')).toBeNull();
  });

  it('respondió: plegado en «Cómo lo pensó» ARRIBA de la respuesta, y no se repite debajo', () => {
    contexto.messages = [
      pregunta,
      respuesta({
        status: 'complete',
        content: 'Tienes 14 contratos que vencen en noviembre.',
        razonamiento: [{ texto: 'Era la pregunta de un dato puntual de tu operación.' }],
        pensamiento: { pasos: PASOS.map((p) => ({ ...p, estado: 'listo' })), duracionMs: 8_400 },
      }),
    ];
    pintar();
    const plegado = q('pensamiento-del-turno')!;
    expect(plegado.getAttribute('data-vivo')).toBe('false');
    expect(q('como-lo-penso')!.textContent).toContain('8,4 s');
    // Arriba de la respuesta.
    const respuestaEl = q('respuesta')!;
    expect(plegado.compareDocumentPosition(respuestaEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Y «Cómo lo pensó» ya no va debajo.
    expect(respuestaEl.querySelector('[data-testid="turno-razonamiento"]')).toBeNull();
  });

  it('un micro viejo (sin pasos): un momento sin nada y después las frases de siempre', () => {
    vi.useFakeTimers();
    contexto.messages = [pregunta, respuesta()];
    contexto.isThinking = true;
    contexto.pensamiento = { pasos: [], inicio: Date.now(), fin: null };
    pintar();
    expect(q('frases-de-espera')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(q('frases-de-espera')).not.toBeNull();
    expect(q('pensamiento-del-turno')).toBeNull();
  });
});
