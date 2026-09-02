---
phase: v7-04-pagos-wompi
plan: 04
subsystem: payments
tags: [autopago, domiciliacion, tokenizacion, wompi, tenant-portal, contract-only, proximamente]

# Dependency graph
requires:
  - phase: v7-04-03
    provides: settled /inquilino/pagos page (Wompi return, history, comprobante) to mount into additively
  - phase: v7-02
    provides: contract-only + honest "Próximamente" idiom (lease-documents.service.ts / EmptyState §11)
provides:
  - "autopagoApi contract (get/enable/cancel) → AutopagoStatus, 403/404/offline → { enabled:false, available:false }"
  - "AutopagoSection: tenant-facing configure/change/cancel UI driven only by the contract; honest 'Próximamente' today"
  - "PAGO-04 satisfied frontend-first: no fabricated activation, token, masked card, or charge on any real-tenant path"
affects: [pagos, tenant-portal, autopago]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backend-owned tokenized recurring charge → api-client contract only; UI degrades to 'Próximamente' via `available` gate"
    - "AlertDialog (role=alertdialog) confirm for the destructive cancel path"
    - "Enabled branch renders ONLY backend-certified data (maskedMethod/nextChargeDate) — no optimistic local flag"

key-files:
  created:
    - src/lib/api/autopago.service.ts
    - src/components/tenant/AutopagoSection.tsx
  modified:
    - src/app/inquilino/pagos/page.tsx

key-decisions:
  - "`available: boolean` is the honesty gate on AutopagoStatus: false (today's reality) forces the 'Próximamente' EmptyState"
  - "enable()/cancel() are real api-client calls (not throwing stubs) that tolerate 403/404/0 → unavailable, so nothing is faked and no 'not implemented' is left"
  - "Enabled-state copy avoids the grep-gated phrases 'autopago activado/activo'; enabled state uses 'Próximo cobro' from contract data only"
  - "Sentence-case buttons per DESIGN.md §4 (reversed the old uppercase-CTA rule)"

patterns-established:
  - "Tokenized/PCI surfaces ship as contract + honest empty-state; the client never mints/persists/masks a payment token"

metrics:
  duration_min: 12
  completed: 2026-07-18
  tasks: 3
  files: 3
---

# Phase v7-04 Plan 04: Autopago tokenizado — contract + honest "Próximamente" Summary

Shipped PAGO-04 (autopago / domiciliación tokenizada) frontend-first: an api-client
**contract** + a tenant **configure/change/cancel UI** that degrades to an honest
**"Próximamente"** because Wompi tokenization, the backend token store, and the recurring
scheduler do not exist yet. Nothing is fabricated on any path a real tenant can reach.

## What was built

### Task 1 — `src/lib/api/autopago.service.ts` (contract only)
- `AutopagoStatus { enabled; maskedMethod?; nextChargeDate?; available }` and
  `EnableAutopagoPayload { leaseId; paymentSourceToken? }`.
- `autopagoApi.get/enable/cancel` hitting `/tenant-payments/autopago[/:leaseId]`
  (GET/POST/DELETE), each wrapped so `ApiError` 403 (not wired) / 404 (route absent) /
  0 (offline) → `{ enabled: false, available: false }`.
- JSDoc marks it a backend/Wompi-owned tokenized recurring charge; the client MUST NOT
  fabricate an enabled state, a token, or a masked PAN. Mirrors the tolerant idiom of
  `lease-documents.service.ts`.

### Task 2 — `src/components/tenant/AutopagoSection.tsx` (UI)
- `'use client'`, props `{ leaseId: string | null }`; fetches `autopagoApi.get(leaseId)` on mount.
- Card (DESIGN.md §4) titled "Autopago" describing the automatic monthly rent debit. Three branches:
  1. `available === false` (today) → honest `EmptyState` (§11) titled **"Próximamente"**. No fake state.
  2. `available && !enabled` → "Activar autopago" CTA calling `autopagoApi.enable({ leaseId })`
     (returns `available:false` until the Wompi flow exists → stays on "Próximamente").
  3. `available && enabled` → shows contract-only `maskedMethod` + `nextChargeDate` and a
     "Cancelar autopago" action behind an `AlertDialog` confirm → `toast.success` + refresh.
- Sentence-case buttons. No optimistic/local "activado" flag; the enabled branch renders only
  backend-certified data.

### Task 3 — `src/app/inquilino/pagos/page.tsx` (mount)
- Imported `AutopagoSection`; mounted in the sidebar `motion.div` below Quick Links with
  `leaseId={primaryLease?.id ?? null}`. Additive — history, Wompi return, and comprobante work
  from v7-04-02/03 untouched.

## Honesty / guardrails

- **No fake activation.** The `available` gate keeps the UI on "Próximamente" until the backend
  certifies both `available:true && enabled:true`. Grep-gated absence of "autopago activado/activo".
- **No fabricated token / masked card / charge date.** These come only from the contract.
- **Zero new npm packages.** Reused EmptyState, Button, AlertDialog, Spinner, sonner, Phosphor.

## Verification

- Task grep gates 1/2/3: all print `GATE_OK`.
- `pnpm build`: **succeeds** (pagos route compiled).
- `pnpm test`: **7 failed / 601 passed** — the 7 are the exact pre-existing failures documented in
  `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (asegurabilidad/nueva, EquipoAgentes,
  WorkItemDetalle, CarrierRegistryTable, risk-levels). **Zero new failures**; none touch autopago/pagos.

## Deviations from Plan

None — plan executed as written. Minor honest-copy choice: the enabled-state uses "Próximo cobro"
(from `nextChargeDate`) and the header stays "Autopago", deliberately avoiding the grep-gated
"autopago activado/activo" phrases while still driving off backend-certified data.

## Threat model (from plan)

- T-v7-04-12 (false "autopago activado"): mitigated — `available` gate + grep-gated absence.
- T-v7-04-13 (payment-source token): mitigated — token is backend/Wompi-side; client never mints/persists/masks it.
- T-v7-04-SC (supply chain): accepted — zero new packages.
