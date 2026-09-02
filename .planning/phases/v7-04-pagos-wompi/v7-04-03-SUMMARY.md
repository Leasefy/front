---
phase: v7-04-pagos-wompi
plan: 03
subsystem: payments
tags: [wompi, tenant-portal, receipts, next-app-router, sonner, useSearchParams]

# Dependency graph
requires:
  - phase: v7-04-02
    provides: PayRentModal Wompi redirect-url now returns the tenant to /inquilino/pagos
  - phase: v7-02
    provides: signed/expiring URL contract discipline (ContractSignedPdf { url, expiresAt }) + blob-download idiom
provides:
  - "Reconciliation-safe Wompi return on /inquilino/pagos: neutral 'confirmando' toast + refetch, never premature success"
  - "tenantPaymentRequestsApi.getReceiptUrl(id) contract → TenantReceiptUrl | null (403/404 tolerant)"
  - "Per-row 'comprobante interno' download that degrades to an honest 'Próximamente' (no fake PDF, never 'factura')"
  - "Single-source saldo/mora (payment-info / tenant-payment-requests) with es-CO locale fix"
affects: [v7-04-04, pagos, tenant-portal, receipts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSearchParams behind a <Suspense> boundary on a static route (Next 14 build requirement)"
    - "Wompi client-controlled return params are display-only; truth comes from webhook + landlord validation"
    - "Signed-URL + blob download for receipts, 403/404 → null → honest Próximamente"

key-files:
  created: []
  modified:
    - src/lib/api/tenant-payment-requests.types.ts
    - src/lib/api/tenant-payment-requests.service.ts
    - src/app/inquilino/pagos/page.tsx

key-decisions:
  - "Wrapped the pagos page body in <Suspense> (mirroring /inquilino/explorar) so useSearchParams does not fail next build on this static route"
  - "Return toast is identical regardless of ?status — no APPROVED branch, no local paid flag"
  - "Service JSDoc avoids the literal token 'factura' (grep-gated); the DIAN disclosure lives on the page as 'factura electrónica (DIAN)'"

patterns-established:
  - "No-premature-success return handling for redirect-based PSPs"
  - "Receipt affordance gated on request.hasReceipt, honest Próximamente fallback"

requirements-completed: [PAGO-03, PAGO-05]

# Metrics
duration: ~20min
completed: 2026-07-18
---

# Phase v7-04 Plan 03: Pagos return + comprobante interno Summary

**Reconciliation-safe Wompi return on `/inquilino/pagos` (neutral "confirmando", never premature success), a `getReceiptUrl` signed-URL contract with an honest "Próximamente" comprobante-interno download, single-source saldo, and the es-CL→es-CO locale fix.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- **Wompi return (no premature success):** a run-once `useEffect` reads the client-controlled `?id`/`?status` params and shows a **neutral** `toast.info('Estamos confirmando tu pago…')` then `refetchRequests()` + `refetchPaymentInfo()`. No "pago exitoso", no `status === 'APPROVED'` branch, no local paid flag — status flips only via the backend webhook + landlord validation. The interim truth remains the existing `PENDING_VALIDATION` card.
- **getReceiptUrl contract:** new `TenantReceiptUrl { url; expiresAt }` type + `tenantPaymentRequestsApi.getReceiptUrl(id)` returning `TenantReceiptUrl | null`, mirroring `getMine()`'s tolerant 403/404 → `null`. JSDoc marks it a "comprobante interno", NOT a DIAN electronic invoice, and never fabricates a URL.
- **Comprobante interno → Próximamente:** each APPROVED/PENDING_VALIDATION row with `hasReceipt` offers a "Comprobante interno" link. `handleDownloadReceipt` fetches the signed URL as a blob (hides storage URL); with no backend endpoint it returns `null` → `toast.info('El comprobante interno estará disponible próximamente.')`. A once-per-page note discloses "la factura electrónica (DIAN) estará disponible más adelante." No client-generated PDF, never labeled "factura"/"Descargar factura".
- **Single-source saldo + hygiene:** no second computed saldo and no fabricated cuota-de-manejo/recargo line — Next Payment / period card still trace to `payment-info`. `es-CL` → `es-CO` fixed in `formatShortDate`; the amber `daysUntil <= 3` highlight stays factual (no guilt/countdown).

## Task Commits

Committed atomically (single commit — small, cohesive change across the receipt contract + page; SUMMARY included in the same commit):

1. **Tasks 1–3 + SUMMARY: Pagos Wompi return + comprobante interno + es-CO** - the feat commit on `plan/v7.0-portal-inquilino` (see `git log`) (feat)

## Files Created/Modified
- `src/lib/api/tenant-payment-requests.types.ts` - Added `TenantReceiptUrl { url; expiresAt }` (signed/expiring shape).
- `src/lib/api/tenant-payment-requests.service.ts` - Added `getReceiptUrl(id)` with tolerant 403/404 → null; comprobante-interno JSDoc (no "factura" token).
- `src/app/inquilino/pagos/page.tsx` - `<Suspense>` wrapper + `PagosPageContent`; Wompi-return `useEffect` (neutral confirmando + refetch); `handleDownloadReceipt` (blob → download, null → Próximamente); per-row comprobante-interno affordance gated on `hasReceipt`; DIAN disclosure note; `es-CL`→`es-CO`.

## Decisions Made
- **Suspense wrapper (deviation, Rule 3):** `useSearchParams` on the static `/inquilino/pagos` route fails `next build` in Next 14 unless wrapped in a `<Suspense>` boundary. Renamed the default export to `PagosPageContent` and added a `<Suspense fallback={Spinner}>` default export — the same pattern already used by `/inquilino/explorar`. Required for the build to pass.
- Return toast copy is identical for every `?status` value (the redirect is not a source of truth).
- Kept the receipt as a link-style button ("Comprobante interno") — mutually exclusive by status with the existing "Reintentar" link.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useSearchParams` needs a Suspense boundary to build**
- **Found during:** Task 2 (Wompi return handling)
- **Issue:** Next 14 fails `next build` on a static route that calls `useSearchParams` without a `<Suspense>` boundary ("Missing Suspense boundary with useSearchParams").
- **Fix:** Split the page into a `PagosPageContent` inner component and a default `PagosPage` that wraps it in `<Suspense fallback={<Spinner/>}>` — mirroring `/inquilino/explorar/page.tsx`.
- **Files modified:** src/app/inquilino/pagos/page.tsx
- **Verification:** `pnpm build` (see below); grep gates GATE_OK.
- **Committed in:** the feat commit on `plan/v7.0-portal-inquilino` (see `git log`) (task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). No scope creep — landlord/agency untouched; existing real history preserved.
**Impact on plan:** Necessary for the build to pass; all guardrails intact.

## Issues Encountered
- The Task 2 grep gate initially failed because an explanatory code comment contained the literal token "pago exitoso". Reworded the comment ("we NEVER declare the payment successful") — gate then GATE_OK. No behavioral change.

## Verification
- Grep gates (all three tasks): **GATE_OK**.
- `pnpm build`: **passed** (exit 0); `/inquilino/pagos` compiled as static (`○`) — the Suspense boundary kept it prerenderable.
- `pnpm test`: **601 passed / 7 failed (608 total)** — the 7 failures are the pre-existing ones documented in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (5 files incl. `asegurabilidad/nueva/page.test.tsx` `(g)`/`(h)`), **0 new failures**. No pagos test exists/regressed.

## User Setup Required
None - no external service configuration required. The `/tenant-payments/requests/:id/receipt-url` backend endpoint does not exist yet; the UI intentionally degrades to "Próximamente" until it does.

## Next Phase Readiness
- Ready for plan v7-04-04 (which also edits `pagos/page.tsx` — this plan went first).
- When the backend ships the `receipt-url` endpoint, the comprobante-interno download activates with no frontend change.

---
*Phase: v7-04-pagos-wompi*
*Completed: 2026-07-18*
