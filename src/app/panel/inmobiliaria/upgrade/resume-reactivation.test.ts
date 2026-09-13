/**
 * upgrade/resume-reactivation — `shouldResumeReactivation` (T-0085).
 *
 * Moved out of `page.tsx` (fix round 1, MEDIUM 1): a Next.js App Router page
 * file may only export `default` and the documented config symbols, so a
 * plain named export there fails `tsc --noEmit` once `.next/types` exists
 * (`rm -rf .next && pnpm build && npx tsc --noEmit`). The predicate now lives
 * in the sibling `resume-reactivation.ts` module and is imported by both
 * `page.tsx` and this test file.
 */

import { describe, it, expect } from 'vitest';
import { shouldResumeReactivation } from './resume-reactivation';
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
