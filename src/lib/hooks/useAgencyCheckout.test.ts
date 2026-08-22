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
 *       `/upgrade` and came back) without going through pay() again — fetches
 *       a FRESH payment link for the charge (the original tab may be gone)
 *       before entering `awaiting`, so the resumed session has a usable link
 *       (T-0012 WU-3, defect A).
 *   (8) verifyNow(): still pending → surfaces the "todavía no vemos" message.
 *   (9) resume() link-fetch failure: stays in `awaiting` with `paymentUrl`
 *       null — never traps the user, never fabricates a link (WU-3 defect A/B).
 *   (10) awaitingTimedOut: flips after a sustained wait with no confirmation;
 *        polling and verifyNow keep working; never resolves success on its
 *        own (WU-3 defect D + the "never a false success" regression guard).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';

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
  it('fetches a fresh payment link for the open charge, then reaches success once the tier advances', async () => {
    vi.useFakeTimers();
    await mount();
    mockChargePaymentLink.mockResolvedValue({ url: 'https://checkout.wompi.co/l/resumed' });
    // Still genuinely open/unpaid — the resumed session must not fake success.
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    act(() => {
      hook.resume('ch_1', 'pro');
    });
    // processing is literally accurate here — we ARE fetching the link — so
    // awaiting never has to lie about it (defect B).
    expect(hook.state).toBe('processing');
    expect(hook.resuming).toBe(true);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockChargePaymentLink).toHaveBeenCalledWith('ch_1');
    expect(hook.paymentUrl).toBe('https://checkout.wompi.co/l/resumed');
    expect(hook.resuming).toBe(false);
    expect(hook.state).toBe('awaiting');
    expect(onSuccess).not.toHaveBeenCalled();

    // Now the tier genuinely advances — success only follows the real signal.
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'pro', status: 'ACTIVE' },
      openCharge: null,
      status: 'ACTIVE',
    });
    await act(async () => {
      await hook.verifyNow();
    });
    expect(hook.state).toBe('success');

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not clobber a flow already in progress, and never fetches a link for it', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    let resolveSelect: (v: unknown) => void = () => {};
    mockSelectPlan.mockReturnValue(new Promise((r) => { resolveSelect = r; }));

    await act(async () => {
      void hook.pay('pro');
    });
    expect(hook.state).toBe('processing');

    act(() => {
      hook.resume('ch_2', 'starter');
    });
    expect(hook.state).toBe('processing');
    expect(mockChargePaymentLink).not.toHaveBeenCalled();

    await act(async () => {
      resolveSelect({ charge: null });
    });
  });

  it('reaches an honest, usable awaiting state (no paymentUrl) when the link fetch fails — never traps the user', async () => {
    await mount();
    mockChargePaymentLink.mockRejectedValue(new Error('network'));
    // Still genuinely open/unpaid — the poll must not misread the failed link
    // fetch as a gateway rejection.
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    act(() => {
      hook.resume('ch_1', 'pro');
    });
    expect(hook.state).toBe('processing');

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hook.state).toBe('awaiting');
    expect(hook.paymentUrl).toBeNull();
    expect(hook.resuming).toBe(false);
    // Not fabricated as an error/success — still an honest, escapable awaiting.
    expect(hook.error).toBeNull();
  });

  it('is a no-op while idle-guard fails to hold — resume only fires from idle', async () => {
    await mount();
    mockChargePaymentLink.mockResolvedValue({ url: 'https://checkout.wompi.co/l/x' });
    // Still genuinely open/unpaid — matches charge 'ch_1' passed to resume().
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    // First resume from idle succeeds normally.
    act(() => {
      hook.resume('ch_1', 'pro');
    });
    expect(hook.state).toBe('processing');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hook.state).toBe('awaiting');

    // A second resume call while already awaiting must not re-fetch the link
    // (payment-link increments `attempts` server-side — must not poll it).
    act(() => {
      hook.resume('ch_1', 'pro');
    });
    expect(mockChargePaymentLink).toHaveBeenCalledTimes(1);
  });
});

