---
phase: v7-07-acuerdos-pago
plan: 07
subsystem: tenant-ui
tags: [acuerdos-pago, premora, request-plan, propose-not-set, honest-degrade, ley-2300, ley-1266, t-323, a5, lenis-modal, acue-04]

# Dependency graph
requires:
  - phase: v7-07-acuerdos-pago
    plan: 01
    provides: "acuerdosApi.requestPremoraPlan({ leaseId }) + AcuerdoUnavailableError (tolerant BFF contract, intent-only body)"
  - phase: v7-07-acuerdos-pago
    plan: 04
    provides: "/inquilino/acuerdos read-only list surface (useTenantAcuerdos + refetch) that this plan adds the mutation CTA onto"
provides:
  - "SolicitarPlanPagoModal — intent-only propose Dialog (leaseId resolved from prop or primary active lease + one OPTIONAL neutral note); T-323 notice 'Los términos los define y aprueba tu inmobiliaria'; NO amount/cuotas/first-date/discount/consequence editor, NO arrears-cause field, NO credit-bureau copy; requestPremoraPlan → AcuerdoUnavailableError → honest 'Próximamente' (form intact); Lenis-safe; sentence-case"
  - "'Solicitar un plan de pago' CTA (header + empty state) on /inquilino/acuerdos opening SolicitarPlanPagoModal with onRequested=refetch"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Intent-only tenant proposal modal: the body is { leaseId } only (never terms) — the tenant proposes, the agency + agent's requiresHumanReview() decide (T-323, A5)"
    - "PayRentModal/NuevaSolicitudModal shell reuse: AnimatePresence backdrop (fixed inset-0 z-50), useLenis().stop()/start() (DESIGN §8), data-lenis-prevent scroll body, Button isLoading, toast, sentence-case (DESIGN §4)"
    - "Legal-token exclusion by construction: the two authored files keep 'por qué'/'motivo'/'razón'/'central'/bureau/'descuento'/'número de cuotas' out entirely (incl. comments) so anchored greps stay at 0"

key-files:
  created:
    - src/components/tenant/SolicitarPlanPagoModal.tsx
  modified:
    - src/app/inquilino/acuerdos/page.tsx

key-decisions:
  - "The modal resolves its own primary lease via useLeases().getActive()[0] (leaseId prop optional) — the list page does NOT import useLeases, so no leaseId prop is passed from /inquilino/acuerdos (the page 'does not already have it')"
  - "The empty-state CTA is a real Button rendered below the EmptyState card (not the EmptyState.action slot, which is href-only and cannot open a modal); the header carries the primary CTA"
  - "The optional note is captured in the UI but the submitted body stays intent-only { leaseId } (PremoraPlanRequestInput from v7-07-01 is { leaseId } only) — the note rides along once the tenant route accepts it; today every submit degrades to 'Próximamente' so nothing is silently dropped on a real path"
  - "Forbidden legal tokens kept out of comments too (per orchestrator directive) — e.g. 'discount'/'cuota-count'/'credit-bureau' in English prose, never the banned Spanish literals"

patterns-established:
  - "A tenant 'propose, never set' mutation modal that mirrors the agency fail-soft propose lifecycle WITHOUT copying its terms/consequence editors"

requirements-completed: [ACUE-04]

# Metrics
duration: 15min
completed: 2026-07-20
---

# Phase v7-07 Plan 07: Solicitar Plan de Pago (ACUE-04) Summary

**The tenant can now REQUEST a pre-mora payment plan from `/inquilino/acuerdos` — a `SolicitarPlanPagoModal` that PROPOSES intent only (the lease id, resolved from the primary active lease, plus one OPTIONAL neutral note) and NOTHING that sets terms: no amount, no cuota count, no first date, no discount, no consequence editor, no arrears-cause field (Ley 2300/2023 art. 7) and no credit-bureau copy (Ley 1266/2008 + 2157/2021). A factual T-323 notice states "Los términos los define y aprueba tu inmobiliaria"; submit calls `acuerdosApi.requestPremoraPlan({ leaseId })` and, because the tenant-initiated route is not live, degrades honestly to a "Próximamente" toast with the form intact — never a fabricated plan or radicado. A sentence-case "Solicitar un plan de pago" CTA in the list header and empty state opens it.**

