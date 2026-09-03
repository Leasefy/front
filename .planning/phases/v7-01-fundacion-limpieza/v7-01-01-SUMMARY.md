---
phase: v7-01-fundacion-limpieza
plan: 01
subsystem: ui
tags: [inquilino, dashboard, arriendo, lease, payment-info, pago-01, base-01, single-source-of-truth]

# Dependency graph
requires: []
provides:
  - Tenant dashboard (/inquilino) wired to real useLeases / useLeasePaymentInfo / useTenantApplications
  - Next-payment card renders real amount (paymentInfo.monthlyRent) + due date (derived from paymentInfo.paymentDay, es-CO)
  - Arriendo "Estado general" card driven by real currentPeriodStatus (not the constant "Al día")
affects: [v7-01-02, v7-01-03, v7-01-04, v7-02, v7-03, v7-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dashboard reuses the estado-de-cuenta single source of truth from pagos/page.tsx (no second saldo number)"
    - "No-fabrication next-payment derivation: showNextPaymentCta on currentPeriodStatus NONE|REJECTED, amount = monthlyRent"
    - "Due-date derived from paymentInfo.paymentDay via the pagos/page.tsx:110-111 idiom, formatted es-CO"
    - "Neutral mora framing — currentPeriodStatus mapped to factual labels, no red EN MORA badge / countdown / guilt"

key-files:
  modified:
    - src/app/inquilino/page.tsx
    - src/app/inquilino/arriendo/page.tsx

key-decisions:
  - "Casos abiertos NOT delivered as data in v7-01 (cases hub is v7-03) — neutral non-numeric placeholder, no fabricated count (PITFALLS 1)"
  - "Removed the fabricated '92 - index * 5' % match badge on dashboard property cards — invented data"
  - "Arriendo status card: APPROVED→Al día, PENDING_VALIDATION→En verificación, NONE→Pago pendiente, REJECTED→Pago rechazado — factual tokens, no alarm color"

patterns-established:
  - "Every v7 tenant surface reads lease/payment state from useLeases + useLeasePaymentInfo (the single source), never a self-computed balance"

# Metrics
completed: 2026-07-16
---

# Phase v7-01 Plan 01: Dashboard + Estado de Cuenta con data real

**Wire the tenant dashboard and "Mi Arriendo" overview to the real lease + payment-info hooks that already exist, delete the hardcoded empty arrays / TODO(Backend) / fake match badge / hardcoded "Al día", and honor PAGO-01 single-source + neutral-mora guardrails.**

## Status

**Complete and build-verified.** Commit `94361686`; `pnpm build` re-run green by the orchestrator (Next.js emitted the full route table + legend = successful compile). Both automated grep gates return GATE_OK.

> ⚠️ **Note on provenance:** the gsd-executor that implemented this plan terminated from a mid-response **API error** ("Connection closed") *after* creating the commit but *before* writing this SUMMARY. This summary was reconstructed by the orchestrator from the verified commit, the passing grep gates, and a clean re-run of `pnpm build`. The code change itself is the executor's committed work, independently verified — not re-implemented.

## Accomplishments

- **Dashboard (`inquilino/page.tsx`)** now consumes `useLeases` / `useLeasePaymentInfo` / `useTenantApplications` (+ `useMyPaymentRequests` for an honest loading gate) instead of the hardcoded `activeLeases: any[] = []` / `nextPayment = null` block and its `TODO (Backend)` marker.
- **Next-payment card** shows the real **amount** (`paymentInfo.monthlyRent`) **and due date** (derived from `paymentInfo.paymentDay`, formatted `es-CO`) — satisfies SC #1's "fecha + monto"; falls back to the explore CTA when there is no active lease. No self-computed saldo (PAGO-01).
- **Fabricated `92 - index * 5` "% match" badge removed** from the dashboard property cards.
- **Arriendo `Estado general` card (`inquilino/arriendo/page.tsx`)** is driven by the real `currentPeriodStatus` instead of the constant "Al día / Todos los pagos al día" — a live PAGO-01 / PITFALLS-8 violation that was shipping. Locale fixed `es-CL` → `es-CO`.

## Guardrails honored (verified)

- Single source of truth: amount comes from `paymentInfo.monthlyRent` — no second "saldo total" / "deuda" number (PITFALLS 9).
- Neutral mora framing: status rendered as factual labels, no red "EN MORA" badge, no countdown, no guilt copy (PITFALLS 8).
- Casos abiertos: no fabricated count — neutral placeholder pending v7-03 (PITFALLS 1).

## Verification

- Grep gate (dashboard): no `any[] = []`, no `TODO (Backend)`, `useLeasePaymentInfo` present, no `92 - index` — **GATE_OK**.
- Grep gate (arriendo): `currentPeriodStatus` present, no `es-CL` — **GATE_OK**.
- `pnpm build` — **green** (full route table emitted).

## Deviations from Plan

None known. The executor died before self-reporting; the committed diff matches the plan's grep gates exactly, and the build passes. If a subtle deviation exists it was not caught by the gates — the post-exec verifier (`gsd-verifier`) should confirm the rendered dashboard against SC #1/#2.

## Next Phase Readiness

- Plans 02–04 are independent (disjoint files, `depends_on: []`) and can execute next.
- The single-source pattern established here is what v7-03 (casos hub) and v7-04 (pagos Wompi) will read.
