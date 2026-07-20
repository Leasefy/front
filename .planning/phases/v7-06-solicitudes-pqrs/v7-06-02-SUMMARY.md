---
phase: v7-06-solicitudes-pqrs
plan: 02
subsystem: tenant-cases
tags: [pqrs, solicitudes, tenant-case, mapper, aggregator, additive, es-CO, reuse-not-fork, ley-1480]

# Dependency graph
requires:
  - phase: v7-06-01
    provides: "pqrs.types additive fields (CostoResponsable + optional cost/quote), tolerant pqrsApi.listMine() → []"
provides:
  - "Pure, total PQRS mappers on tenant-case.ts (pqrsStatusToTone/Label) reusing PqrsEstado — no fork, no alarm tone (capped at 'attention')"
  - "pqrsToCase: pure projection (reparacion→mantenimiento / else→pqrs), events from source timestamps only, optional TenantCase.solicitud pass-through metadata (no SLA math)"
  - "useTenantPqrs tolerant list hook (mirrors useMyPaymentRequests) sourced from pqrsApi.listMine() → []"
  - "useTenantCases folds PQRS/mantenimiento rows via pqrsToCase — [] → zero rows (hub keeps 'Próximamente'); loading/error/refetch chains extended"
affects: [v7-06-03, v7-06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, TOTAL source-status mapper with assertNever exhaustiveness (mirrors paymentStatusToTone/Label) for the 6-member PqrsEstado"
    - "Normalize-never-compute projection: pqrsToCase carries raw SLA/cost fields on optional solicitud metadata; the SLA estimate is a presentation concern (v7-06-03/04)"
    - "Tolerant list hook (useState list + isLoading + error + refetch, [] on not-live) mirroring useMyPaymentRequests"
    - "Aggregator fold reusing the v7-03 forward-compat seam ('pqrs'/'mantenimiento' already in the union)"

key-files:
  created:
    - src/lib/types/tenant-case.test.ts
    - src/lib/hooks/use-tenant-pqrs.ts
  modified:
    - src/lib/types/tenant-case.ts
    - src/lib/hooks/use-tenant-cases.ts
    - src/lib/hooks/use-tenant-cases.test.ts

key-decisions:
  - "Reuse-not-fork: pqrsStatusToTone/Label consume PqrsEstado imported from pqrs.types; CaseTone stays capped at 'attention' so the type literally cannot express an alarm level (Ley 1480, T-v7-06-06)"
  - "Normalize-never-compute: pqrsToCase passes SLA/cost fields through on TenantCase.solicitud verbatim — it does NOT compute the business-day SLA (presentation-layer concern, wave 3/4)"
  - "Honest empty: listMine() → [] → useTenantCases emits ZERO pqrs rows → the v7-03 hub's 'Próximamente' sections stay intact (T-v7-06-05); no hardcoded/placeholder PQRS array"
  - "Anti-leak projection: TenantCase.solicitud whitelists estado/timestamps + cost/SLA metadata only — no internal responsible-party id, no agency notes (CASO-02, T-v7-06-04)"

patterns-established:
  - "PQRS→case pure mapper set (tone/label/pqrsToCase) + optional solicitud metadata block, reusing the shared entity vocabulary"
  - "Tolerant PQRS list hook composed into the existing case aggregator without new authz surface"

requirements-completed: [SOLI-02, SOLI-03]

# Metrics
duration: ~20min
completed: 2026-07-19
---

# Phase v7-06 Plan 02: PQRS Data Layer → Case Hub Fold Summary

**Wired the PQRS DATA LAYER into the existing v7-03 case hub (SOLI-02 + SOLI-03): pure, total PQRS→case mappers reusing the shared `PqrsEstado` vocabulary (no fork, no alarm tone), a tolerant `useTenantPqrs` list hook, and an aggregator fold that emits real `pqrs`/`mantenimiento` rows when `listMine()` returns entities and ZERO rows when it degrades to `[]` — the mapper normalizes and passes SLA/cost through, never computing the SLA. All unit-tested, build green, zero new npm packages.**

## Performance

- **Duration:** ~20 min (first task commit → SUMMARY)
- **Tasks:** 3
- **Files created:** 2 · **Files modified:** 3

## Accomplishments

- **SOLI-02 (reuse-not-fork mappers):** `tenant-case.ts` gains `pqrsStatusToTone(estado)` and `pqrsStatusToLabel(estado)`, both `switch`-exhaustive with `assertNever` over the 6-member `PqrsEstado` **imported** from `@/lib/api/pqrs.types` (never a parallel enum). Tone caps at `'attention'` for `en_cotizacion`; in-flight states → `info`; terminal → `neutral`. `CaseTone` is unchanged (no alarm member), so the mapper cannot express an alarm color for `reparacion`/urgente (Ley 1480). Labels are factual es-CO (`Recibida`/`Asignada`/`En proceso`/`En cotización`/`Resuelta`/`Cerrada`).
- **SOLI-02 (pure projection + metadata):** `pqrsToCase(s)` mirrors `paymentRequestToCase`'s shape — `type = reparacion ? 'mantenimiento' : 'pqrs'`, `titulo = s.asunto`, `estadoLabel`/`tone` from the mappers, `responsable = 'Inmobiliaria'`, `detailLink = /inquilino/casos/<enc(id)>`, `sourceLink = /inquilino/solicitudes`. Events are built from SOURCE timestamps only (`Recibida` @ `createdAt`; `En cotización` @ `updatedAt` only when `estado==='en_cotizacion'` AND `updatedAt!==createdAt`; `Resuelta` @ `resueltaAt` when present) — nothing synthesized. A new OPTIONAL `TenantCase.solicitud` block carries `{ estado, createdAt, slaVenceAt?, costoResponsable?, cotizacionMonto?, cotizacionId?, cotizacionAprobadaAt? }` as a PASS-THROUGH — **no SLA math here** (the sanctioned estimate is computed in the presentation layer, v7-06-03/04). Internal ids / agency notes are excluded (CASO-02).
- **SOLI-03 (tolerant list hook):** new `use-tenant-pqrs.ts` (`'use client'`) mirrors `useMyPaymentRequests` exactly — `useState<SolicitudPqrs[]>([])` + `isLoading` (init true) + `error`; `fetchPqrs` `useCallback` (`setIsLoading(true)` → `pqrsApi.listMine()` → `setItems`; `catch` → `setError` + `setItems([])`; `finally setIsLoading(false)`); `useEffect(fetchPqrs)`; returns `{ items, isLoading, error, refetch }`. No internal poller — the aggregator owns the single tab-gated refresh.
- **SOLI-03 (aggregator fold):** `use-tenant-cases.ts` composes `useTenantPqrs` and pushes `pqrsToCase(s)` rows in the `useMemo` where the v7-03 comment reserved the seam ("Forward-ref types … emit no rows"). `pqrsRows` added to the memo deps; `pqrsLoading` OR'd into `isLoading`; `pqrsError` appended LAST in the `error ??` chain (pago/aplicacion errors keep priority); `refetchPqrs()` added to the `refetch` `Promise.all` + its `useCallback` deps. `acuerdo`/`contrato` still emit nothing (v7-07). `[]` → zero PQRS rows → the hub's "Próximamente" sections stay (T-v7-06-05).
- **Tests:** `tenant-case.test.ts` (new, 16 tests) proves tone totality (no alarm level across all 6 estados), label totality, type mapping, source-timestamp event build, and metadata pass-through. `use-tenant-cases.test.ts` extended (+6 net, 19 total) with a controllable `use-tenant-pqrs` mock (rows/error/refetch counter): the empty path (0 rows, pago/aplicacion unchanged), the real-rows fold (reparacion→1 mantenimiento, queja→1 pqrs, detailLink/sourceLink), `openCasesCount === cases.length`, tone-within-range across estados, pqrs error surfaces without blanking pago/aplicacion, and refetch joins `Promise.all`.

## Task Commits

Each task committed atomically (explicit-path `git add`, `feat(v7-06):` prefix, not pushed):

1. **Task 1: PQRS→case mappers + solicitud metadata + pqrsToCase (SOLI-02)** — `cbb11c0b` (feat) — `GATE_OK` (16/16 tests, grep gates green: pqrsStatusToTone/Label/pqrsToCase/pqrs.types import/solicitud?, alarm-token count = 0)
2. **Task 2: useTenantPqrs tolerant list hook** — `c1488285` (feat) — `GATE_OK` (useTenantPqrs/listMine/refetch present, useVisibilityPolling count = 0)
3. **Task 3: Fold PQRS rows into useTenantCases + extend test (SOLI-03)** — `f3e1d17a` (feat) — `GATE_OK` (19/19 tests, greps: useTenantPqrs/pqrsToCase/refetchPqrs present)

**Plan metadata:** this SUMMARY committed separately (docs: complete plan).

## Files Created/Modified

- `src/lib/types/tenant-case.ts` (modified) — import `PqrsEstado`/`CostoResponsable`/`SolicitudPqrs`; optional `TenantCase.solicitud` metadata; `pqrsStatusToTone`/`pqrsStatusToLabel`/`pqrsToCase`; updated module header (normalize-never-compute + no-alarm doctrine)
- `src/lib/types/tenant-case.test.ts` (new) — 16 unit tests (SOLI-02 proof)
- `src/lib/hooks/use-tenant-pqrs.ts` (new) — tolerant PQRS list hook
- `src/lib/hooks/use-tenant-cases.ts` (modified) — compose `useTenantPqrs`, fold rows via `pqrsToCase`, extend loading/error/refetch chains + memo deps
- `src/lib/hooks/use-tenant-cases.test.ts` (modified) — controllable PQRS mock; empty-path test rescoped to `mockPqrs=[]`; new `PQRS/mantenimiento fold` describe block

## Decisions Made

- **Reuse-not-fork the vocabulary:** the mappers consume `PqrsEstado` imported from `pqrs.types` — the same entity the agency `/panel/inmobiliaria/pqrs` renders. The fork gate stays empty.
- **No alarm tone by construction:** `pqrsStatusToTone` returns only `neutral|info|attention`; `en_cotizacion` is the ceiling. `CaseTone` has no alarm member, so an alarmist tone is unrepresentable (Ley 1480 / PITFALLS 8). The Task-1 gate is anchored to a returned alarm literal — none is returned, including in comments.
- **Normalize-never-compute:** `pqrsToCase` passes `createdAt`/`slaVenceAt`/cost fields through on `solicitud`; it does NOT call `resolveExpectedResponse`. The sanctioned SLA estimate is a presentation concern for wave 3/4, keeping `tenant-case.ts` a pure projection.
- **Honest empty over fabrication:** the fold loops over `pqrsRows`; when `listMine()` degrades to `[]`, zero rows are emitted and the v7-03 hub keeps its "Próximamente" sections — no hardcoded/placeholder PQRS array ever reaches a real tenant.
- **Error priority preserved:** `pqrsError` is appended LAST in the `??` chain so a pago/aplicacion error keeps priority; a pqrs error surfaces only when the others are null, and never blanks pago/aplicacion rows.

## Deviations from Plan

**None — plan executed exactly as written.** Rules 1–4 not triggered; no auth gates; no package installs; no architectural decisions.

One gate-hygiene note (not a deviation): Task 2's negative gate `grep -c "useVisibilityPolling" == 0` initially tripped because the module header comment referenced `useVisibilityPolling` when describing the poller the hook deliberately avoids. Per the plan's rule 6 (keep forbidden literal tokens out of authored files INCLUDING comments), the comment was rephrased to describe the avoided behavior ("the aggregator owns the single tab-gated refresh, visibility-driven") without the banned token. Gate then green. No production behavior changed.

## Verification

- **`pnpm build`: GREEN** (`BUILD_EXIT=0`, "✓ Compiled successfully"). This is the real gate — repo CI does NOT run `next build`.
- **`pnpm test`: 652 passed / 7 failed (659 total).** The 7 failures are the exact pre-existing baseline documented in wave-1 (`asegurabilidad/nueva/page.test.tsx` ×2, `EquipoAgentes.test.tsx`, `WorkItemDetalle.test.tsx`, `CarrierRegistryTable.test.tsx`, `risk-levels.test.ts` ×2 — cotizador / agent-UI / constants). **Zero NEW failures**, none related to PQRS/tenant-cases. My 22 new/changed tests are within the 652 passing.
- **Per-task gates:** Task 1 `GATE_OK` (16/16, alarm-token count = 0); Task 2 `GATE_OK` (poller-token count = 0); Task 3 `GATE_OK` (19/19).
- **Fork gate:** `grep -rnE "^(export )?(type PqrsEstado|interface SolicitudPqrs)" src --include='*.ts' | grep -v "api/pqrs.types.ts"` → EMPTY.
- **Guardrails honored:** reuse `PqrsEstado`/`CostoResponsable` (no fork); no alarm tone (capped at `attention`); normalize-never-compute (SLA is presentation-layer); `[]` → zero rows (no fabricated cases); own-cases-only (listMine JWT-scoped); no internal ids/agency notes in `TenantCase.solicitud`; es-CO labels; zero new npm packages; not pushed (local commits for the tren de versiones).

## Threat Register Coverage

All `mitigate` dispositions in the plan's `<threat_model>` are implemented:
- **T-v7-06-04** (Info Disclosure, pqrsToCase / TenantCase.solicitud) → projects only estado/role/timestamps + cost/SLA metadata; no internal responsible-party id, no agency notes; `responsable` is a ROLE string, `id` is the opaque source UUID. ✅
- **T-v7-06-05** (Tampering, aggregator) → `listMine()` → `[]` → zero PQRS rows; hub keeps "Próximamente"; no hardcoded/placeholder array; unit-tested both ways. ✅
- **T-v7-06-06** (Compliance / alarm tone, pqrsStatusToTone) → total mapper capped at `'attention'`; `CaseTone` has no alarm level; grep-gated against destructive/danger/alarm/error literals (count = 0). ✅
- **T-v7-06-SC** (supply chain) → N/A: zero new dependencies, no install task. ✅

## Manual Smoke

With `listMine()` returning `[]` today (backend not live), `/inquilino/casos` renders unchanged — the PQRS/mantenimiento "Próximamente" sections stay, no fabricated rows. Confirmed by the unit test `emits zero pqrs/mantenimiento rows when listMine() degrades to []` and the honest-empty fold path.

## Next Phase Readiness

- Waves 3–4 consume exactly what this wave seeds: `pqrsToCase` + `TenantCase.solicitud` (list/detail rendering), `useTenantPqrs` (list page + create wiring), and the presentation-layer SLA estimate (`resolveExpectedResponse` from wave 1) applied over the pass-through metadata. No blockers.
- The v7-03 hub page (`casos/page.tsx`) still shows PQRS/mant as "Próximamente" — it will light up automatically once `listMine()` returns entities; the presentation swap (real rows / link to `/inquilino/solicitudes`) is wave 3's scope.

## Self-Check: PASSED

- `src/lib/types/tenant-case.ts` FOUND (pqrsStatusToTone/pqrsStatusToLabel/pqrsToCase + solicitud? present)
- `src/lib/types/tenant-case.test.ts` FOUND (16 tests green)
- `src/lib/hooks/use-tenant-pqrs.ts` FOUND (useTenantPqrs + pqrsApi.listMine present)
- `src/lib/hooks/use-tenant-cases.ts` FOUND (useTenantPqrs + pqrsToCase + refetchPqrs present)
- `src/lib/hooks/use-tenant-cases.test.ts` FOUND (19 tests green)
- Commits `cbb11c0b`, `c1488285`, `f3e1d17a` FOUND in git log

---
*Phase: v7-06-solicitudes-pqrs*
*Completed: 2026-07-19*