## Performance
- **Duration:** ~15 min
- **Tasks:** 2 (both `type="auto"`)
- **Files created:** 1 · **Files modified:** 1

## Accomplishments
- **Task 1 — SolicitarPlanPagoModal (ACUE-04, T-323 + PITFALLS 4/5).** A Lenis-safe Dialog copied from the `PayRentModal` / `NuevaSolicitudModal` shell (`AnimatePresence` backdrop `fixed inset-0 z-50`, `useLenis().stop()/start()` per DESIGN §8, `data-lenis-prevent` scroll body, `Button isLoading`, `toast`). Props `{ open; onClose; onRequested?; leaseId? }`. Body = a primary-soft T-323 notice ("Estás proponiendo un plan de pago. Los términos los define y aprueba tu inmobiliaria."), a read-only summary of the arriendo (resolved from the `leaseId` prop or `useLeases().getActive()[0]`), and ONE optional free-text note ("¿Algo que quieras contarle a tu inmobiliaria?"). Submit → `acuerdosApi.requestPremoraPlan({ leaseId })`; success → `toast.success` + `onRequested?.()` + `onClose()`; `AcuerdoUnavailableError` → honest `toast.info` ("Estamos habilitando las solicitudes de plan de pago. Vuelve a intentarlo pronto.") with the form intact; other errors → generic retry toast. Sentence-case buttons, inline es-CO copy. **NO amount / cuotas / first-date / discount / consequence selector, NO arrears-cause field, NO credit-bureau copy.**
- **Task 2 — list CTA (ACUE-04).** `/inquilino/acuerdos/page.tsx` gains `import { useState }`, `Button`, `SolicitarPlanPagoModal`, a `refetch` from `useTenantAcuerdos`, and a `requestOpen` state. A prominent sentence-case "Solicitar un plan de pago" / "Request a payment plan" `Button` sits in the header (flex row beside the title) and again below the empty-state card, both toggling the modal. `<SolicitarPlanPagoModal open={requestOpen} onClose={…} onRequested={refetch} />` is rendered once. No terms/consequence/bureau UI was added; the row rendering and detail wiring were untouched; the neutral, no-bureau posture is preserved.

## Task Commits
1. **Task 1: SolicitarPlanPagoModal — intent-only propose (ACUE-04)** — `99371de5` (feat)
2. **Task 2: "Solicitar un plan de pago" CTA on acuerdos list (ACUE-04)** — `1cb1ec67` (feat)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified
- `src/components/tenant/SolicitarPlanPagoModal.tsx` **(new)** — intent-only propose modal; T-323 notice; leaseId + optional note; honest "Próximamente" on `AcuerdoUnavailableError`; Lenis-safe shell; sentence-case buttons.
- `src/app/inquilino/acuerdos/page.tsx` **(modified)** — header + empty-state CTA opening the modal; `refetch` wired to `onRequested`; read-only list posture unchanged.

## Verification Results

| Gate | Result |
|------|--------|
| Task 1 grep gate (`requestPremoraPlan` + `AcuerdoUnavailableError` + `data-lenis-prevent` + `aprueba tu inmobiliaria` present; 0 forbidden tokens comment-stripped) | `GATE_OK` |
| Task 2 grep gate (`SolicitarPlanPagoModal` + `Solicitar un plan`/`Request a payment plan` present; 0 `por qué`/`central`/`reportar_centrales` comment-stripped) | `GATE_OK` |
| Ley-2300/1266 combined gate (both files, comment-stripped: `por qué\|motivo\|razón\|central\|datacrédito\|transunion\|reporte\|reportar_centrales\|descuento\|número de cuotas`) | 0 / 0 |
| `pnpm build` (next build, TS strict) | **EXIT 0 (green)** — `/inquilino/acuerdos` 13.7 kB (was 8.2 kB) |
| Full `pnpm test` | 710 pass / 7 fail (5 files) — **0 new failures** (identical to the v7-07-04 baseline; all agency-side AI/cobranza/cotizador/risk; none import the modal or acuerdos page) |
| `package.json` / `pnpm-lock.yaml` | unchanged (zero new deps) |

