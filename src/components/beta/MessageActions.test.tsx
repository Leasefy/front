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
const regenerateMock = vi.fn();
const chatEstado = { isThinking: false };
vi.mock('@/lib/context/BetaChatContext', () => ({
  useBetaChatContext: () => ({
    regenerateResponse: regenerateMock,
    rateMessage: rateMessageMock,
    isThinking: chatEstado.isThinking,
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
  chatEstado.isThinking = false;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
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

/**
 * «Reintentar» (Nico, 23-09): cuando el chat contestó «No pude hacer la
 * búsqueda en este momento… intenta de nuevo», «no hay un reintentar o algo».
 * El micro avisa con `reintentable` en el `done`; sin él, no se pinta nada.
 */
describe('MessageActions — Reintentar', () => {
  const REINTENTABLE = { motivo: 'tiempo', que: 'busqueda' };
  const botonReintentar = () =>
    [...container.querySelectorAll('button')].find((b) =>
      /beta\.actions\.reintent/.test(b.textContent ?? ''),
    ) as HTMLButtonElement | undefined;

  function conMovimientoReducido(reducido: boolean) {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: reducido && q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
  }

  it('con `reintentable` aparece a la vista y vuelve a mandar la MISMA pregunta (el manejador del ↻)', async () => {
    mount(mkMessage({ reintentable: REINTENTABLE }));
    const boton = botonReintentar();
    expect(boton?.textContent).toBe('beta.actions.reintentar');
    expect(boton?.disabled).toBe(false);
    await clic(boton!);
    expect(regenerateMock).toHaveBeenCalledTimes(1);
    expect(regenerateMock).toHaveBeenCalledWith('msg-1');
  });

  it('mientras reintenta queda ocupado y no se puede pedir dos veces', async () => {
    mount(mkMessage({ reintentable: REINTENTABLE }));
    await clic(botonReintentar()!);
    const ocupado = botonReintentar()!;
    expect(ocupado.textContent).toBe('beta.actions.reintentando');
    expect(ocupado.disabled).toBe(true);
    expect(ocupado.getAttribute('aria-busy')).toBe('true');
    await clic(ocupado);
    expect(regenerateMock).toHaveBeenCalledTimes(1);
  });

  it('con otra respuesta en curso está apagado', () => {
    chatEstado.isThinking = true;
    mount(mkMessage({ reintentable: REINTENTABLE }));
    expect(botonReintentar()?.disabled).toBe(true);
  });

  it('sin el campo (micro viejo) no se pinta, aunque el texto diga «intenta de nuevo»', () => {
    mount(
      mkMessage({
        content: 'No pude hacer la búsqueda en este momento. Intenta de nuevo en un momento.',
      }),
    );
    expect(botonReintentar()).toBeUndefined();
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull();
  });

  it('se anima (entrada y giro de «ocupado») sólo si no se pidió reducir movimiento', async () => {
    conMovimientoReducido(false);
    mount(mkMessage({ reintentable: REINTENTABLE }));
    expect(container.querySelector('[data-testid="reintentar"]')!.className).toContain('animate-in');
    await clic(botonReintentar()!);
    expect(container.querySelector('[data-testid="reintentar"] .animate-spin')).not.toBeNull();
  });

  it('con «reducir movimiento» no se anima: ni entrada ni giro', async () => {
    conMovimientoReducido(true);
    mount(mkMessage({ reintentable: REINTENTABLE }));
    const envoltura = container.querySelector('[data-testid="reintentar"]')!;
    expect(envoltura.className).not.toContain('animate-in');
    await clic(botonReintentar()!);
    expect(container.querySelector('[data-testid="reintentar"] .animate-spin')).toBeNull();
    expect(container.querySelector('[data-testid="reintentar"] [class*="animate-"]')).toBeNull();
    // Sigue diciendo que está ocupado, con texto.
    expect(botonReintentar()?.textContent).toBe('beta.actions.reintentando');
  });
});
