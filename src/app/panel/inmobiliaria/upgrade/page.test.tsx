/**
 * upgrade/page — `shouldResumeReactivation` (T-0085).
 *
 * The route has no pre-existing `page.test.tsx` (contract.md §8 / brief §4
 * explicitly allows substituting a hook-level test of the same logic when
 * that is the case). The predicate this task widens lives in the PAGE's
 * resume-trigger `useEffect`, not in `useAgencyCheckout`, so it is exported
 * standalone from `page.tsx` and unit-tested directly here — proving the
 * real production predicate without mounting the full page (heavy tree:
 * `PricingTable`, `AgencyCheckoutOverlay`, `useAgencyPlans`,
 * `useAgencySubscription`, `next/navigation`).
 */

import { describe, it, expect } from 'vitest';
import { shouldResumeReactivation } from './page';
import type { AgencySubscriptionCharge } from '@/lib/api/agency-subscription.types';

function charge(overrides: Partial<AgencySubscriptionCharge> = {}): AgencySubscriptionCharge {
  return {
    id: 'ch_react',
    amount: 150_000,
    status: 'PENDING',
    kind: 'RENEWAL',
    targetPlanTier: null,
    ...overrides,
  };
}

describe('shouldResumeReactivation', () => {
  it('resumes a PENDING RENEWAL charge with no targetPlanTier while the subscription is SUSPENDED', () => {
    expect(shouldResumeReactivation(charge(), 'SUSPENDED')).toBe(true);
  });

  it('resumes the same charge while PAST_DUE', () => {
    expect(shouldResumeReactivation(charge(), 'PAST_DUE')).toBe(true);
  });

  it('does not resume once the subscription is ACTIVE', () => {
    expect(shouldResumeReactivation(charge(), 'ACTIVE')).toBe(false);
  });

  it('does not resume a charge that carries a targetPlanTier (purchase/UPGRADE — the existing branch owns it)', () => {
    expect(
      shouldResumeReactivation(charge({ kind: 'UPGRADE', targetPlanTier: 'pro' }), 'SUSPENDED'),
    ).toBe(false);
  });

  it('does not resume a non-RENEWAL charge', () => {
    expect(shouldResumeReactivation(charge({ kind: 'INITIAL' }), 'SUSPENDED')).toBe(false);
  });

  it('does not resume a non-PENDING charge', () => {
    expect(shouldResumeReactivation(charge({ status: 'SUCCESS' }), 'SUSPENDED')).toBe(false);
  });

  it('returns false with no open charge', () => {
    expect(shouldResumeReactivation(null, 'SUSPENDED')).toBe(false);
    expect(shouldResumeReactivation(undefined, 'SUSPENDED')).toBe(false);
  });

  it('treats an undefined/null subscription status as non-ACTIVE (no subscription row yet)', () => {
    expect(shouldResumeReactivation(charge(), undefined)).toBe(true);
    expect(shouldResumeReactivation(charge(), null)).toBe(true);
  });
});
