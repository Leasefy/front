/**
 * @vitest-environment happy-dom
 */
/**
 * El scroll del hilo, montado en el chat de verdad (Nico, 23-09, 23:44):
 * «por más que entregues todo de una, porfa no dejes en la parte de abajo de la
 * respuesta, que el usuario haga el scroll para ver toda la respuesta».
 *
 * happy-dom no hace layout, así que la geometría se simula: la pregunta nueva
 * en 1000 px, su respuesta en 1080 px, el hilo de 600 px de alto y el final del
 * contenido donde diga cada prueba. Con el scroll de antes (siempre al final)
 * estas pruebas fallan: el inicio de la respuesta quedaba 1.300 px arriba.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto, nada } = vi.hoisted(() => ({
  // Lo que hay DENTRO de cada mensaje no importa acá: sólo dónde queda.
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
vi.mock('./AgentTaskThread', () => ({ AgentTaskThread: nada }));
vi.mock('./AgentActivityIndicator', () => ({ AgentActivityIndicator: nada }));
vi.mock('./TypingIndicator', () => ({ TypingIndicator: () => <div data-testid="pensando" /> }));
vi.mock('./UserBubble', () => ({
  UserBubble: ({ message }: { message: { content: string } }) => <p>{message.content}</p>,
}));
vi.mock('./AssistantBubble', () => ({
  AssistantBubble: ({ message }: { message: { content: string } }) => <p>{message.content}</p>,
}));
vi.mock('./MessageActions', () => ({ MessageActions: nada }));
vi.mock('./AccionPropuestaCard', () => ({ AccionPropuestaCard: nada }));
vi.mock('./DecisionCard', () => ({ DecisionCard: nada }));

import { ChatContainer } from './ChatContainer';

// ── La geometría simulada ────────────────────────────────────────────────────
const ALTO = 600;
const geo = { fin: 1150 };
let scrollTop = 0;

function hilo(): HTMLElement {
  return document.querySelector('[data-hilo]') as HTMLElement;
}
function espacio(): number {
  return parseFloat((document.querySelector('[data-espacio-del-hilo]') as HTMLElement | null)?.style.height || '0');
}
function alturaTotal(): number {
  return geo.fin + espacio() + 44;
}

const originales = new Map<string, PropertyDescriptor | undefined>();
function simular(prop: string, get: (el: HTMLElement) => number, set?: (el: HTMLElement, v: number) => void) {
  originales.set(prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop));
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get(this: HTMLElement) {
      return get(this);
    },
    ...(set
      ? {
          set(this: HTMLElement, v: number) {
            set(this, v);
          },
        }
      : {}),
  });
}

function offsetTopDe(el: HTMLElement): number {
  if (el.dataset.pregunta === 'u-2') return 1000;
  if (el.dataset.finDelHilo !== undefined) return geo.fin;
  const anterior = el.previousElementSibling as HTMLElement | null;
  if (anterior?.dataset.pregunta === 'u-2') return 1080; // el inicio de la respuesta
  if (el.dataset.pregunta === 'u-1') return 0;
  return 0;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  geo.fin = 1150;
  scrollTop = 0;
  simular('offsetTop', offsetTopDe);
  simular('offsetHeight', () => 40);
  simular('clientHeight', (el) => (el.dataset.hilo !== undefined ? ALTO : 0));
  simular('scrollHeight', (el) => (el.dataset.hilo !== undefined ? alturaTotal() : 0));
  simular(
    'scrollTop',
    (el) => (el.dataset.hilo !== undefined ? scrollTop : 0),
    (el, v) => {
      // Como un navegador: entre 0 y el máximo que permite el contenido.
      if (el.dataset.hilo !== undefined) scrollTop = Math.max(0, Math.min(v, alturaTotal() - ALTO));
    },
  );
  // happy-dom no hace scroll: `scrollTo` pasa por el mismo `scrollTop` simulado.
  originales.set('scrollTo', Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo'));
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    writable: true,
    value(this: HTMLElement, o: ScrollToOptions) {
      this.scrollTop = o.top ?? this.scrollTop;
    },
  });
  contexto.activeConversationId = 'c-1';
  contexto.isThinking = false;
  contexto.isStreaming = false;
  contexto.streamingContent = '';
  contexto.messages = historia();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  for (const [prop, d] of originales) {
    if (d) Object.defineProperty(HTMLElement.prototype, prop, d);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
  }
  originales.clear();
});

const t0 = new Date('2026-09-23T22:00:00-05:00');
function historia() {
  return [
    { id: 'u-1', role: 'user', content: '¿cómo va la cartera?', timestamp: t0, status: 'sent' },
    { id: 'a-1', role: 'assistant', content: 'Va bien.', timestamp: t0, status: 'complete' },
  ];
}
const pregunta = { id: 'u-2', role: 'user', content: 'Ver contrato 24', timestamp: t0, status: 'sent' };
const respuesta = (texto: string, status = 'complete') => ({
  id: 'a-2',
  role: 'assistant',
  content: texto,
  timestamp: t0,
  status,
});

const pintar = () => act(() => root.render(<ChatContainer />));
/** Dónde queda el inicio de la respuesta, medido desde el borde de arriba del hilo. */
const inicioDeLaRespuestaEnPantalla = () => 1080 - hilo().scrollTop;

