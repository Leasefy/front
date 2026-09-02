---
phase: v7-07-acuerdos-pago
plan: 03
subsystem: tenant-cases
tags: [acuerdos-pago, tenant-case, use-tenant-cases, hub-fold, normalize-never-compute, no-alarm-tone, anti-idor, ley-1480, vitest]

# Dependency graph
requires:
  - phase: v7-07-acuerdos-pago
    plan: 01
    provides: "acuerdosApi.listMine() + AcuerdoDetail/AcuerdoInstallment re-exported from the generated agent CarteraPaymentPlan* schema (single source of saldo, no fork)"
  - phase: v7-06-pqrs
    provides: "pqrsToCase pass-through mapper + useTenantPqrs tolerant hook + use-tenant-cases fold idiom (mirrored exactly here)"
provides:
  - "acuerdoStatusToTone/acuerdoStatusToLabel — pure, total over the free-string agent status with a safe default; tone capped at 'attention' (offered), never an alarm value"
  - "TenantCase.acuerdo — optional pass-through metadata block { status, totalDueCop, installments, paymentUrl, acceptedAt } (no debtorId/audit leak)"
  - "acuerdoToCase(p: AcuerdoDetail): TenantCase — pure PROJECTION (no saldo recompute), source-timestamp events, detailLink → /inquilino/acuerdos/[id]"
  - "useTenantAcuerdos() — tolerant list hook mirroring useTenantPqrs; wraps acuerdosApi.listMine(); degrades to [] with {items,isLoading,error,refetch}"
  - "useTenantCases folds acuerdo rows via acuerdoToCase (0 rows when listMine()=[]); refetch Promise.all + error ?? chain extended (acuerdo LAST)"
