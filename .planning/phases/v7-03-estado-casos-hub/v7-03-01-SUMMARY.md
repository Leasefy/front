---
phase: v7-03-estado-casos-hub
plan: 01
subsystem: ui
tags: [react-hooks, view-model, tenant-cases, aggregator, vitest, tdd]

# Dependency graph
requires:
  - phase: v7-01-fundacion-limpieza
    provides: single-source payment discipline (PAGO-01) + tenant source hooks (useMyPaymentRequests, useLeasePaymentInfo, useLeases, useTenantApplications)
provides:
  - TenantCase read-only view-model + pure, total source-status→label/tone mappers (tenant-case.ts)
  - useTenantCases() aggregator composing real pago + application-journey sources into one normalized list
  - Vitest unit spec proving rows-only-from-real-sources, forward-refs=0, tone ceiling, no double-count
affects: [v7-03-02 (hub page consumes useTenantCases), v7-06 (pqrs rows), v7-07 (mantenimiento/acuerdo/contrato rows)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-projection view-model: normalize source rows, never recompute saldo/SLA/status"
    - "Aggregator hook clones useTenantApplications composition shape (parallel source hooks → useMemo classify → { cases, isLoading, error, refetch })"
    - "Tone type intentionally caps at 'attention' — cannot express an alarm level (consumer-law safety)"
    - "Forward-ref union members declared but emit zero rows (v7-06/07 forward-compat)"

key-files:
  created:
    - src/lib/types/tenant-case.ts
    - src/lib/hooks/use-tenant-cases.ts
    - src/lib/hooks/use-tenant-cases.test.ts
  modified: []

key-decisions:
  - "próximo-pago row emitted ONLY when currentPeriodStatus === 'NONE' (a REJECTED period is already its request-derived row → no double count / no inflated openCasesCount)"
  - "próximo-pago id derived from opaque lease UUID (proximo-pago:{leaseId}); updatedAt = lease.updatedAt (real source timestamp); events = [] (nothing fabricated)"
  - "application label reused from APPLICATION_STATUS_LABELS via applicationStatusToLabel — no parallel label map"
  - "error surfaces first non-null source error; single failed source degrades to its empty list (source hooks already 403/404 → [])"

patterns-established:
  - "Pure total mappers with assertNever default (no leaking raw enum)"
  - "Events built only from timestamps the source row actually carries (createdAt/validatedAt/submittedAt/updatedAt)"

requirements-completed: [CASO-01]

# Metrics
duration: ~20min
completed: 2026-07-18
---

# Phase v7-03 Plan 01: Unified case view-model + useTenantCases() aggregator Summary

**Read-only `TenantCase` view-model plus `useTenantCases()` aggregator that normalizes (never recomputes) the tenant's real pago requests + non-terminal application-journey into one neutral list, with forward-ref types emitting zero rows and a tone type that cannot express an alarm level.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-18T17:48:00Z
- **Completed:** 2026-07-18T18:07:00Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- `tenant-case.ts`: `CaseType` / `CaseTone` (capped at `attention`) / `CaseEvent` / `TenantCase` + four pure, total mappers (`paymentStatusToTone`/`paymentStatusToLabel`/`applicationStatusToTone`/`applicationStatusToLabel`). No internal fields (no responsible-party id, no agency notes — CASO-02); no credit-bureau/urgency strings; reuses `APPLICATION_STATUS_LABELS`.
- `useTenantCases()`: composes the four EXISTING source hooks (adds no fetch/authz), builds `TenantCase[]` in a `useMemo` via the pure mappers, wires `useVisibilityPolling` for tab-gated refresh, returns `{ cases, openCasesCount, primaryLease, isLoading, error, refetch }`.
- Double-count fix encoded + asserted: a REJECTED current period whose request is in the non-terminal list yields exactly ONE 'pago' row.
- 12-test Vitest spec (TDD RED → GREEN) proving the full `<behavior>`.

## Task Commits

Single atomic commit per the launching agent's staging directive (3 new src files + this SUMMARY):

1. **Task 1 + Task 2 (backbone):** `c0102f8a` (feat) — TenantCase view-model, useTenantCases aggregator, unit spec

_TDD flow for Task 2 was RED (spec fails on missing module) → GREEN (hook created, 12/12 pass), committed together as one `feat` per parent instruction._

## Files Created/Modified
- `src/lib/types/tenant-case.ts` - View-model types + pure source-status mappers (read projection; normalizes, never computes)
- `src/lib/hooks/use-tenant-cases.ts` - `useTenantCases()` aggregator composing real source hooks into `TenantCase[]`
- `src/lib/hooks/use-tenant-cases.test.ts` - 12 unit tests (real sources only, forward-refs=0, tone ceiling, no double count, events from source timestamps, openCasesCount === cases.length)

## Decisions Made
- **próximo-pago only on `NONE`** (not `REJECTED`) — prevents double-counting the current period; asserted in the test.
- **próximo-pago id/timestamp from the lease** — id `proximo-pago:{lease.id}` (opaque UUID-derived, stable), `updatedAt` = `lease.updatedAt` (real), `events: []`.
- **Adapted to real hook signatures** — `useLeases().getActive()` returns frontend `Lease[]` (not `BackendLease[]` as the plan `<interfaces>` sketched); `useLeasePaymentInfo` exposes `info.currentPeriod.{month,year}`. Matched the real source of truth per the composition analog `useTenantApplications`.

## Deviations from Plan

None affecting behavior or scope. One benign adaptation: the plan `<interfaces>` block sketched `getActive(): BackendLease[]` and a flatter `BackendPaymentInfo`; the real code returns the mapped frontend `Lease[]` and nests the period under `info.currentPeriod`. The hook was written against the real signatures (as the plan instructs: "If a source hook's signature differs … adapt to the real code"). No new packages, no page edits.

## Issues Encountered
- Vitest prints a cosmetic `Warning: The current testing environment is not configured to support act(...)` — identical to the repo's existing raw `react-dom/client` + `act` hook-test harness (e.g. `use-agent.test.ts`, `use-costos.test.ts`). Tests pass; not a failure.

## Verification Results
- **Task 1 grep gate:** `GATE_OK` (CaseTone present, no `'danger'`, no `responsableId`, no credit-bureau/urgency strings, reuses APPLICATION_STATUS_LABELS).
- **Task 2 grep gate:** `GATE_OK` (useTenantCases/useVisibilityPolling/useMyPaymentRequests/useTenantApplications present; no `MOCK`/hardcoded/`'danger'`; `pnpm test` on the new spec passes).
- **`pnpm build`:** succeeds (Next.js production build; CI does not run `next build`).
- **`pnpm test` (full suite):** 594 passed / 7 failed / 601 total. The 7 failures are the exact pre-existing set documented in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (asegurabilidad/nueva ×2, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels ×2). **0 NEW failures.** The 12 new `use-tenant-cases.test.ts` tests all pass.
- No page files modified (backbone only).

## Next Phase Readiness
- CASO-01 backbone ready: v7-03-02 can consume `useTenantCases()` for the estado/casos hub page and render forward-ref types as honest "Próximamente" sections (never as fake TenantCase rows).

## Self-Check: PASSED
- `src/lib/types/tenant-case.ts` — FOUND
- `src/lib/hooks/use-tenant-cases.ts` — FOUND
- `src/lib/hooks/use-tenant-cases.test.ts` — FOUND
- Commit `c0102f8a` — FOUND (git log verified)

---
*Phase: v7-03-estado-casos-hub*
*Completed: 2026-07-18*