describe('useAgencyCheckout — awaiting timeout (abandoned payment)', () => {
  it('flags awaitingTimedOut after a sustained wait with no confirmation, without leaving awaiting or faking success', async () => {
    vi.useFakeTimers();
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
    expect(hook.state).toBe('awaiting');
    expect(hook.awaitingTimedOut).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });

    expect(hook.awaitingTimedOut).toBe(true);
    // Still honest: no confirmation ever arrived, so it stays in awaiting —
    // never silently promoted to success just because time passed.
    expect(hook.state).toBe('awaiting');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('keeps verifyNow working after the timeout flips', async () => {
    vi.useFakeTimers();
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(hook.awaitingTimedOut).toBe(true);

    await act(async () => {
      await hook.verifyNow();
    });
    expect(hook.pollError).toContain('Todavía no vemos');
    expect(hook.state).toBe('awaiting');
  });

  it('still reaches real success via a poll after the timeout flips, if confirmation lands late', async () => {
    vi.useFakeTimers();
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(hook.awaitingTimedOut).toBe(true);

    mockVerify.mockResolvedValue({
      subscription: { planTier: 'pro', status: 'ACTIVE' },
      openCharge: null,
      status: 'ACTIVE',
    });
    await act(async () => {
      await hook.verifyNow();
    });
    expect(hook.state).toBe('success');
  });

  it('resets on reset() (leaving the overlay)', async () => {
    vi.useFakeTimers();
    await mount();
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: { id: 'ch_1', status: 'PENDING', targetPlanTier: 'pro', gatewayStatus: null },
      status: 'ACTIVE',
    });

    await payToAwaiting('pro');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(hook.awaitingTimedOut).toBe(true);

    act(() => {
      hook.reset();
    });
    expect(hook.state).toBe('idle');
    expect(hook.awaitingTimedOut).toBe(false);
  });
});

describe('useAgencyCheckout — pay: select-plan 409 PENDING_CHARGE_ALREADY_PAID (T-0012 WU-5)', () => {
  // The back found the agency's previous open charge already APPROVED at
  // Wompi, confirmed it server-side, and refused to open a new one. The
  // money was already honoured — the UI must land the owner on the plan
  // they already paid for, not tell them the payment failed.

  it('lands on the upgraded plan with no error once the refetched tier matches', async () => {
    vi.useFakeTimers();
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    mockSelectPlan.mockRejectedValue(
      new ApiError(409, 'El cargo pendiente ya había sido pagado', 'PENDING_CHARGE_ALREADY_PAID'),
    );
    // Fresh read after the 409: the back already confirmed the OLD charge,
    // granting the tier the owner just tried to (re)select.
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'pro', status: 'ACTIVE' },
      openCharge: null,
      status: 'ACTIVE',
    });

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(hook.state).toBe('success');
    expect(hook.error).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does NOT claim success when the refetched tier has not actually advanced', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    mockSelectPlan.mockRejectedValue(
      new ApiError(409, 'El cargo pendiente ya había sido pagado', 'PENDING_CHARGE_ALREADY_PAID'),
    );
    // The refetch still shows the OLD tier — WU-1's predicate must not be
    // bypassed just because the back said 409.
    mockVerify.mockResolvedValue({
      subscription: { planTier: 'starter', status: 'ACTIVE' },
      openCharge: null,
      status: 'ACTIVE',
    });

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(hook.state).toBe('error');
    expect(hook.error).not.toBeNull();
    // Honest, not a "your payment was rejected" lie in the other direction —
    // the back's own message says it already confirmed something.
    expect(hook.error).not.toContain('rechazado');
  });
});

describe('useAgencyCheckout — pay: select-plan 503 payment_verification_unavailable (T-0012 WU-5)', () => {
  it('surfaces a transient retry message, never a failure', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    mockSelectPlan.mockRejectedValue(
      new ApiError(503, 'No se pudo verificar el estado del cargo', 'payment_verification_unavailable'),
    );

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(hook.state).toBe('error');
    expect(hook.error).not.toBeNull();
    expect(hook.error).not.toContain('rechazado');
    expect(hook.error).not.toMatch(/no se pudo iniciar el pago/i);
    // Wompi was unreachable — nothing to reconcile against yet, so this must
    // not trigger a refetch.
    expect(mockVerify).not.toHaveBeenCalled();
  });
});

describe('useAgencyCheckout — pay: unrelated select-plan errors (T-0012 WU-5 regression guard)', () => {
  it('keeps the existing generic error handling for an error that is not the 409/503 pair', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    mockSelectPlan.mockRejectedValue(new Error('boom'));

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(hook.state).toBe('error');
    expect(hook.error).toBe('boom');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('an ApiError 409 with a DIFFERENT code stays generic (not treated as PENDING_CHARGE_ALREADY_PAID)', async () => {
    await mount();
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    mockSelectPlan.mockRejectedValue(new ApiError(409, 'plan ya activo', 'NO_CHANGE'));

    await act(async () => {
      await hook.pay('pro');
    });
    await flush();

    expect(hook.state).toBe('error');
    expect(hook.error).toBe('plan ya activo');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("regression: WU-1's fresh-charge success predicate (awaiting → active only on real tier advance) is untouched", async () => {
    await mount();
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
