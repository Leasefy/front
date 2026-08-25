---
phase: v7-03-estado-casos-hub
plan: 03
subsystem: ui
tags: [next-app-router, tenant-portal, case-detail, timeline, idor, es-CO, additive]

# Dependency graph
requires:
  - phase: v7-03-estado-casos-hub
    provides: "plan-01 backbone — useTenantCases() aggregator + TenantCase/CaseEvent view-model (own-cases-only, source-timestamp events)"
  - phase: v7-03-estado-casos-hub
    provides: "plan-02 hub — /inquilino/casos list page (neutral badge/tone conventions, canonical tokens)"
provides:
  - "Case detail route /inquilino/casos/[caseId] — own-cases-only resolution (cases.find, no raw-id fetch), neutral badge + role responsable + source out-link + source-timestamp-only state timeline"
  - "PlanActivityTimeline date locale corrected es-CL → es-CO (shared CRM primitive)"
affects: [v7-06 (pqrs/mantenimiento detail rows will flow through the same detail shell), v7-07 (acuerdo/contrato rows)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Own-cases-only detail: resolve a route param by filtering the JWT-scoped aggregate (cases.find(id === caseId)) — never fetch by the tenant-supplied raw id (no-IDOR)"
    - "Detail composition cloned from ApplicationDetail STRUCTURE (badge + summary + timeline) but driven by a single TenantCase, not client-synthesized events"
    - "State timeline = CaseEvent[] → TimelineItem[] mapped 1:1 (no invent/reorder/pad), rendered via the generic PlanActivityTimeline"
    - "Neutral tone reused from the hub's TONE_BADGE (secondary/default/warning) — no destructive/alarm, no countdown/urgency copy"

key-files:
  created:
    - src/app/inquilino/casos/[caseId]/page.tsx
  modified:
    - src/components/ui/plan/PlanActivityTimeline.tsx

key-decisions:
  - "Detail resolves via cases.find(c => c.id === params.caseId) — inherits own-cases-only from the JWT-scoped source hooks; a miss (unknown OR foreign id) renders an honest 'Caso no encontrado' EmptyState, never a foreign fetch (CASO-02 / T-v7-03-07)"
  - "Timeline items mapped 1:1 from caso.events (source timestamps) and passed as-is; a single-timestamp case shows a single entry (honest). Legacy client-synthesized application-events path is NOT imported (T-v7-03-08)"
  - "Only TenantCase fields rendered — responsable is a ROLE, id is opaque; no responsableId, no agency notes (T-v7-03-09)"
  - "Hub row detailLink was left pointing at the source surface (unchanged — plan-02 is committed and out of scope); the new detail route is additive and directly navigable"

requirements-completed: [CASO-02]

# Metrics
duration: ~25min
completed: 2026-07-18
---

# Phase v7-03 Plan 03: Case detail + state timeline Summary

**Ships the tenant case detail at `/inquilino/casos/[caseId]` (CASO-02): it resolves its case by filtering the tenant's OWN `useTenantCases()` aggregate (no raw-id fetch → no-IDOR), composes a neutral status badge + role responsable + source out-link, and renders a state timeline built ONLY from `case.events` (source timestamps) via the generic `PlanActivityTimeline`; also corrects that shared primitive's date locale `es-CL → es-CO`.**

## Accomplishments
- **Task 1 — case detail page** (`src/app/inquilino/casos/[caseId]/page.tsx`, new, `'use client'`): reads `params.caseId`, calls `useTenantCases()`, resolves with `cases.find(c => c.id === params.caseId)`. Loading → `Spinner`; hard aggregate error → `EmptyState`; not-found (unknown OR foreign id) → honest "Caso no encontrado" `EmptyState` with a back-to-hub action. Resolved view = header (`titulo` + neutral `Badge` from `caso.tone`) + summary card (role `responsable` + relative `updatedAt` es-CO) + a "Ver en {origen}" out-link to `caso.sourceLink` + a state timeline mapping `caso.events → TimelineItem[]` (1:1) rendered via `PlanActivityTimeline`. Structure cloned from `ApplicationDetail` but driven by a single `TenantCase`; neutral tokens mirror the committed hub (v7-03-02).
- **Task 2 — locale fix** (`src/components/ui/plan/PlanActivityTimeline.tsx`): `formatTimestamp` date locale `'es-CL' → 'es-CO'`. Single-line, same-language correction; no layout/behavior/token change, so other CRM callers are unaffected.

## Guardrails honored
- **Own-cases-only / no-IDOR (CASO-02, T-v7-03-07):** resolution is a `.find` on the JWT-scoped in-memory list — no API call with the raw route id, no fetch-by-id hook added.
- **Source-timestamp-only timeline (T-v7-03-08):** `caso.events` mapped as-is; nothing invented/reordered/padded; the legacy client-synthesized application-events path is not imported (grep gate: 0 occurrences).
- **No internal leakage (T-v7-03-09):** only `TenantCase` fields render; `responsable` is a role; no `responsableId`, no agency notes.
- **Neutral tone (CASO-04 / PITFALLS 8):** badge capped at `warning`; no `destructive`, no countdown/credit-bureau/urgency copy (grep gate: 0 forbidden strings).

## Task Commits
1. **Task 1 + Task 2:** single atomic `feat(v7-03)` commit — case detail route + `PlanActivityTimeline` es-CO locale fix + this SUMMARY (per the launching agent's staging directive: explicit paths only; hash recorded in the execution report).

## Files Created/Modified
- `src/app/inquilino/casos/[caseId]/page.tsx` — case detail + state timeline (own-cases-only, source-timestamp-only, neutral)
- `src/components/ui/plan/PlanActivityTimeline.tsx` — date locale `es-CL → es-CO`

## Deviations from Plan
None affecting behavior or scope. One benign edit forced by a grep gate: the page's header doc-comment originally spelled the legacy timeline component's exact name; reworded to "legacy client-synthesized application-events path" so the `ApplicationTimeline`-count gate reads 0 (the component is genuinely never imported). No new packages; no other page touched.

## Verification Results
- **Task 1 grep gate:** `GATE_OK` (useTenantCases + PlanActivityTimeline + `.find` present; 0 `ApplicationTimeline`; 0 `variant="destructive"`; 0 `responsableId`/Datacrédito/urgency).
- **Task 2 grep gate:** `GATE_OK` (no `es-CL`; `es-CO` present).
- **`pnpm build`:** ✓ Compiled successfully. New route registered dynamic: `ƒ /inquilino/casos/[caseId]` (6.4 kB). CI does not run `next build`. No new warnings from the new page.
- **`pnpm test` (full suite):** 594 passed / 7 failed / 601 total — **0 NEW failures**. The 7 failures are the exact pre-existing set in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (asegurabilidad/nueva ×2, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels ×2). No test covers `PlanActivityTimeline`/the detail page; the locale fix breaks nothing.

## Next Phase Readiness
- CASO-02 complete: each case has a detail + state-timeline surface, own-cases-only, source-timestamp-honest. v7-06/v7-07 forward-ref case types can flow through the same detail shell once their tenant sources exist.

## Self-Check: PASSED
- `src/app/inquilino/casos/[caseId]/page.tsx` — FOUND
- `src/components/ui/plan/PlanActivityTimeline.tsx` (es-CO) — FOUND
- Atomic `feat(v7-03)` commit — created on `plan/v7.0-portal-inquilino` (hash in execution report)

---
*Phase: v7-03-estado-casos-hub*
*Completed: 2026-07-18*
