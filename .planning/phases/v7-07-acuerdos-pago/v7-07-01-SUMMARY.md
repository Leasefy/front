---
phase: v7-07-acuerdos-pago
plan: 01
subsystem: api
tags: [acuerdos-pago, cartera, payment-plans, bff, honest-degrade, anti-idor, ley-2300, t-323, vitest]

# Dependency graph
requires:
  - phase: v7-06-pqrs
    provides: "tolerant BFF service idiom (isEndpointUnavailable 404/403/0, *UnavailableError, getMine resolve-from-list)"
  - phase: v7-04-pagos-wompi
    provides: "server-resolved-amount Wompi rail invariants that ACUE-03 pay-cuota will reuse"
provides:
  - "tenant-acuerdos.types.ts — AcuerdoDetail/AcuerdoAcceptResult/AcuerdoInstallment re-exported from the generated agent CarteraPaymentPlan* schemas (single source of saldo, no fork)"
  - "tenant-acuerdos input types AcuerdoAcceptInput (signature + OTP) and PremoraPlanRequestInput (intent-only { leaseId })"
  - "tenant-acuerdos.service.ts — acuerdosApi: listMine→[], getMine resolve-from-list, getCuotaPaymentUrl→null, accept/requestPremoraPlan→AcuerdoUnavailableError; BFF-only, A5/A6 safe"
  - "28 unit tests proving honest-degrade, anti-IDOR, no-optimistic-status, server-provided paymentUrl, intent-only request body"
affects: [v7-07 waves 2-5 (acuerdos list/detail pages, accept panel, pay-cuota route, request-plan modal), use-tenant-acuerdos hook, tenant-case acuerdo fold]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-export the agent's generated OpenAPI record shape as a tenant type alias (never re-declare) — one source of truth for saldo"
    - "Tolerant BFF-forwarded tenant contract: apiClient (NEXT_PUBLIC_BACKEND_URL) only; listMine→[], mutations→typed *UnavailableError, url-fetch→null on 404/403/0; rethrow everything else"
    - "Anti-IDOR getMine via listMine().find (no fetch-by-id); server-provided paymentUrl (no client checkout amount); no client policy/approval"

key-files:
  created:
    - src/lib/api/tenant-acuerdos.types.ts
    - src/lib/api/tenant-acuerdos.service.ts
    - src/lib/api/tenant-acuerdos.service.test.ts
  modified: []

key-decisions:
  - "Re-exported CarteraPaymentPlanDetailResponse/AcceptResponse as AcuerdoDetail/AcuerdoAcceptResult + derived AcuerdoInstallment = AcuerdoDetail['installments'][number] — zero re-declared CarteraPaymentPlan interface (v7-06 fork lesson)"
  - "Every call routes through apiClient/BFF — no direct agent URL, no per-agency operator path, no agency bearer headers (A6, IDOR); banned literals kept out of the file entirely incl. comments so anchored greps cannot false-positive"
  - "No client-side policy/approval/terms logic (A5): accept forwards signature+OTP and returns the agent status verbatim; requestPremoraPlan proposes { leaseId } only"
  - "getCuotaPaymentUrl targets a provisional per-cuota route when cuotaNumber given, else the plan-level url; returns the SERVER paymentUrl, null when not live (no fabricated checkout URL)"

patterns-established:
  - "Provisional tenant RLS routes JSDoc-tagged @provisional (A1-A4) — a wrong path is a one-line change; honest-degrade covers the gap until the agent lands the routes"
  - "getMine resolves own-only from listMine().find — a tenant cannot probe a foreign planId"

requirements-completed: [ACUE-01, ACUE-02, ACUE-03, ACUE-04]

# Metrics
duration: 20min
completed: 2026-07-20
---

# Phase v7-07 Plan 01: Acuerdos Contract Foundation Summary

**Tolerant, BFF-forwarded tenant acuerdos contract — AcuerdoDetail/AcceptResult/Installment re-exported from the agent's single CarteraPaymentPlan* schema (no fork) plus acuerdosApi (listMine→[], getMine resolve-from-list, getCuotaPaymentUrl→null, accept/requestPremoraPlan→AcuerdoUnavailableError), all A5/A6-safe and proven by 28 unit tests.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-20T00:02Z
- **Completed:** 2026-07-20T00:25Z
- **Tasks:** 2
- **Files created:** 3 (types, service, test) — 0 existing files modified

## Accomplishments
- **ACUE-01 foundation:** the acuerdo record shape is re-exported from the generated agent schema (`AcuerdoDetail = CarteraPaymentPlanDetailResponse`, `AcuerdoAcceptResult = CarteraPaymentPlanAcceptResponse`, `AcuerdoInstallment = AcuerdoDetail['installments'][number]`) — one source of truth for saldo, zero re-declared `interface CarteraPaymentPlan*` anywhere in `src`.
- **ACUE-01/02/03/04 tolerant contract:** `acuerdosApi` degrades honestly (`listMine`→`[]`, `getMine` resolve-from-list, `getCuotaPaymentUrl`→`null`, `accept`/`requestPremoraPlan`→`AcuerdoUnavailableError`) on 404/403/0, rethrows every other status — never a fabricated acuerdo / cuota / acceptance / checkout URL.
- **A5 + A6 guardrails locked:** BFF-only via `apiClient` (`NEXT_PUBLIC_BACKEND_URL`) — no direct agent URL, no per-agency operator path, no agency bearer headers; anti-IDOR `getMine` (no fetch-by-id); no client policy/approval/terms logic; server-provided `paymentUrl` only.
- **28 unit tests** (RED→GREEN) covering every behavior bullet incl. 500-rethrow, no-optimistic-accept-status, no-fetch-by-id, and intent-only `{ leaseId }` request body.

