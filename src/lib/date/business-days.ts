/**
 * Business-day SLA helper — INTERIM display estimate (SOLI-03), pure + zero deps.
 *
 * The AUTHORITATIVE PQRS response deadline is the server's `slaVenceAt`, computed by
 * the M1 triage engine (`agent`). Until that engine is live, the frontend shows an
 * interim estimate of `createdAt + PQRS_SLA_BUSINESS_DAYS` business days so the SLA is
 * NEVER blank (PITFALLS 6).
 *
 * The estimate is weekday-only (skips Sat/Sun, NO holiday table — ROADMAP:135 "sin
 * festivos"). Because it ignores holidays it is intentionally OPTIMISTIC, so callers
 * MUST label it "estimado" and soft-frame it ("hacia el …"), never "vence el …".
 * `resolveExpectedResponse` prefers the authoritative `slaVenceAt` when present and
 * only falls back to the estimate otherwise, flagging which one it returned.
 */

import { PQRS_SLA_BUSINESS_DAYS } from '@/lib/constants/response-sla';

/**
 * Adds `days` business days (Mon–Fri) to `from`, skipping Sat/Sun only.
 *
 * Pure + total: copies `from` into a NEW Date (never mutates the input), advances one
 * calendar day at a time and counts a day only when it falls on a weekday. There is NO
 * holiday list by design — a weekday that happens to be a Colombian holiday is still
 * counted. `days === 0` returns the same calendar day (no shift).
 */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime()); // copy — never mutate the caller's Date
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0 = Sun … 6 = Sat
    if (dow !== 0 && dow !== 6) {
      added += 1;
    }
  }
  return d;
}

/**
 * Result of resolving the expected-response date for display.
 *
 * `estimated: false` → `date` is the authoritative server `slaVenceAt`.
 * `estimated: true`  → `date` is the interim weekday-only estimate (label "estimado").
 */
export interface ExpectedResponse {
  date: Date;
  estimated: boolean;
}

/**
 * Two-tier resolver for the PQRS expected-response date — NEVER blank.
 *
 * When `slaVenceAtIso` is a non-empty string, returns it as the authoritative date
 * (`estimated: false`). Otherwise returns the interim estimate
 * `createdAt + PQRS_SLA_BUSINESS_DAYS` business days (`estimated: true`), reusing the
 * shared SLA constant so both pillars agree.
 */
export function resolveExpectedResponse(
  createdAtIso: string,
  slaVenceAtIso?: string,
): ExpectedResponse {
  if (slaVenceAtIso) {
    return { date: new Date(slaVenceAtIso), estimated: false };
  }
  return {
    date: addBusinessDays(new Date(createdAtIso), PQRS_SLA_BUSINESS_DAYS),
    estimated: true,
  };
}
