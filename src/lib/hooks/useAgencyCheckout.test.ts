/**
 * useAgencyCheckout.test.ts — direct-to-Wompi agency checkout orchestration.
 *
 * Scenarios:
 *   (1) pay(): opens the tab SYNCHRONOUSLY (before any await), then redirects it
 *       to the Wompi payment link and enters `awaiting`.
 *   (2) pay(): no charge returned → closes the tab, `error`.
 *   (3) pay(): pre-open blocked (window.open → null) → popupBlocked, awaiting.
 *   (4) activate(): free/percentage → success, onSuccess fires after the delay.
 *   (5) awaiting poll: verify() → ACTIVE → success + onSuccess.
 *   (6) verifyNow(): still pending → surfaces the "todavía no vemos" message.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockSelectPlan = vi.fn();
const mockChargePaymentLink = vi.fn();
const mockVerify = vi.fn();

vi.mock('@/lib/api/agency-subscription.service', () => ({
  agencySubscriptionApi: {
    selectPlan: (...a: unknown[]) => mockSelectPlan(...a),
    chargePaymentLink: (...a: unknown[]) => mockChargePaymentLink(...a),
    verify: (...a: unknown[]) => mockVerify(...a),
  },
}));

import { useAgencyCheckout, type UseAgencyCheckout } from './useAgencyCheckout';

// ── Harness ──────────────────────────────────────────────────────────────────

let hook: UseAgencyCheckout;
let onSuccess: ReturnType<typeof vi.fn>;
let container: HTMLDivElement;
let root: Root;

function Harness() {
  hook = useAgencyCheckout(onSuccess as unknown as () => void);
  return null;
}

async function mount() {
  await act(async () => {
    root.render(React.createElement(Harness));
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  onSuccess = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAgencyCheckout — pay (paid FLAT)', () => {
  it('opens the tab synchronously before any await, then redirects it', async () => {
    await mount();

    const fakeTab = { closed: false, location: { href: '' }, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeTab as unknown as Window);

    // selectPlan resolves only when we let it — proves window.open ran first.
    let resolveSelect: (v: unknown) => void = () => {};
    mockSelectPlan.mockReturnValue(new Promise((r) => { resolveSelect = r; }));

    await act(async () => {
      void hook.pay('pro');
    });

    // Tab was opened during the synchronous part of the click gesture.
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(hook.state).toBe('processing');

    mockChargePaymentLink.mockResolvedValue({ url: 'https://checkout.wompi.co/l/abc' });
    await act(async () => {
      resolveSelect({ charge: { id: 'ch_1' } });
      await Promise.resolve();
    });
    await flush();

    expect(fakeTab.location.href).toBe('https://checkout.wompi.co/l/abc');
    expect(hook.state).toBe('awaiting');
    expect(hook.paymentUrl).toBe('https://checkout.wompi.co/l/abc');
    expect(hook.popupBlocked).toBe(false);
  });

  it('closes the tab and errors when no charge is returned', async () => {
    await mount();
    const fakeTab = { closed: false, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(fakeTab as unknown as Window);
    mockSelectPlan.mockResolvedValue({ charge: null });

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(fakeTab.close).toHaveBeenCalled();
    expect(hook.state).toBe('error');
    expect(mockChargePaymentLink).not.toHaveBeenCalled();
  });

  it('flags popupBlocked when the pre-open is blocked (window.open → null)', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(null);
    mockSelectPlan.mockResolvedValue({ charge: { id: 'ch_1' } });
    mockChargePaymentLink.mockResolvedValue({ url: 'https://checkout.wompi.co/l/abc' });

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(hook.state).toBe('awaiting');
    expect(hook.popupBlocked).toBe(true);
    expect(hook.paymentUrl).toBe('https://checkout.wompi.co/l/abc');
  });
});

describe('useAgencyCheckout — activate (free / percentage)', () => {
  it('activates without a charge and fires onSuccess after the delay', async () => {
    vi.useFakeTimers();
    await mount();
    mockSelectPlan.mockResolvedValue({ charge: null });

    await act(async () => {
      await hook.activate('starter');
    });

    expect(mockSelectPlan).toHaveBeenCalledWith('starter');
    expect(hook.state).toBe('success');
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('useAgencyCheckout — awaiting poll', () => {
  it('reaches success when verify() reports ACTIVE', async () => {
    vi.useFakeTimers();
    await mount();
    const fakeTab = { closed: false, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(fakeTab as unknown as Window);
    mockSelectPlan.mockResolvedValue({ charge: { id: 'ch_1' } });
    mockChargePaymentLink.mockResolvedValue({ url: 'https://checkout.wompi.co/l/abc' });
    // The awaiting effect runs an immediate check on mount → make it ACTIVE up front.
    mockVerify.mockResolvedValue({ status: 'ACTIVE', openCharge: null });

    await act(async () => {
      await hook.pay('pro');
    });
    // Flush the immediate poll run() kicked off by the awaiting effect.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hook.state).toBe('success');
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('useAgencyCheckout — verifyNow', () => {
  it('surfaces a "todavía no vemos" message while still pending', async () => {
    await mount();
    mockVerify.mockResolvedValue({
      status: 'PAST_DUE',
      openCharge: { id: 'ch_1', gatewayStatus: 'PENDING' },
    });

    await act(async () => {
      await hook.verifyNow();
    });
    await flush();

    expect(hook.pollError).toContain('Todavía no vemos');
    expect(hook.state).toBe('idle');
  });
});