describe('el scroll del turno', () => {
  it('llega de una y es larga (la ficha del contrato #24): el inicio de la respuesta queda arriba, no el final', () => {
    pintar();
    contexto.messages = [...historia(), pregunta, respuesta('', 'sending')];
    contexto.isThinking = true;
    pintar();
    // Recién mandada: la pregunta queda cerca del borde de arriba.
    expect(1000 - hilo().scrollTop).toBeGreaterThanOrEqual(0);
    expect(1000 - hilo().scrollTop).toBeLessThanOrEqual(120);

    geo.fin = 3000;
    contexto.isThinking = false;
    contexto.messages = [...historia(), pregunta, respuesta('La ficha del contrato #24…')];
    pintar();
    expect(inicioDeLaRespuestaEnPantalla()).toBeGreaterThanOrEqual(0);
    expect(inicioDeLaRespuestaEnPantalla()).toBeLessThanOrEqual(120);
    // Y como queda contenido abajo, el botón para verlo.
    expect(container.querySelector('[data-testid="ver-el-resto"]')?.textContent).toContain('Ver el resto');
  });

  it('en streaming acompaña lo que crece hasta que el inicio toca el borde; después no lo empuja', () => {
    pintar();
    contexto.messages = [...historia(), pregunta, respuesta('', 'streaming')];
    contexto.isStreaming = true;
    for (const fin of [1200, 1500, 1700, 2200, 2900, 3600]) {
      geo.fin = fin;
      contexto.streamingContent = 'x'.repeat(fin);
      pintar();
      expect(inicioDeLaRespuestaEnPantalla()).toBeGreaterThanOrEqual(0);
      expect(inicioDeLaRespuestaEnPantalla()).toBeLessThanOrEqual(120);
    }
    // Pregunta de una línea: se queda arriba, y la respuesta justo debajo.
    expect(hilo().scrollTop).toBe(1000 - 16);
  });

  it('si la persona mueve el scroll durante la llegada, no se lo vuelve a mover en ese turno', () => {
    pintar();
    contexto.messages = [...historia(), pregunta, respuesta('', 'streaming')];
    contexto.isStreaming = true;
    geo.fin = 1300;
    pintar();
    act(() => {
      hilo().dispatchEvent(new Event('wheel'));
      hilo().scrollTop = 200;
    });
    geo.fin = 3000;
    contexto.streamingContent = 'mucho más texto';
    pintar();
    expect(hilo().scrollTop).toBe(200);
  });

  it('«Ver el resto» baja sin saltar al final de una vez, y desde ahí manda la persona', () => {
    pintar();
    geo.fin = 3000;
    contexto.messages = [...historia(), pregunta, respuesta('La ficha del contrato #24…')];
    pintar();
    const antes = hilo().scrollTop;
    act(() => (container.querySelector('[data-testid="ver-el-resto"]') as HTMLButtonElement).click());
    expect(hilo().scrollTop).toBeGreaterThan(antes);
    expect(hilo().scrollTop).toBeLessThanOrEqual(antes + ALTO);
  });

  it('una conversación que se abre se muestra por el final, como siempre', () => {
    geo.fin = 2000;
    pintar();
    expect(hilo().scrollTop).toBe(alturaTotal() - ALTO);
  });
});

void React;