affects: [v7-07 waves 3-5 (acuerdos list/detail pages, accept panel, pay-cuota route), the /inquilino/casos hub, /inquilino/acuerdos detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fold a new source into the read-projection aggregator by mirroring the prior source's mapper+hook+fold triad exactly (pqrsToCase → acuerdoToCase; useTenantPqrs → useTenantAcuerdos)"
    - "Normalize-never-compute: the mapper PASSES THROUGH the agent record (status/totalDueCop/installments/paymentUrl/acceptedAt) on an optional metadata block — zero client-side saldo arithmetic (PITFALLS 9)"
    - "Tone type physically caps at 'attention' — a mora/acuerdo case cannot express an alarm color (Ley 1480, PITFALLS 8); switch over a free-string status uses a safe default, not assertNever"

key-files:
  created:
    - src/lib/hooks/use-tenant-acuerdos.ts
  modified:
    - src/lib/types/tenant-case.ts
    - src/lib/types/tenant-case.test.ts
    - src/lib/hooks/use-tenant-cases.ts
    - src/lib/hooks/use-tenant-cases.test.ts

key-decisions:
  - "detailLink → /inquilino/acuerdos/[id] (the dedicated interactive detail) per the PLAN, NOT the /inquilino/casos/[id] shown in the RESEARCH snippet — the plan is authoritative and later waves build the dedicated surface"
  - "TenantCase.acuerdo metadata carries acceptedAt in addition to the RESEARCH snippet's 4 fields, matching the PLAN's field list; installments passed BY REFERENCE (no copy, no reduce)"
  - "acuerdoStatusToTone/Label use switch + safe default (not assertNever) because the agent status is a free string, not a closed enum — unknown → info/generic label, never a crash or an alarm"
  - "Existing pago/aplicacion/pqrs cases stay byte-identical; the 0-acuerdo empty path emits ZERO rows so the v7-03 hub keeps its Acuerdos 'Próximamente' section"

patterns-established:
  - "Aggregator error ?? chain appends the newest source LAST so older sources keep priority; refetch Promise.all + useCallback deps extended in lockstep"

requirements-completed: [ACUE-01]

# Metrics
duration: 30min
completed: 2026-07-20
---

# Phase v7-07 Plan 03: Acuerdo Data-Layer Fold Summary

**Approved acuerdos de pago now become real cases in the unified `/inquilino/casos` hub via a pure pass-through `acuerdoToCase` mapper + a tolerant `useTenantAcuerdos` hook folded into `useTenantCases` — filling the exact seam v7-03 left open (`CaseType` already declared `'acuerdo'` with zero rows), with no second saldo engine, no alarm tone, and zero rows (hub keeps "Próximamente") until `acuerdosApi.listMine()` returns records.**

## Performance
- **Duration:** ~30 min
- **Tasks:** 3 (2 TDD)
- **Files created:** 1 (`use-tenant-acuerdos.ts`) — **Files modified:** 4 (2 source, 2 test)

## Accomplishments
- **ACUE-01 mappers (Task 1).** `acuerdoStatusToTone` (`offered`→`attention`, `active`→`info`, `completed`/`cancelled`→`neutral`, unknown→`info`, NEVER an alarm level) + `acuerdoStatusToLabel` (factual es-CO: Propuesto/Activo/Completado/Cancelado + safe generic default) + an optional `TenantCase.acuerdo` metadata block + `acuerdoToCase(p)` — a pure PROJECTION mirroring `pqrsToCase` that passes the plan record through **without recomputing a saldo** (PITFALLS 9). Events built from source timestamps only (`offeredAt`, `acceptedAt`); `detailLink` → the dedicated `/inquilino/acuerdos/[id]`. Reuses `AcuerdoDetail`/`AcuerdoInstallment` from `tenant-acuerdos.types` (no fork).
- **Tolerant list hook (Task 2).** `useTenantAcuerdos()` mirrors `useTenantPqrs` exactly (useState list + isLoading init true + error + refetch, useEffect fetch), sourced from `acuerdosApi.listMine()` → `[]` on not-live. No internal poller — the aggregator owns the tab-gated refresh.
- **Aggregator fold (Task 3).** `useTenantCases` composes `useTenantAcuerdos`, pushes `acuerdoToCase(p)` rows in the `useMemo` right after the PQRS loop, and extends the `isLoading` OR-chain, the `error ??` chain (acuerdo appended **LAST** so pago/aplicacion/pqrs errors keep priority), the `refetch` `Promise.all`, and the deps. `listMine()` → `[]` yields **zero** acuerdo rows, so the hub keeps its Acuerdos "Próximamente" section; only `contrato` still emits nothing.
- **Additive-only guarantee.** Existing pago/aplicación/PQRS cases are byte-identical; the pre-existing `use-tenant-cases.test.ts` specs stay green with `mockAcuerdos=[]` in `beforeEach`.

## Task Commits
1. **Task 1: acuerdo→case mappers + pass-through metadata (ACUE-01)** — `6369e37f` (feat)
2. **Task 2: useTenantAcuerdos tolerant list hook (ACUE-01)** — `3a2fd9db` (feat)
3. **Task 3: fold acuerdo rows into useTenantCases (ACUE-01)** — `d0341eac` (feat)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified
- `src/lib/types/tenant-case.ts` — +`acuerdoStatusToTone`/`acuerdoStatusToLabel`/`acuerdoToCase`, +optional `TenantCase.acuerdo` metadata, +import of `AcuerdoDetail`/`AcuerdoInstallment`; module header updated with the v7-07 fold doctrine.
- `src/lib/types/tenant-case.test.ts` — +20 specs: tone totality/no-alarm ceiling, label default, updatedAt fallback, dedicated detailLink, source-timestamp events, pass-through **by reference** (no derived saldo; `totalDueCop` verbatim even when it differs from Σ installments).
- `src/lib/hooks/use-tenant-acuerdos.ts` — new tolerant hook (mirror of `useTenantPqrs`).
- `src/lib/hooks/use-tenant-cases.ts` — compose `useTenantAcuerdos`; fold `acuerdoToCase` rows; extend isLoading / error-last / refetch / deps; header updated.
- `src/lib/hooks/use-tenant-cases.test.ts` — +8 specs (controllable `mockAcuerdos`/`mockAcuerdosError`/`acuerdosRefetchCount`): 0-row empty path, one-row fold with detailLink `/inquilino/acuerdos/<planId>` + metadata, offered→attention ceiling, openCasesCount, error-last priority, refetch Promise.all.

## Verification Results

| Gate | Result |
|------|--------|
| Task 1 grep gate (mappers + import + `acuerdo?` + `/inquilino/acuerdos/` present; 0 alarm-tone returns) | `GREP_GATE_OK` |
| `pnpm test -- tenant-case.test.ts` | 32/32 pass |
| Task 2 grep gate (`useTenantAcuerdos` + `acuerdosApi.listMine` + `refetch`; 0 `useVisibilityPolling`) | `GATE_OK` |
| Task 3 grep gate (`useTenantAcuerdos` + `acuerdoToCase` + `refetchAcuerdos` present) | `GREP_GATE_OK` |
| `pnpm test -- use-tenant-cases.test.ts` | 26/26 pass (18 pre-existing + 8 new) |
| No-saldo gate (no `.reduce`/sum/`restante` arithmetic in tenant-case.ts — every `saldo` token is prose) | PASS |
| `pnpm build` (next build, TS strict) | **EXIT 0 (green)** — hard gate; repo CI does not run next build |
| Full `pnpm test` | 705 pass / 12 fail (7 files) — **0 new failures** (matches v7-07-01 baseline exactly) |

## Decisions Made
- **One per-task commit for the TDD tasks** (Tasks 1 & 3), following the orchestrator directive ("commit per task with a `feat(v7-07):` prefix") and the v7-07-01 precedent. The RED→GREEN discipline held during development (the extended specs referenced the not-yet-added mappers/fold first).
- **`detailLink` → `/inquilino/acuerdos/[id]`** per the PLAN's explicit `<behavior>`/objective, overriding the RESEARCH code snippet that pointed at `/inquilino/casos/[id]` — the dedicated acuerdo detail is the wave-4 surface.
- **Free-string status → `switch` + safe default** (not `assertNever`): the agent `status` is `string`, so an unknown value degrades to `info`/a generic label rather than throwing.

## Deviations from Plan
None — plan executed exactly as written. No deviation rules (1–4) triggered; no auth gates; no architectural changes. One documentation reconciliation: where the RESEARCH snippet and the PLAN disagreed on `detailLink`, the PLAN (authoritative) was followed.

## Threat Model Coverage
- **T-v7-07-07 (Info Disclosure) — mitigated.** `TenantCase.acuerdo` projects only `status`/`totalDueCop`/`installments`/`paymentUrl`/`acceptedAt`; `debtorId`/`tenantId`/audit fields never cross. `responsable` is the role string `'Inmobiliaria'`; `id` is the opaque `planId`.
- **T-v7-07-08 (Tampering) — mitigated.** `listMine()` → `[]` → zero acuerdo rows → hub keeps "Próximamente"; no hardcoded/placeholder acuerdo array. Unit-tested (empty + real-rows).
- **T-v7-07-09 (Compliance / PITFALLS 9) — mitigated.** Tone capped at `'attention'` (grep-gated against destructive/danger/alarm/error returns); `acuerdo` metadata is pass-through with no saldo recompute (installments carried by reference; `totalDueCop` rendered verbatim even when it differs from Σ installments).
- **T-v7-07-SC — accept.** Zero new npm dependencies (`package.json`/lockfile untouched).

## Issues Encountered
- **Full-suite pre-existing failures (out of scope).** `pnpm test` reports 12 failing tests across 7 files — all agency-side AI/cobranza/cotizador/risk subsystems (`asegurabilidad/nueva`, `cobranza/plantillas`, `EquipoAgentes`, `WorkItemDetalle`, `CarrierRegistryTable`, `risk-levels`). None import the acuerdos/tenant-case modules; this plan is purely additive (1 file created, 4 modified with no behavior change to existing cases). The count/fileset matches the v7-07-01 baseline exactly → **zero new failures attributable to this plan**. Already logged in `deferred-items.md`.
- The `act(...)` warning during the refetch test is the repo's pre-existing raw `react-dom/client` harness convention (present in the original v7-03 test) — not a regression.

## Self-Check: PASSED
- FOUND: `src/lib/hooks/use-tenant-acuerdos.ts`
- FOUND: `src/lib/types/tenant-case.ts` (acuerdoToCase/acuerdoStatusToTone/acuerdoStatusToLabel)
- FOUND: `src/lib/hooks/use-tenant-cases.ts` (useTenantAcuerdos fold)
- FOUND commit: `6369e37f` (Task 1)
- FOUND commit: `3a2fd9db` (Task 2)
- FOUND commit: `d0341eac` (Task 3)

## Next Phase Readiness
- Waves 3–5 can build the acuerdos list/detail pages (`/inquilino/acuerdos`, `/inquilino/acuerdos/[id]`), the accept panel (reusing `SignaturePad` + the v7-07-02 generalized `OTPVerification`), and the v7-04 pay-cuota rail on top of `acuerdoToCase`'s `acuerdo` metadata + `useTenantAcuerdos`. Every real-data path stays gated behind `acuerdosApi`'s honest-degrade until the agent's tenant RLS routes land.
- No blockers introduced. `/inquilino/casos` renders unchanged today (`listMine()` → `[]`); it lights up automatically the moment the route returns records.

---
*Phase: v7-07-acuerdos-pago — Plan 03 (wave 2)*
*Completed: 2026-07-20*
