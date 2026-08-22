/**
 * useAgencyCheckout.test.ts — direct-to-Wompi agency checkout orchestration.
 *
 * Scenarios:
 *   (1) pay(): opens the tab SYNCHRONOUSLY (before any await), then redirects it
 *       to the Wompi payment link and enters `awaiting`.
 *   (2) pay(): no charge returned → closes the tab, `error`.
 *   (3) pay(): pre-open blocked (window.open → null) → popupBlocked, awaiting.
 *   (4) activate(): free/percentage → success, onSuccess fires after the delay.
 *   (5) awaiting poll — success predicate: only the subscription tier actually
 *       advancing to the charge's `targetPlanTier` resolves `active`.
 *       `subscription.status === 'ACTIVE'` on the OLD tier is never enough
 *       (that status means "not suspended", not "purchase paid" — the agency's
 *       free starter plan is ACTIVE from the very first millisecond).
 *   (6) awaiting poll — failure predicate: a genuine gateway rejection, or a
 *       vanished `openCharge` while the tier never advanced. A vanished
 *       `openCharge` on the SUCCESS path (tier did advance) must NOT be
 *       reported as a failure.
 *   (7) resume(): pick a `PENDING` charge back up (e.g. the user left
 *       `/upgrade` and came back) without going through pay() again.
 *   (8) verifyNow(): still pending → surfaces the "todavía no vemos" message.
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
    await Promise.resolve();
  });
}

function fakeTab() {
  return { closed: false, location: { href: '' }, close: vi.fn() };
}

/** Start a `pay()` flow through to `awaiting`, capturing `targetPlanTier`. */
async function payToAwaiting(planId = 'pro') {
  vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
  mockSelectPlan.mockResolvedValue({ charge: { id: 'ch_1', targetPlanTier: planId } });
  mockChargePaymentLink.mockResolvedValue({ url: 'https://checkout.wompi.co/l/abc' });
  await act(async () => {
    await hook.pay(planId);
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

    const tab = fakeTab();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

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
      resolveSelect({ charge: { id: 'ch_1', targetPlanTier: 'pro' } });
      await Promise.resolve();
    });
    await flush();

    expect(tab.location.href).toBe('https://checkout.wompi.co/l/abc');
    expect(hook.state).toBe('awaiting');
    expect(hook.paymentUrl).toBe('https://checkout.wompi.co/l/abc');
    expect(hook.popupBlocked).toBe(false);
  });

  it('closes the tab and errors when no charge is returned', async () => {
    await mount();
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    mockSelectPlan.mockResolvedValue({ charge: null });

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(tab.close).toHaveBeenCalled();
    expect(hook.state).toBe('error');
    expect(mockChargePaymentLink).not.toHaveBeenCalled();
  });

  it('flags popupBlocked when the pre-open is blocked (window.open → null)', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(null);
    mockSelectPlan.mockResolvedValue({ charge: { id: 'ch_1', targetPlanTier: 'pro' } });
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

describe('useAgencyCheckout — awaiting poll: success predicate', () => {
  it('stays awaiting when the subscription is still ACTIVE on the OLD tier', async () => {
    await mount();
    // The captured production trace: agency's free starter plan reads ACTIVE
    // from the first millisecond, WHILE the pro charge is still PENDING.
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
    await flush();

    expect(hook.state).toBe('awaiting');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('reaches success exactly once the subscription tier actually advances to targetPlanTier', async () => {
    vi.useFakeTimers();
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'pro', status: 'ACTIVE' },
      openCharge: null, // terminal once the webhook confirms — SUCCESS charges are no longer "open"
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
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

describe('useAgencyCheckout — awaiting poll: failure predicate', () => {
  it('fails when the open charge vanished but the tier never advanced', async () => {
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: null,
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
    await flush();

    expect(hook.state).toBe('error');
    expect(hook.error).toContain('rechazado');
  });

  it.each(['DECLINED', 'ERROR', 'VOIDED'])(
    'fails immediately on gateway status %s',
    async (gatewayStatus) => {
      await mount();
      mockVerify.mockResolvedValue({
        subscription: { planTier: 'starter', status: 'ACTIVE' },
        openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus },
        status: 'ACTIVE',
      });

      await payToAwaiting('pro');
      await flush();

      expect(hook.state).toBe('error');
    },
  );
});

describe('useAgencyCheckout — resume', () => {
  it('picks a PENDING charge back up and reaches success once the tier advances', async () => {
    vi.useFakeTimers();
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'pro', status: 'ACTIVE' },
      openCharge: null,
      status: 'ACTIVE',
    });

    act(() => {
      hook.resume('pro');
    });
    expect(hook.state).toBe('awaiting');

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

  it('does not clobber a flow already in progress', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    let resolveSelect: (v: unknown) => void = () => {};
    mockSelectPlan.mockReturnValue(new Promise((r) => { resolveSelect = r; }));

    await act(async () => {
      void hook.pay('pro');
    });
    expect(hook.state).toBe('processing');

    act(() => {
      hook.resume('starter');
    });
    expect(hook.state).toBe('processing');

    await act(async () => {
      resolveSelect({ charge: null });
    });
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
