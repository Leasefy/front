/**
 * @vitest-environment happy-dom
 */
/**
 * B1 — la burbuja de un turno que falló.
 *
 * Antes quedaba con `status: 'complete'`: el aviso de error se pintaba con la
 * misma cara que una respuesta, con pulgares para valorarlo y sin forma de
 * volver a preguntar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { contexto } = vi.hoisted(() => ({
  contexto: {
    regenerateResponse: vi.fn(),
    rateMessage: vi.fn(async () => true),
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
  },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));
vi.mock('@/components/ui', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => contexto,
}));
// El orbe monta WebGL: fuera del test de comportamiento.
vi.mock('./ChatOrb', () => ({ ChatOrb: () => null }));
vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => React.createElement('div', null, content),
}));

import { AssistantBubble } from './AssistantBubble';
import type { ChatMessage } from '@/lib/types/beta-chat';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contexto.regenerateResponse.mockReset();
  contexto.isThinking = false;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const mensaje = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'a-1',
  role: 'assistant',
  content: 'Tu plan se quedó sin créditos de IA.',
  timestamp: new Date(),
  status: 'error',
  ...over,
});

const pintar = (m: ChatMessage) =>
  act(() => {
    root.render(React.createElement(AssistantBubble, { message: m }));
  });

const botonReintentar = () =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar'));

describe('<AssistantBubble> — un turno que falló', () => {
  it('se ve como fallo, dice el motivo y no ofrece pulgares', () => {
    pintar(mensaje());
    const burbuja = container.querySelector('[data-testid="burbuja-con-error"]');
    expect(burbuja).not.toBeNull();
    expect(burbuja?.querySelector('[role="alert"]')?.textContent).toContain('sin créditos de IA');
    expect(container.querySelector('button[aria-pressed]')).toBeNull();
  });

  it('«Reintentar» rehace ESE turno', () => {
    pintar(mensaje());
    act(() => {
      botonReintentar()!.click();
    });
    expect(contexto.regenerateResponse).toHaveBeenCalledWith('a-1');
  });

  it('con otro turno en curso el botón queda apagado', () => {
    contexto.isThinking = true;
    pintar(mensaje());
    expect(botonReintentar()!.disabled).toBe(true);
  });

  it('una respuesta completa no se pinta como fallo', () => {
    pintar(mensaje({ status: 'complete', content: 'Tienes 10 inmuebles.' }));
    expect(container.querySelector('[data-testid="burbuja-con-error"]')).toBeNull();
    expect(botonReintentar()).toBeUndefined();
  });
});
