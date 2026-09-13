import type {
  AgencySubscriptionCharge,
  AgencySubscriptionStatus,
} from '@/lib/api/agency-subscription.types';

/**
 * True when `openCharge` is a stuck, payable RENEWAL charge for a
 * SUSPENDED/PAST_DUE subscription re-selecting its CURRENT tier (T-0085):
 * `select-plan` answers `REACTIVATION_PENDING` for this case and the back's
 * monthly-billing cron can also leave exactly this kind of charge behind
 * before any select-plan call happens at all. `targetPlanTier` is always
 * null for this charge kind — that is what distinguishes it from the
 * pre-existing purchase-resume branch (a PENDING UPGRADE charge, which DOES
 * carry a `targetPlanTier`).
 *
 * Lives in this sibling module, NOT in `page.tsx`: a Next.js App Router page
 * file may only export `default` and the documented config symbols
 * (`metadata`, `generateStaticParams`, …) — any other named export fails the
 * generated `.next/types/app/**\/page.ts` check once `.next/` exists
 * (`rm -rf .next && pnpm build && npx tsc --noEmit` — verify round 1, T-0085
 * WU-2, MEDIUM 1). CI's required `test` job never runs `build` before `tsc`,
 * so this is invisible there, but it is a real, deterministic local failure
 * and a third instance of an anti-pattern already present in two other page
 * files — do not add a fourth.
 */
export function shouldResumeReactivation(
  openCharge: AgencySubscriptionCharge | null | undefined,
  subscriptionStatus: AgencySubscriptionStatus | null | undefined,
): boolean {
  if (!openCharge) return false;
  return (
    openCharge.status === 'PENDING' &&
    !openCharge.targetPlanTier &&
    openCharge.kind === 'RENEWAL' &&
    subscriptionStatus !== 'ACTIVE'
  );
}
