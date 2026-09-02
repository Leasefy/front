import { describe, it, expect } from 'vitest';
import {
  addBusinessDays,
  resolveExpectedResponse,
} from './business-days';
import { PQRS_SLA_BUSINESS_DAYS } from '@/lib/constants/response-sla';

// NOTE: dates for weekday assertions are built with the LOCAL-time constructor
// `new Date(year, monthIndex, day)` so `getDay()` is deterministic regardless of the
// runner's timezone. Parsing a bare ISO date string (e.g. '2026-07-17') would be UTC
// midnight and shift a calendar day in TZs behind UTC (e.g. America/Bogota, UTC-5),
// producing a wrong weekday. The resolver bullets use full ISO instants, which are
// TZ-safe because both sides parse identically.

describe('addBusinessDays', () => {
  it('skips Sat/Sun: Friday + 1 business day → next Monday', () => {
    const friday = new Date(2026, 6, 17); // Fri 2026-07-17 (local)
    expect(friday.getDay()).toBe(5); // sanity: it really is a Friday

    const result = addBusinessDays(friday, 1);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(20); // Mon 2026-07-20 (skipped Sat 18 + Sun 19)
    expect(result.getDay()).toBe(1); // Monday
  });

  it('from a Monday, +15 business days lands on a weekday (never Sat/Sun)', () => {
    const monday = new Date(2026, 6, 20); // Mon 2026-07-20 (local)
    expect(monday.getDay()).toBe(1);

    const result = addBusinessDays(monday, 15);
    expect([0, 6]).not.toContain(result.getDay());
    // 15 business days = exactly 3 weeks = +21 calendar days → same weekday (Monday)
    expect(result.getDay()).toBe(1);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getDate()).toBe(10); // Mon 2026-08-10
  });

  it('does NOT mutate its `from` argument (returns a new Date)', () => {
    const from = new Date(2026, 6, 17);
    const snapshot = from.getTime();

    const result = addBusinessDays(from, 5);
    expect(from.getTime()).toBe(snapshot); // input untouched
    expect(result).not.toBe(from); // a different Date instance
    expect(result.getTime()).not.toBe(snapshot); // and it actually advanced
  });

  it('days = 0 → same calendar day (no shift)', () => {
    const from = new Date(2026, 6, 17); // Friday
    const result = addBusinessDays(from, 0);
    expect(result.getTime()).toBe(from.getTime());
  });

  it('has NO holiday table: a weekday holiday is still counted (weekday-only by design)', () => {
    // Wed 2025-12-31 + 1 business day → Thu 2026-01-01 (New Year, a Colombian holiday).
    // Weekday-only logic counts it; a holiday table would have skipped to Fri 2026-01-02.
    const wed = new Date(2025, 11, 31); // Wed 2025-12-31 (local)
    expect(wed.getDay()).toBe(3);

    const result = addBusinessDays(wed, 1);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1); // Jan 1 — the holiday, still counted
    expect(result.getDay()).toBe(4); // Thursday
  });
});

describe('resolveExpectedResponse', () => {
  const CREATED = '2026-07-01T14:00:00.000Z';

  it('prefers the authoritative slaVenceAt when present (estimated: false)', () => {
    const sla = '2026-07-25T09:00:00.000Z';
    const result = resolveExpectedResponse(CREATED, sla);
    expect(result.estimated).toBe(false);
    expect(result.date.getTime()).toBe(new Date(sla).getTime());
  });

  it('falls back to createdAt + 15 business days when slaVenceAt is absent (estimated: true)', () => {
    const result = resolveExpectedResponse(CREATED, undefined);
    expect(result.estimated).toBe(true);
    const expected = addBusinessDays(new Date(CREATED), PQRS_SLA_BUSINESS_DAYS);
    expect(result.date.getTime()).toBe(expected.getTime());
  });

  it('treats an empty-string slaVenceAt as absent → estimate (estimated: true)', () => {
    const result = resolveExpectedResponse(CREATED, '');
    expect(result.estimated).toBe(true);
    const expected = addBusinessDays(new Date(CREATED), PQRS_SLA_BUSINESS_DAYS);
    expect(result.date.getTime()).toBe(expected.getTime());
  });

  it('never returns a blank date', () => {
    const result = resolveExpectedResponse(CREATED, undefined);
    expect(result.date).toBeInstanceOf(Date);
    expect(Number.isNaN(result.date.getTime())).toBe(false);
  });
});
