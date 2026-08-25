/**
 * useAgencySubscription.test.ts — contrato 29 · planes dinámicos (Fase C1).
 *
 * The hook must derive "paid" from the resolved plan's `isDefault` flag, NOT
 * from a hardcoded tier name, so an ACTIVE agency on an admin-created paid slug
 * (e.g. `pro-plus`) is recognised as paid. It must also stay fail-OPEN: while the
 * plan catalog is loading or errored, the paid/free verdict is `indeterminate`
 * so the guard never bounces a paying agency on a transient failure.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

const mockGet = vi.fn();
const mockGetPlans = vi.fn();

vi.mock('@/lib/api/agency-subscription.service', () => ({
  agencySubscriptionApi: { get: (...a: unknown[]) => mockGet(...a) },
}));
vi.mock('@/lib/api/subscriptions.service', () => ({
  subscriptionsApi: { getPlans: (...a: unknown[]) => mockGetPlans(...a) },
}));

import { useAgencySubscription } from './useAgencySubscription';
import type { BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';

function backendPlan(o: Partial<BackendSubscriptionPlan>): BackendSubscriptionPlan {
  return {
    id: o.tier ?? 'x',
    planType: 'AGENCY',
    tier: 'starter',
    name: 'X',
    description: null,
    level: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: 0,
    maxUsers: 0,
    maxScoringViews: 0,
    monthlyEvalCap: 0,
    monthlyCreditGrant: 0,
    billingMode: 'FLAT',
    usageFeeBps: 0,
    scoringIncluded: false,
    hasPremiumScoring: false,
    hasApiAccess: false,
    scoringViewPrice: 0,
    evaluationCreditPrice: 0,
    isDefault: false,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...o,
  };
}

function activeState(planTier: string) {
  return {
    subscription: { id: 's1', agencyId: 'a1', planTier, status: 'ACTIVE' },
    openCharge: null,
    status: 'ACTIVE',
    canOfferRentals: true,
  };
}

type Hook = ReturnType<typeof useAgencySubscription>;
let container: HTMLDivElement;
let root: Root;

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null;
  function C() {
    latest = useAgencySubscription();
    return null;
  }
  act(() => {
    root.render(React.createElement(C));
  });
  return { get: () => latest as Hook };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('useAgencySubscription — isPaidPlan derives from isDefault (no tier-name branching)', () => {
  it('ACTIVE agency on an admin-created paid slug (isDefault=false) is paid', async () => {
    mockGet.mockResolvedValueOnce(activeState('PRO-PLUS'));
    mockGetPlans.mockResolvedValueOnce([
      backendPlan({ tier: 'pro-plus', isDefault: false }),
      backendPlan({ tier: 'starter', isDefault: true }),
    ]);

    const hook = renderHook();
    await act(async () => {});

    expect(hook.get().currentPlanId).toBe('pro-plus');
    expect(hook.get().currentPlan?.tier).toBe('pro-plus');
    expect(hook.get().isPaidPlan).toBe(true);
    expect(hook.get().indeterminate).toBe(false);
  });

  it('ACTIVE agency on the default plan (isDefault=true) is NOT paid', async () => {
    mockGet.mockResolvedValueOnce(activeState('starter'));
    mockGetPlans.mockResolvedValueOnce([backendPlan({ tier: 'starter', isDefault: true })]);

    const hook = renderHook();
    await act(async () => {});

    expect(hook.get().isPaidPlan).toBe(false);
    expect(hook.get().indeterminate).toBe(false);
  });

  it('non-ACTIVE subscription is forced to starter and NOT paid (still blocks)', async () => {
    mockGet.mockResolvedValueOnce({
      subscription: { id: 's1', agencyId: 'a1', planTier: 'PRO-PLUS', status: 'PAST_DUE' },
      openCharge: null,
      status: 'PAST_DUE',
      canOfferRentals: false,
    });
    mockGetPlans.mockResolvedValueOnce([
      backendPlan({ tier: 'pro-plus', isDefault: false }),
      backendPlan({ tier: 'starter', isDefault: true }),
    ]);

    const hook = renderHook();
    await act(async () => {});

    expect(hook.get().currentPlanId).toBe('starter');
    expect(hook.get().isPaidPlan).toBe(false);
  });
});

describe('useAgencySubscription — fail-open indeterminate', () => {
  it('is indeterminate while the plan catalog is still loading', async () => {
    mockGet.mockResolvedValueOnce(activeState('PRO-PLUS'));
    let resolvePlans: (v: BackendSubscriptionPlan[]) => void = () => {};
    mockGetPlans.mockReturnValueOnce(
      new Promise<BackendSubscriptionPlan[]>((r) => {
        resolvePlans = r;
      }),
    );

    const hook = renderHook();
    await act(async () => {});

    // Subscription resolved but the catalog is still pending → passthrough.
    expect(hook.get().plansLoading).toBe(true);
    expect(hook.get().indeterminate).toBe(true);

    await act(async () => {
      resolvePlans([backendPlan({ tier: 'pro-plus', isDefault: false })]);
    });

    expect(hook.get().indeterminate).toBe(false);
    expect(hook.get().isPaidPlan).toBe(true);
  });

  it('is indeterminate when the plan catalog fails to load (never blocks a payer)', async () => {
    mockGet.mockResolvedValueOnce(activeState('PRO-PLUS'));
    mockGetPlans.mockRejectedValueOnce(new Error('5xx'));

    const hook = renderHook();
    await act(async () => {});

    expect(hook.get().plansError).toBeTruthy();
    expect(hook.get().indeterminate).toBe(true);
  });
});
