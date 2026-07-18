---
phase: v7-02-documentos-arriendo
plan: 01
subsystem: ui
tags: [react, nextjs, tenant-portal, documentos, contracts, payments, i18n]

# Dependency graph
requires:
  - phase: v7-01-fundacion-limpieza
    provides: tenant portal shell + onboarding gating + i18n conventions
provides:
  - "Documentos del arriendo section in the tenant documentos hub (contrato firmado + recibos)"
  - "Contrato firmado download via the existing signed-URL chain (DownloadContractPdfButton → GET /contracts/:id/pdf)"
  - "Recibos de pago listed from useMyPaymentRequests (single source of truth), labeled 'comprobante interno' — no fabricated PDF"
  - "es-CO date locale fix (removed es-CL bug)"
affects: [v7-02-02, v7-02-03, v7-02-04, v7-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse existing signed-URL contract download (DownloadContractPdfButton) instead of binding raw persistent URLs"
    - "Surface payment history as read-only 'comprobante interno' rows (no fiscal PDF, no 'factura' wording)"

key-files:
  created:
    - .planning/phases/v7-02-documentos-arriendo/v7-02-01-SUMMARY.md
  modified:
    - src/app/inquilino/documentos/page.tsx

key-decisions:
  - "Placed the 'Documentos del arriendo' section at the top (right after the header, above the entire application-docs cluster) for prominence, keeping stats/filters/grid fully intact"
  - "Added contractsLoading + paymentRequestsLoading to the page's composite isLoading so the lease section never flashes a fake-empty while its hooks resolve"
  - "Reused MONTH_NAMES + formatPeriod idiom from pagos/arriendo pages; added a PAYMENT_REQUEST_STATUS map for the comprobante status badge"

patterns-established:
  - "Lease-doc download rows: icon + label + address subline (from arriendo/[leaseId]), download action delegated to DownloadContractPdfButton (blob download, Supabase URL never shown)"
  - "Recibos are read-only comprobantes internos with an honest inline note that the descargable PDF arrives with Pagos (v7-04) — no dead button"

requirements-completed: [DOCU-01]

# Metrics
duration: ~20min
completed: 2026-07-18
---

# Phase v7-02 Plan 01: Lease documents in the documentos hub Summary

**The tenant documentos hub now surfaces the arriendo's documents — contrato firmado (downloaded via the existing signed-URL blob path) and recibos de pago (read-only "comprobantes internos" from the single source of truth) — alongside the application docs, with the es-CL date locale bug fixed.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-18T04:07:44Z
- **Tasks:** 2
- **Files modified:** 1 (+ 1 summary created)

## Accomplishments
- Added a "Documentos del arriendo" section above the application-docs cluster in `src/app/inquilino/documentos/page.tsx`.
- Contrato firmado (status in signed/active/expired/cancelled) renders one download row per contract, using `<DownloadContractPdfButton>` — the concrete DOCU-01 "opens via signed URL, not raw" behavior. No `lease.contractUrl` / raw persistent URL bound to any `href`/`iframe`.
- Recibos de pago listed from `useMyPaymentRequests` (tenant-payment-requests) labeled "Recibos (comprobante interno)" / "Comprobante interno", showing period, `formatCurrency(amount)` (COP), bank name, payment date, and a status badge. No download button, no iframe, no fabricated receipt PDF (deferred to v7-04). Honest inline note that the descargable comprobante PDF arrives with Pagos.
- Fixed the `formatDate` locale bug: `es-CL` → `es-CO` (DESIGN.md §16).
- Added `CONTRATO` + `RECIBO` keys to `DOC_TYPE_CONFIG`, both actually consumed via `getDocLabel`/`getDocIcon` in the lease section (no dead config).
- Honest empty state ("Aún no tienes documentos del arriendo") when there are no signed contracts and no recibos; the section is gated behind the page's composite loading spinner.

## Task Commits

Committed atomically (code + summary):

1. **Task 1 + Task 2: lease documents section + es-CO locale fix** — `feat(v7-02): surface lease documents (contrato firmado + recibos) in documentos hub` (see git log for hash)

## Files Created/Modified
- `src/app/inquilino/documentos/page.tsx` — Added lease-documents section (contrato firmado via `DownloadContractPdfButton`, recibos via `useMyPaymentRequests`), `CONTRATO`/`RECIBO` config keys, `MONTH_NAMES`/`formatPeriod`, `PAYMENT_REQUEST_STATUS` badge map, composite loading includes contracts + payment requests, and the `es-CL` → `es-CO` fix. Application-docs stats/filters/grid/viewer modal left untouched (additive).

## Decisions Made
- Section placed at the top (above the whole application-docs cluster) rather than only above the grid, so the arriendo docs are the first content — keeps the additive rule (stats/filters/grid/modal unchanged).
- Extended the page's `isLoading` to include `contractsLoading || paymentRequestsLoading` to avoid a fake-empty flash; both hooks degrade to `[]` on 403/404 (no crash).

## Deviations from Plan
None — plan executed exactly as written. (Minor: reworded an inline code comment that originally contained the word "factura" so the compliance grep gate — which counts the whole file — stays at zero; the UI copy never used "factura".)

## Issues Encountered
- The Task 2 grep gate `grep -ci "factura" == 0` initially failed on my own explanatory comment ("NO factura"). Reworded the comment; gate now passes. No user-facing string ever said "factura".

## Verification
- Grep gates: Task 1 `GATE_OK` (no `es-CL`, `es-CO` present); Task 2 `GATE_OK` (`DownloadContractPdfButton` + `useMyPaymentRequests` present, "comprobante interno" present, zero "factura").
- `pnpm build`: succeeds (EXIT=0, "Compiled successfully", `/inquilino/documentos` route present at 18.1 kB).
- `pnpm test`: 582 passed / 7 failed — the 7 failures are exactly the pre-existing set documented in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (inmobiliaria AI / cotizador / risk-levels). **0 new failures**; none import the documentos page.

## Next Phase Readiness
- v7-02-02 (generic `documentsApi.getSignedUrl`), v7-02-03 (application-doc IDOR hardening + consent + ARCO delete), and v7-02-04 (paz y salvo / cert retención) will edit the same page; this plan stayed minimal and additive.
- The recibo PDF (v7-04 / PAGO-03) will replace the read-only comprobante rows' "PDF llega con Pagos" note with a real download.

---
*Phase: v7-02-documentos-arriendo*
*Completed: 2026-07-18*