## Task Commits

1. **Task 1: tenant-acuerdos.types.ts — RE-EXPORT the agent shape (no fork)** — `a79a6d9c` (feat)
2. **Task 2: tolerant tenant-acuerdos.service.ts + unit tests (ACUE-01/02/03/04)** — `f98a05c4` (feat, TDD RED→GREEN in one per-task commit per orchestrator directive)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified
- `src/lib/api/tenant-acuerdos.types.ts` — re-exports `AcuerdoDetail`/`AcuerdoAcceptResult`/`AcuerdoInstallment` over `components['schemas']['CarteraPaymentPlan*']` + tenant input types `AcuerdoAcceptInput`/`PremoraPlanRequestInput`; JSDoc marks record fields display-only (policy internals never editable).
- `src/lib/api/tenant-acuerdos.service.ts` — `acuerdosApi` tolerant BFF contract with `isEndpointUnavailable` (404/403/0) and `AcuerdoUnavailableError`; provisional routes JSDoc-tagged `@provisional` (A1–A4).
- `src/lib/api/tenant-acuerdos.service.test.ts` — 28 Vitest specs mocking `globalThis.fetch` so `apiClient` throws real `ApiError`s.

## Verification Results

| Gate | Result |
|------|--------|
| Task 1 grep gate (re-export present, no fork, no "por qu" token) | `GATE_OK` |
| Task 2 grep gates (AcuerdoUnavailableError/isEndpointUnavailable/methods present; 0 forbidden A6 literals comment-stripped) | `GREP_GATES_OK` |
| `pnpm test -- tenant-acuerdos.service.test.ts` | 28/28 pass |
| `pnpm build` (next build, TS strict) | EXIT 0 (green; hard gate — repo CI does not run next build) |
| Fork gate `grep -rn "interface CarteraPaymentPlan" src` | EMPTY |
| A6 gate (service comment-stripped: 0 `NEXT_PUBLIC_AGENT_URL` / `agentAuthHeaders` / `/api/agency/`) | 0 |
| `package.json` / `pnpm-lock.yaml` | byte-identical (zero new deps) |
| Full `pnpm test` new failures | 0 attributable (see below) |

## Decisions Made
- **One per-task commit for the TDD task.** The orchestrator directive ("commit per task with a `feat(v7-07):` prefix") took precedence over the RED-commit/GREEN-commit split; the RED→GREEN cycle was still followed during development (RED test ran and failed on the missing import before the service was written).
- **`getMine` uses the standalone `listMine()`** (pqrs.service.ts pattern) rather than `this.listMine()` (RESEARCH pattern snippet) — avoids `this`-binding fragility and matches the shipped in-repo idiom.
- Banned A6 literals were described in comments without the literal tokens (e.g. "per-agency operator route" instead of the `/api/agency/` path) so the anchored greps cannot false-positive on documentation.

## Deviations from Plan

None — plan executed exactly as written. No deviation rules (1–4) were triggered; no auth gates; no architectural changes.

## Issues Encountered
- **Full-suite pre-existing failures (out of scope).** `pnpm test` reports 12 failing tests across 7 files (675 pass / 687 total), all in agency AI / cobranza / cotizador / risk / agent-hook subsystems. This plan's two commits are purely additive (516 insertions, 0 modifications/0 deletions to existing files) and no existing module imports the new `tenant-acuerdos.*` files, so none of these failures are attributable to this plan; the plan's own spec passes 28/28. Logged to `.planning/phases/v7-07-acuerdos-pago/deferred-items.md` (5 of 7 files were already documented pre-existing in v7-01's deferred-items; 2 are later-phase drift).

## User Setup Required
None — no external service configuration required. The tenant RLS routes on `Leasefy/agent` (the HARD cross-repo dependency) remain absent by design; the contract degrades honestly to "Próximamente" until they land.

## Next Phase Readiness
- Waves 2–5 can build the acuerdos list/detail surfaces, accept panel (reusing `SignaturePad` + a generalized `OTPVerification`), the v7-04 pay-cuota rail, and the request-plan modal on top of `acuerdosApi` — every real-data path already gated behind `isEndpointUnavailable`.
- `use-tenant-acuerdos` hook + `tenant-case.ts` `acuerdoToCase` fold (RESEARCH Pattern 4) are the natural next steps; the `'acuerdo'` `CaseType` union member and the casos-hub `ProximamenteSection` seam are already in place.
- No blockers introduced. A1–A4 provisional route shapes firm up to a one-line change each once the agent exposes tenant-scoped RLS routes.

## Self-Check: PASSED

- FOUND: `src/lib/api/tenant-acuerdos.types.ts`
- FOUND: `src/lib/api/tenant-acuerdos.service.ts`
- FOUND: `src/lib/api/tenant-acuerdos.service.test.ts`
- FOUND commit: `a79a6d9c` (Task 1)
- FOUND commit: `f98a05c4` (Task 2)

---
*Phase: v7-07-acuerdos-pago*
*Completed: 2026-07-20*
