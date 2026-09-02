---
phase: v7-06-solicitudes-pqrs
plan: 01
subsystem: api
tags: [pqrs, solicitudes, sla, business-days, contract-first, additive, es-CO, ley-820]

# Dependency graph
requires:
  - phase: v7-05-comunicacion
    provides: "PQRS_SLA_BUSINESS_DAYS = 15 shared constant (response-sla.ts) reused by the business-day clock"
provides:
  - "Shared PQRS entity extended additively (CostoResponsable + optional costoResponsable/cotizacionMonto/cotizacionAprobadaAt) — no fork; PqrsEstado/SolicitudPqrs declared exactly once"
  - "Pure weekday-only addBusinessDays + two-tier resolveExpectedResponse (authoritative slaVenceAt ?? createdAt+15biz estimate, never blank)"
  - "Tolerant pqrs.service.ts: listMine→[], getMine resolve-from-list (anti-IDOR), create/approveCotizacion→PqrsUnavailableError; NuevaSolicitudInput (no solicitanteTipo)"
affects: [v7-06-02, v7-06-03, v7-06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isEndpointUnavailable (404/403/0) honest-degrade idiom on pqrs.service.ts (copied verbatim from lease-documents.service.ts)"
    - "Resolve-from-list detail (getMine → listMine().find) — own-only, no raw fetch-by-id (anti-IDOR)"
    - "Pure, non-mutating weekday-only date math (no holiday table, ROADMAP:135 'sin festivos'), TZ-robust unit tests"
    - "Additive optional fields on a shared multi-actor entity (reuse-not-fork)"

key-files:
  created:
    - src/lib/date/business-days.ts
    - src/lib/date/business-days.test.ts
    - src/lib/api/pqrs.service.ts
    - src/lib/api/pqrs.service.test.ts
  modified:
    - src/lib/api/pqrs.types.ts

key-decisions:
  - "Reuse-not-fork: pqrs.types.ts gains ONLY optional additive fields; the agency /panel/inmobiliaria/pqrs keeps the identical estado vocabulary (SOLI-02 crux, grep-gated)"
  - "Interim SLA is weekday-only (skips Sat/Sun, NO holiday table) and labeled by an `estimated` flag; authoritative slaVenceAt (M1 engine) always wins — never blank"
  - "getMine resolves from listMine() (own-only) instead of GET /pqrs/:id → no IDOR; create/approveCotizacion throw PqrsUnavailableError, never fabricate a radicado or a fake 'aprobado'"
  - "solicitanteTipo is absent from NuevaSolicitudInput — the server assigns 'inquilino' from the JWT; the client never claims it"

patterns-established:
  - "Pattern 1: tolerant contract-only api-client for a not-live PQRS route ([] / PqrsUnavailableError, never fabrication)"
  - "Pattern 2: pure business-day estimate reusing the shared SLA constant, two-tier authoritative-vs-estimate resolver"

requirements-completed: [SOLI-01, SOLI-02, SOLI-03, SOLI-04]

# Metrics
duration: ~25min
completed: 2026-07-19
---

# Phase v7-06 Plan 01: Solicitudes / PQRS — Contract Foundation Summary

**Landed the v7-06 wave-1 foundation: the shared PQRS entity extended additively (no fork), a pure weekday-only business-day SLA helper (two-tier authoritative-vs-estimate, never blank), and a tolerant `pqrs.service.ts` contract (honest `[]` / `PqrsUnavailableError`, own-only `getMine`, no fabricated radicado) — all unit-tested, zero new npm packages.**

## Performance

- **Duration:** ~25 min (first task commit → SUMMARY)
- **Started:** 2026-07-19T21:29Z (approx)
- **Completed:** 2026-07-19T21:35Z
- **Tasks:** 3
- **Files created:** 4 · **Files modified:** 1

## Accomplishments

- **SOLI-02 foundation (reuse-not-fork):** `pqrs.types.ts` gains `export type CostoResponsable = 'dueno' | 'inquilino' | 'compartido'` (Ley 820, backend-sourced) and three OPTIONAL fields on the existing `SolicitudPqrs` (`costoResponsable?`, `cotizacionMonto?`, `cotizacionAprobadaAt?`). Existing fields were neither touched nor reordered; the agency-consumed exports (`ResumenPqrs`, `RESUMEN_PQRS_VACIO`, `PqrsListResponse`) are unchanged. The fork gate confirms `PqrsEstado`/`SolicitudPqrs` are declared exactly once.
- **SOLI-03 foundation (pure SLA clock):** new `src/lib/date/business-days.ts` — `addBusinessDays(from, n)` copies its input (never mutates), advances one calendar day at a time and counts only weekdays (skips Sat/Sun), with NO holiday table (ROADMAP:135 "sin festivos"). `resolveExpectedResponse(createdAtIso, slaVenceAtIso?)` returns `{ date, estimated }`: authoritative `slaVenceAt` wins (`estimated:false`), else the `createdAt + PQRS_SLA_BUSINESS_DAYS` estimate (`estimated:true`) — never blank. Reuses the shared constant; zero new packages.
- **SOLI-01/04 foundation (tolerant contract):** new `src/lib/api/pqrs.service.ts` modeled 1:1 on `lease-documents.service.ts` — `isEndpointUnavailable(404/403/0)` verbatim, `PqrsUnavailableError`, and `pqrsApi = { listMine, getMine, create, approveCotizacion }`. `listMine` → `[]` on not-live (honest empty, never fabricated rows), rethrows other status; `getMine` resolves from `listMine()` (own-only, no raw fetch-by-id → anti-IDOR); `create`/`approveCotizacion` throw `PqrsUnavailableError` on not-live (no fabricated radicado, no fake "aprobado"), rethrow other status. `NuevaSolicitudInput` omits `solicitanteTipo` (server-assigned from the JWT).
- **Tests:** 9 unit tests for the SLA helper (weekday-skip, non-mutation, days=0, two-tier resolver, no-holiday) + 19 unit tests for the service (200/404/403/0/500 across all four methods, resolve-from-list, never-fetch-by-id assertion). All 28 green.

## Task Commits

Each task was committed atomically (explicit-path `git add`, `feat(v7-06):` prefix, not pushed):

1. **Task 1: Extend shared pqrs.types.ts additively (reuse, not fork)** — `ba4907b5` (feat) — `GATE_OK`
2. **Task 2: Pure business-day SLA helper + tests (SOLI-03)** — `609cd9e6` (feat) — `GATE_OK` (9/9 tests)
3. **Task 3: Tolerant pqrs.service.ts contract + tests (SOLI-01/02/04)** — `14c499b4` (feat) — `GATE_OK` (19/19 tests, anti-IDOR grep clean)

**Plan metadata:** this SUMMARY committed separately (docs: complete plan).

## Files Created/Modified

- `src/lib/api/pqrs.types.ts` (modified) — `CostoResponsable` type + 3 optional additive fields on `SolicitudPqrs`; no fork, agency exports untouched
- `src/lib/date/business-days.ts` (new) — pure `addBusinessDays` (weekday-only, non-mutating) + `ExpectedResponse` + two-tier `resolveExpectedResponse`, reuses `PQRS_SLA_BUSINESS_DAYS`
- `src/lib/date/business-days.test.ts` (new) — 9 TZ-robust unit tests
- `src/lib/api/pqrs.service.ts` (new) — tolerant `pqrsApi` + `PqrsUnavailableError` + `NuevaSolicitudInput`
- `src/lib/api/pqrs.service.test.ts` (new) — 19 unit tests mocking `globalThis.fetch`

## Decisions Made

- **Reuse-not-fork the entity:** optional additive fields on the shared `pqrs.types.ts` keep the single contract the agency already renders. A grep gate forbids any second `PqrsEstado`/`SolicitudPqrs` declaration.
- **Two-tier, weekday-only SLA:** authoritative `slaVenceAt` from the M1 triage engine always wins; the interim estimate is deliberately optimistic (no holidays) and is flagged `estimated:true` so callers label it "estimado" and soft-frame it ("hacia el …"), never "vence el …".
- **Anti-IDOR by construction:** `getMine` filters the JWT-scoped `/pqrs/mine` list rather than fetching a raw id, so a tenant cannot probe a foreign id. Create/approve throw on not-live so no radicado/status is ever client-fabricated.

## Deviations from Plan

**1. [Rule 1 — Bug avoidance] TZ-robust date tests instead of the plan's illustrative bare-ISO example.**
- **Found during:** Task 2 (writing `business-days.test.ts`).
- **Issue:** The plan's `<behavior>` illustrates `addBusinessDays(new Date('2026-07-17'/*Fri*/), 1)`. In this environment (`America/Bogota`, UTC-5), a bare ISO date string parses as UTC midnight and shifts to the *previous* local calendar day (`new Date('2026-07-17').getDay()` → 4/Thursday, not 5/Friday). A literal test of that expression would assert the wrong weekday and fail.
- **Fix:** Weekday-assertion tests construct dates with the local-time constructor `new Date(2026, 6, 17)` (deterministic `getDay()` regardless of TZ); the `resolveExpectedResponse` tests use full ISO instants, which are TZ-safe because both sides parse identically. Every `<behavior>` bullet is still covered (Fri+1biz→Mon, +15 lands on a weekday, non-mutation, days=0, two-tier preference, no-holiday-skip). The helper `business-days.ts` itself matches the plan's `<action>` verbatim.
- **Files modified:** `src/lib/date/business-days.test.ts` (test-only; production helper unchanged from spec).
- **Commit:** `609cd9e6`.

No other deviations. Rules 1–3 otherwise not triggered; no architectural (Rule 4) decisions; no auth gates; no package installs.

## Issues Encountered

- The negative anti-IDOR grep gate on `pqrs.service.ts` (`grep -c "apiClient.get(\`?/pqrs/\${" == 0`) required keeping the forbidden `apiClient.get`+templated-`/pqrs/` literal out of the file entirely, including JSDoc. The anti-IDOR behavior is described in prose ("no raw fetch-by-id") without the banned token, so the gate stays clean. Passed first try (`GREP_OK`).

## Verification

- **`pnpm build`: GREEN** (EXIT=0, "✓ Compiled successfully"). This is the real gate — repo CI does NOT run `next build`.
- **`pnpm test`: 629 passed / 7 failed (636 total).** The 7 failures are the exact pre-existing baseline documented in v7-01 `deferred-items.md` — `asegurabilidad/nueva/page.test.tsx`, `EquipoAgentes.test.tsx`, `WorkItemDetalle.test.tsx`, `CarrierRegistryTable.test.tsx`, `risk-levels.test.ts` (cotizador / agent-UI / constants). **Zero NEW failures**, none related to PQRS/SLA. My 28 new tests are within the 629 passing.
- **Per-task gates:** Task 1 `GATE_OK`; Task 2 `GATE_OK` (9/9); Task 3 `GATE_OK` (19/19, anti-IDOR grep count = 0).
- **Fork gate:** `grep -rnE "^(export )?(type PqrsEstado|interface SolicitudPqrs)" src --include='*.ts' | grep -v "api/pqrs.types.ts"` → EMPTY.
- **Guardrails honored:** no fork; SLA weekday-only + never blank + `estimated`-flagged; own-only `getMine` (no GET /pqrs/:id); no fabricated radicado/status; `solicitanteTipo` server-authoritative (absent from client input); es-CO; zero new npm packages; not pushed (local commits for the tren de versiones).

## Threat Register Coverage

All `mitigate` dispositions in the plan's `<threat_model>` are implemented:
- **T-v7-06-01** (Tampering, create/approve) → `PqrsUnavailableError` on 404/403/0, never a fabricated radicado/aprobado. ✅
- **T-v7-06-02** (Info Disclosure, getMine) → resolve-from-list, no fetch-by-id (grep-gated). ✅
- **T-v7-06-03** (Spoofing/EoP, input) → `solicitanteTipo` absent from `NuevaSolicitudInput`. ✅
- **T-v7-06-04** (Tampering, listMine) → `[]` on not-live, other errors rethrown (not swallowed). ✅
- **T-v7-06-SC** (supply chain) → N/A: zero new dependencies, no install task. ✅

## User Setup Required

None. The PQRS routes (`POST /pqrs`, `GET /pqrs/mine`, `POST /pqrs/:id/aprobar-cotizacion`) and the real `slaVenceAt` are a disclosed external dependency (NestJS/agent, M1). Until they land, `listMine` returns `[]`, create/approve throw `PqrsUnavailableError`, and the SLA shows the `estimated` interim — the honest frontend-first posture by design.

## Next Phase Readiness

- Wave 1 seeds exactly the seams waves 2–4 consume: the extended entity (v7-06-02/03/04), the pure SLA resolver (detail timeline), and the tolerant service (list/create/approve wiring + `useTenantCases` fold). No blockers.
- Assumptions A1/A4 (exact backend paths) remain provisional and are a one-line change when the routes land.

## Self-Check: PASSED

- `src/lib/api/pqrs.types.ts` FOUND (CostoResponsable + costoResponsable/cotizacionMonto/cotizacionAprobadaAt present)
- `src/lib/date/business-days.ts` FOUND (addBusinessDays + resolveExpectedResponse + PQRS_SLA_BUSINESS_DAYS present)
- `src/lib/date/business-days.test.ts` FOUND (9 tests green)
- `src/lib/api/pqrs.service.ts` FOUND (PqrsUnavailableError + isEndpointUnavailable + listMine/getMine/create/approveCotizacion present)
- `src/lib/api/pqrs.service.test.ts` FOUND (19 tests green)
- Commits `ba4907b5`, `609cd9e6`, `14c499b4` FOUND in git log

---
*Phase: v7-06-solicitudes-pqrs*
*Completed: 2026-07-19*