## Decisions Made
- **Modal self-resolves the lease.** The plan says "pass the primary `leaseId` if the page already has it" — the acuerdos list does not import `useLeases`, so no `leaseId` prop is passed and the modal resolves the primary active lease itself (`getActive()[0]`). Cleaner and avoids adding a lease fetch to the list page.
- **Empty-state CTA is a real Button, not the `EmptyState.action` slot.** `EmptyState.action` is `{ label, href }` (renders a `next/link`) and cannot open a modal, so the "repeat in the empty state" CTA is a `Button` rendered below the EmptyState card. The header holds the primary CTA.
- **Optional note captured, body stays intent-only.** `PremoraPlanRequestInput` (v7-07-01) is `{ leaseId }` only, so the submitted body carries just the lease id; the note is a forward-looking UI affordance. Because the tenant route is not live, every submit today degrades to "Próximamente" — nothing is silently dropped on a real path.

## Deviations from Plan
None — plan executed exactly as written. No deviation rules (1–4) triggered; no auth gates; no architectural changes.

## Threat Model Coverage
- **T-v7-07-23 (Elevation of Privilege — T-323, A5) — mitigated.** Intent-only: NO amount/cuotas/discount/first-date/consequence editor (grep-gated to 0). The tenant proposes; the agent's `requiresHumanReview()` + the agency approve. T-323 notice: "los define y aprueba tu inmobiliaria".
- **T-v7-07-24 (Compliance — Ley 2300 art. 7) — mitigated.** NO arrears-cause field of any kind (grep-gated to 0). Only a leaseId + an OPTIONAL neutral contact-preference note.
- **T-v7-07-25 (Compliance — Ley 1266/2008 + 2157/2021) — mitigated.** NO credit-bureau / `reportar_centrales` copy (grep-gated to 0); the agency consequence select is NOT reproduced in the tenant form.
- **T-v7-07-26 (Tampering — request lifecycle) — mitigated.** `AcuerdoUnavailableError` → honest "Próximamente" with the form intact; NEVER a fabricated plan/radicado on a real-tenant path (PITFALLS 5).
- **T-v7-07-SC (supply chain) — accept.** Zero new npm dependencies (`package.json`/lockfile unchanged).

## Threat Flags
None — no new network endpoints, auth paths, file access, or schema changes at trust boundaries. This surface adds a mutation entry point that routes through the existing `acuerdosApi.requestPremoraPlan` contract (v7-07-01), which is BFF-forwarded and gated.

## Known Stubs
None that block ACUE-04. The propose route (`POST /cartera/payment-plans/request`) is not live on `Leasefy/agent`, so `requestPremoraPlan` degrades to `AcuerdoUnavailableError` → an honest "Próximamente" toast (the form stays intact). This is the documented gated posture (RESEARCH "Real vs. Gated"), not a stub hiding a broken goal — the CTA + modal light up automatically once the tenant-initiated route lands. The optional note is a forward-looking field carried in the UI (body stays `{ leaseId }` per the v7-07-01 type until the route accepts it).

## Issues Encountered
- **Full-suite pre-existing failures (out of scope).** `pnpm test` reports 7 failing tests across 5 files — `asegurabilidad/nueva`, `EquipoAgentes`, `WorkItemDetalle`, `CarrierRegistryTable`, `risk-levels`, all agency-side AI/cobranza/cotizador/risk. This is byte-identical to the v7-07-04 documented baseline; none import the modal or the acuerdos page, and this plan adds no test files, so **0 new failures are attributable to this plan**. Already tracked in `.planning/phases/v7-07-acuerdos-pago/deferred-items.md`.

## User Setup Required
None. The tenant-initiated propose route on `Leasefy/agent` remains absent by design; the modal degrades honestly to "Próximamente" until it lands.

## Next Phase Readiness
- **Phase-complete (LAST plan).** ACUE-01/02/03/04 all delivered across v7-07-01..07 (contract, hooks/fold, list, detail+accept, request). The tenant acuerdos surface ships its full UI + contracts + honest degrade; real settlement lights up when `Leasefy/agent` exposes tenant RLS routes.
- Plan 06 (the cuota Wompi route) runs after this one and was untouched here.
- No blockers introduced.

## Self-Check: PASSED
- FOUND: `src/components/tenant/SolicitarPlanPagoModal.tsx`
- FOUND: `src/app/inquilino/acuerdos/page.tsx`
- FOUND commit: `99371de5` (Task 1)
- FOUND commit: `1cb1ec67` (Task 2)

---
*Phase: v7-07-acuerdos-pago — Plan 07 (wave 4)*
*Completed: 2026-07-20*
