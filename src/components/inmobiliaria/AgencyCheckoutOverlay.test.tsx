/**
 * AgencyCheckoutOverlay.test.tsx — T-0012 WU-3.
 *
 * The overlay used to trap an abandoned payment: `awaiting` rendered with no
 * `paymentUrl` (the resumed-session case `resume()` never populated — WU-1
 * regression) showed a subtitle that flatly contradicted its own heading
 * ("Esperando la confirmación de tu pago…" / "Estamos generando el enlace de
 * pago.") and offered no way out — `processing`/`awaiting`/`success` were all
 * non-dismissable by design (see the component's own header comment).
 *
 * Scenarios:
 *   (1) awaiting + paymentUrl → the "go pay in the other tab" copy, and the
 *       subtitle never claims a link is being generated.
 *   (2) awaiting + no paymentUrl → an honest "couldn't get you a link" copy,
 *       still never claiming generation is in progress.
 *   (3) awaiting always exposes an explicit "leave" action wired to onClose.
 *   (4) processing/success stay truly non-dismissable: no leave action, and
 *       the primitive's own close (✕) is hidden too (DESIGN.md's documented
 *       use of `hideClose` — "sólo para un modal que no se debe abandonar a
 *       medias").
 *   (5) awaitingTimedOut swaps the heading/icon to an honest "not confirmed
 *       yet" state without dropping the verifyNow escape hatch.
 *   (6) error keeps its existing "Volver a los planes" exit (regression).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

import { AgencyCheckoutOverlay } from './AgencyCheckoutOverlay';
import type { AgencyCheckoutState } from '@/lib/hooks/useAgencyCheckout';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

interface Overrides {
  state?: AgencyCheckoutState;
  error?: string | null;
  paymentUrl?: string | null;
  popupBlocked?: boolean;
  pollError?: string | null;
  awaitingTimedOut?: boolean;
  resuming?: boolean;
  onVerify?: () => void;
  onClose?: () => void;
}

function render(overrides: Overrides = {}) {
  const onVerify = overrides.onVerify ?? vi.fn();
  const onClose = overrides.onClose ?? vi.fn();
  act(() => {
    root.render(
      <AgencyCheckoutOverlay
        planName="Pro"
        isPaid
        state={overrides.state ?? 'awaiting'}
        error={overrides.error ?? null}
        paymentUrl={overrides.paymentUrl ?? null}
        popupBlocked={overrides.popupBlocked ?? false}
        pollError={overrides.pollError ?? null}
        awaitingTimedOut={overrides.awaitingTimedOut ?? false}
        resuming={overrides.resuming ?? false}
        onVerify={onVerify}
        onClose={onClose}
      />,
    );
  });
  return { onVerify, onClose };
}

/** All non-empty leaf text nodes currently in the document (Radix portals to body). */
function allText(): string {
  return Array.from(document.querySelectorAll<HTMLElement>('*'))
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent ?? '')
    .join(' | ');
}

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes(label),
  );
}

const aspas = () => document.querySelectorAll('[aria-label="Cerrar"]');

describe('<AgencyCheckoutOverlay> — awaiting subtitle never contradicts itself', () => {
  it('with a payment link: tells the owner to pay in the other tab, never "generando"', () => {
    render({ state: 'awaiting', paymentUrl: 'https://checkout.wompi.co/l/abc' });
    const text = allText();
    expect(text).toContain('Completá el pago');
    expect(text.toLowerCase()).not.toContain('generando');
  });

  it('without a payment link: an honest "could not get a link" message, never "generando"', () => {
    render({ state: 'awaiting', paymentUrl: null });
    const text = allText();
    expect(text.toLowerCase()).not.toContain('generando');
    // Must not claim to be actively fetching/generating anything.
    expect(text).toMatch(/no pudimos|no se pudo/i);
  });
});

describe('<AgencyCheckoutOverlay> — awaiting is escapable', () => {
  it('offers an explicit leave action wired to onClose', () => {
    const { onClose } = render({ state: 'awaiting', paymentUrl: 'https://checkout.wompi.co/l/abc' });
    const leaveBtn = findButton('Salir');
    expect(leaveBtn).toBeTruthy();
    act(() => {
      leaveBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the "Ya pagué — Verificar estado" escape hatch working', () => {
    const { onVerify } = render({ state: 'awaiting', paymentUrl: 'https://checkout.wompi.co/l/abc' });
    const verifyBtn = findButton('Ya pagué');
    expect(verifyBtn).toBeTruthy();
    act(() => {
      verifyBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onVerify).toHaveBeenCalledTimes(1);
  });
});

describe('<AgencyCheckoutOverlay> — processing/success stay truly non-dismissable', () => {
  it('processing: no leave action, no primitive close button', () => {
    render({ state: 'processing' });
    expect(findButton('Salir')).toBeFalsy();
    expect(aspas().length).toBe(0);
  });

  it('success: no leave action, no primitive close button', () => {
    render({ state: 'success' });
    expect(findButton('Salir')).toBeFalsy();
    expect(aspas().length).toBe(0);
  });
});

describe('<AgencyCheckoutOverlay> — abandoned payment does not spin forever', () => {
  it('awaitingTimedOut swaps to an honest "not confirmed" state without dropping verifyNow', () => {
    render({ state: 'awaiting', paymentUrl: 'https://checkout.wompi.co/l/abc', awaitingTimedOut: true });
    const text = allText();
    // No longer implies an actively-progressing wait.
    expect(text).not.toContain('Esperando la confirmación de tu pago…');
    expect(findButton('Ya pagué')).toBeTruthy();
    expect(findButton('Salir')).toBeTruthy();
  });

  it('not timed out: keeps the normal "esperando confirmación" heading', () => {
    render({ state: 'awaiting', paymentUrl: 'https://checkout.wompi.co/l/abc', awaitingTimedOut: false });
    expect(allText()).toContain('Esperando la confirmación de tu pago…');
  });
});

describe('<AgencyCheckoutOverlay> — error keeps its existing exit', () => {
  it('renders "Volver a los planes"', () => {
    render({ state: 'error', error: 'El pago fue rechazado.' });
    expect(findButton('Volver a los planes')).toBeTruthy();
  });
});
