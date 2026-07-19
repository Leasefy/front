---
phase: v7-04-pagos-wompi
plan: 02
subsystem: payments
tags: [wompi, pse-mock-removal, hosted-checkout, anti-tamper, pago-02, pago-05, shared-modal]

# Dependency graph
requires:
  - "v7-04-01: POST /api/inquilino/pagos/wompi-session + client-safe buildWompiCheckoutUrl/WompiRentSession"
provides:
  - "PayRentModal rewired to the Wompi hosted-checkout seam (PSE-mock in-page form removed)"
affects: [v7-04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client trigger copies WompiPayButton idiom: fetch session route → build URL → window.location.href"
    - "Anti-tamper: client POSTs only { leaseId } + forwarded Bearer; server owns the amount"

key-files:
  created: []
  modified:
    - src/components/tenant/PayRentModal.tsx

key-decisions:
  - "Dropped the client-sent amount (PayRentModal:173) and the whole psePaymentsApi PSE form/process/result flow"
  - "Step machine reduced to loading | period-blocked | confirm | redirecting (removed form/processing/result)"
  - "onPaid/prefill kept in the props interface for source-compat with both call sites but no longer destructured/invoked (success is confirmed server-side on Wompi return, v7-04-03)"
  - "Confirm step shows ONLY the real monthlyRent — no fabricated cuota-de-manejo/recargo/adminFee line"

completed: 2026-07-18
---

# Phase v7-04 Plan 02: Swap the /pse-mock seam — PayRentModal → Wompi hosted checkout

**The shared `PayRentModal` (rendered by both `/inquilino/pagos` and `/inquilino/arriendo/[leaseId]`) no longer collects PSE bank/payer data or sends a client-side amount — it POSTs `{ leaseId }` (with the tenant Bearer) to the v7-04-01 route, builds the hosted-checkout URL with the tested `buildWompiCheckoutUrl`, and full-page redirects to `checkout.wompi.co`.**

## Status

Complete. Single atomic commit. Grep gate prints `GATE_OK`.

## What changed

- **Route call replaces the PSE gateway.** New `handlePayWithWompi` POSTs to
  `/api/inquilino/pagos/wompi-session` with `body: { leaseId }` only, forwarding
  `Authorization: Bearer ${getAccessToken()}`. On `409` → toast "Este período ya está pagado o en
  verificación." and back to `confirm`; on other non-OK → catch → toast + back to `confirm`.
- **Dropped the client amount (anti-tamper).** The old `PseProcessDto { amount: paymentInfo.monthlyRent, … }`
  send is gone. The client never transmits a price; the server resolves and signs it (v7-04-01).
- **Dropped `psePaymentsApi` and the whole PSE in-page flow.** Removed the `form`/`processing`/`result`
  steps, the payer/bank fields + state (`personType`, `documentType`, `documentNumber`, `bankCode`,
  `banks`, `fullName`, `email`, `formErrors`, `result`), `validateForm`, `handleProcess`,
  `DOCUMENT_TYPES`, `getBanks()`, the `psePaymentsApi` import, the PSE-type imports, and the now-unused
  `Field`/`ResultPanel` subcomponents + `Input`/`Select*`/`Bank`/`CaretLeft`/`ArrowRight` imports.
- **Redirect.** Builds the URL via `buildWompiCheckoutUrl({ ...session, redirectUrl:
  window.location.origin + '/inquilino/pagos' })` and does `window.location.href = url` — the return
  params are handled by v7-04-03.
- **monthlyRent-only disclosure (PAGO-05).** The confirm step keeps the `Período` + `Monto a pagar`
  block showing only `formatCurrency(paymentInfo.monthlyRent)`. No cuota-de-manejo / recargo / adminFee
  line (fabricating a fee is itself a dark pattern; `adminFee` is `@deprecated`). Helper copy now points
  to Wompi's secure page (PSE, tarjeta o Nequi).
- **Step machine** reduced to `loading | period-blocked | confirm | redirecting`. Added a `redirecting`
  spinner ("Te estamos llevando al pago seguro…").
- **Preserved:** the period-blocked pre-flight (`PENDING_VALIDATION` / `APPROVED` → `PeriodBlockedPanel`,
  no double-pay), the `REJECTED` reason banner + its "Reintentar pago" affordance (now routed to the same
  Wompi handler), the Lenis `stop()` + `data-lenis-prevent` behavior, and the `PeriodBlockedPanel`/`Row`
  subcomponents. Both entry points update via the one shared modal.
- **CTA:** uppercase **"PAGAR ARRIENDO"** on the default (payable) confirm step.

## Verification

- **Grep gate (Task 1):** `GATE_OK` — asserts `wompi-session` + `getAccessToken` +
  `buildWompiCheckoutUrl` + `window.location.href` + `PAGAR ARRIENDO` present; zero `amount: paymentInfo`,
  zero `psePaymentsApi`, zero fabricated-fee tokens.
- **`pnpm build`:** green — full route table emitted, `.next/BUILD_ID` written, no type/ESLint errors
  (the `/api/inquilino/pagos/wompi-session` route from v7-04-01 compiles alongside).
- **`pnpm test`:** 601 passed / **7 failed — all pre-existing**, matching `deferred-items.md` exactly
  (5 files: `asegurabilidad/nueva/page.test.tsx`, `EquipoAgentes.test.tsx`, `WorkItemDetalle.test.tsx`,
  `CarrierRegistryTable.test.tsx`, `risk-levels.test.ts`). **0 new failures.** No PayRentModal test exists.

## Deviations

- **DESIGN.md §4 tension (uppercase CTA).** The plan's grep gate + Definition of Done + guardrails
  hard-require the literal uppercase string `PAGAR ARRIENDO`. The current `docs/DESIGN.md` §4 was recently
  reversed to **sentence-case** button labels ("this reverses the old always-uppercase rule"). I honored
  the explicit, repeated, automated plan contract (uppercase `PAGAR ARRIENDO`) and flag the tension here
  for a human to reconcile — if sentence case is preferred, change the label to `Pagar arriendo` (this
  would break the plan's grep gate as written).
- **`onPaid`/`prefill` props kept but unused.** Left in the `PayRentModalProps` interface for
  source-compat with both call sites (which pass them), but no longer destructured or invoked — the
  browser leaves the page on redirect, so there is no in-page success to report; confirmation is
  server-side on return (v7-04-03). No call-site changes were needed (both pass parameterless
  `handlePaid`, assignable to the narrowed `onPaid?: () => void`).

## Next

- **v7-04-03** handles the Wompi return params at `/inquilino/pagos` and reconciles the payment history.
