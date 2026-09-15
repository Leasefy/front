/**
 * Pure predicate for `upgrade/page.tsx`'s confirmation gate (T-0089): clicking
 * a plan with a LOWER ladder level than the agency's current plan must ask for
 * confirmation before calling the back — `select-plan` schedules the downgrade
 * silently otherwise (`SCHEDULED_DOWNGRADE`), and the owner could lose paid
 * features without realizing they asked for less.
 *
 * Extracted to a sibling module — Next.js App Router page files may export
 * only the page component (see `resume-reactivation.ts`, same rule, T-0085).
 */

/**
 * True when moving from `currentLevel` to `targetLevel` is a downgrade.
 * Off-ladder plans (`level: null`, e.g. a usage-based tier) never trigger the
 * gate in either direction — there is no ladder position to compare, and the
 * back does not treat a move to/from an off-ladder plan as this kind of
 * scheduled change.
 */
export function isLowerTierChange(
  currentLevel: number | null | undefined,
  targetLevel: number | null | undefined,
): boolean {
  if (currentLevel == null || targetLevel == null) return false;
  return targetLevel < currentLevel;
}
