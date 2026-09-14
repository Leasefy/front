/**
 * MessageActions — el pulgar del chat, ahora con destino.
 *
 * Vive fuera de `AssistantBubble` para que la TARJETA (`ResponseCard`, la forma
 * en que se pintan las respuestas con cifras) también lo lleve.
 *
 * Lo que se cubre:
 *   (1) el pulgar arriba se manda de una, sin abrir nada;
 *   (2) el pulgar abajo se manda Y abre «¿Qué esperabas?»;
 *   (3) el comentario + «la cifra está mal» viajan en un segundo envío sobre el
 *       MISMO turno (idempotente: misma llave, el backend hace upsert);
 *   (4) el estado «guardado» sólo se pinta cuando el backend confirmó;
 *   (5) botones accesibles: `aria-label` + `aria-pressed`.
 *
 * Mismo arnés que `ActionProposalCard.test.tsx` (react-dom/client + act).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const rateMessageMock = vi.fn(async () => true);
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => ({
    regenerateResponse: vi.fn(),
    rateMessage: rateMessageMock,
    isThinking: false,
    isStreaming: false,
    isAgentsRunning: false,
  }),
}));

// El orbe monta WebGL: fuera del test de comportamiento.
vi.mock('./ChatOrb', () => ({ ChatOrb: () => null }));
vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) =>
    React.createElement('div', null, content),
}));

import { AssistantBubble } from './AssistantBubble';
import type { ChatMessage } from '@/lib/types/beta-chat';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  rateMessageMock.mockResolvedValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function mkMessage(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    content: 'Vencen 8 contratos este mes.',
    timestamp: new Date('2026-09-13T01:00:00Z'),
    status: 'complete',
    ...over,
  };
}

function mount(message: ChatMessage) {
  act(() => {
    root.render(React.createElement(AssistantBubble, { message }));
  });
}

function botonPorEtiqueta(etiqueta: string): HTMLElement {
  const el = container.querySelector(`[aria-label="${etiqueta}"]`);
  if (!el) throw new Error(`no encontré el botón ${etiqueta}`);
  return el as HTMLElement;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

// ───────────────────────────────────────────────────────────────────────────

describe('MessageActions — pulgares', () => {
  it('(5) los dos pulgares son accesibles y reflejan lo elegido', () => {
    mount(mkMessage({ feedback: 'up' }));
    expect(botonPorEtiqueta('beta.actions.like').getAttribute('aria-pressed')).toBe('true');
    expect(botonPorEtiqueta('beta.actions.dislike').getAttribute('aria-pressed')).toBe('false');
  });

  it('(1) el pulgar arriba se manda de una, sin abrir el campo', async () => {
    mount(mkMessage());
    await clic(botonPorEtiqueta('beta.actions.like'));

    expect(rateMessageMock).toHaveBeenCalledWith('msg-1', 'up');
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('(2) el pulgar abajo se manda Y abre «¿qué esperabas?»', async () => {
    mount(mkMessage());
    await clic(botonPorEtiqueta('beta.actions.dislike'));

    expect(rateMessageMock).toHaveBeenCalledWith('msg-1', 'down');
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('(3) el comentario y «la cifra está mal» viajan sobre el MISMO turno', async () => {
    mount(mkMessage());
    await clic(botonPorEtiqueta('beta.actions.dislike'));

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    await act(async () => {
      setter?.call(textarea, 'la cifra está mal, son 7 no 8');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic(botonPorEtiqueta('beta.actions.feedbackWrongNumber'));

    const enviar = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'beta.actions.feedbackSend',
    );
    expect(enviar).toBeTruthy();
    await clic(enviar as HTMLElement);

    // Misma llave de turno en los dos envíos: el backend hace upsert, no duplica.
    expect(rateMessageMock).toHaveBeenCalledTimes(2);
    expect(rateMessageMock).toHaveBeenLastCalledWith('msg-1', 'down', {
      comentario: 'la cifra está mal, son 7 no 8',
      cifraMal: true,
    });
    // Enviado → el campo se cierra.
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('el botón de enviar está apagado mientras no haya nada escrito', async () => {
    mount(mkMessage());
    await clic(botonPorEtiqueta('beta.actions.dislike'));
    const enviar = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'beta.actions.feedbackSend',
    ) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
  });

  it('(4) «guardado» sólo aparece cuando el backend confirmó', () => {
    mount(mkMessage({ feedback: 'up' }));
    expect(container.querySelector('[data-testid="feedback-guardado"]')).toBeNull();

    mount(mkMessage({ feedback: 'up', feedbackEnviado: true }));
    expect(
      container.querySelector('[data-testid="feedback-guardado"]')?.textContent,
    ).toBe('beta.actions.feedbackSaved');

    mount(mkMessage({ feedback: 'down', feedbackEnviado: true, feedbackLeccion: true }));
    expect(
      container.querySelector('[data-testid="feedback-guardado"]')?.textContent,
    ).toBe('beta.actions.feedbackLearned');
  });

  it('volver a tocar el mismo pulgar lo quita', async () => {
    mount(mkMessage({ feedback: 'up', feedbackEnviado: true }));
    await clic(botonPorEtiqueta('beta.actions.like'));
    expect(rateMessageMock).toHaveBeenCalledWith('msg-1', 'up');
  });
});
