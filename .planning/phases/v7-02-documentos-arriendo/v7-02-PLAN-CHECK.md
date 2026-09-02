# Plan Check — v7-02 Documentos del Arriendo

**Verdict: PASS-WITH-NITS** (revision gate: 1 recommended fix, non-blocking)
**Checked:** 2026-07-17 · Plans 01–04 · Goal-backward against ROADMAP v7-02 + REQUIREMENTS DOCU-01..04

## Criterion → Plan coverage

| Success criterion | Plan(s) | Delivered? |
|---|---|---|
| 1. Ve/abre contrato firmado + recibos (DOCU-01) | 01 | YES — contrato via existing signed `DownloadContractPdfButton`; recibos from `useMyPaymentRequests` labeled "comprobante interno" |
| 2. Descarga paz y salvo self-service (DOCU-02) | 04 | FRONTEND-FIRST — UI + contract + honest "Próximamente" (no backend exists). Compliant w/ milestone rule + phase def; NOT a literal functional download this phase. |
| 3. Cert. retención 3.5% auto-gen (DOCU-03) | 04 | FRONTEND-FIRST — same posture; frontend never computes 3.5% |
| 4. Signed URL/no IDOR + consent por propósito + ARCO delete (DOCU-04) | 02 (backbone) + 03 (page) | YES with honest partial-IDOR disclosure |

All 4 requirements present in frontmatter `requirements`. Every file:line ref verified real (page es-CL bug @126; DOC_TYPE_CONFIG @19-34; app-doc `href={doc.url}` @371; viewer @452-556; `getDownloadUrl` @106 + `delete` @101; `ContractSignedPdf` @contracts.types:176; `getSignedPdfUrl` @contracts.service:214; `useSignedPdfUrl` @useContracts:182; `useMyPaymentRequests` @useLeases:231; avaluo 3-boolean unchecked model @65-143; perfil ELIMINAR idiom @259/1155-1189). All analogs valid; `documentsApi.delete` + `getSignedPdfUrl` confirmed to exist. `BackendTenantPaymentRequest` has `hasReceipt` and NO `receiptUrl` — plan 01's "no fake PDF" guardrail is grounded.

## Honesty-boundary rulings

- **(a) Partial IDOR — PASS (with 1 fix).** `getDownloadUrl` marked `@deprecated`/raw-URL-IDOR in 02; both 02 & 03 objectives forbid claiming "sin IDOR" is met by frontend; 03 requires inline TODO(backend) fallback comment; STRIDE T-04 = "mitigate (partial) + disclose". Disclosure is real, not hand-waved. **BUT** Plan 03 Task 1 `<automated>` gate only zero-checks `href={doc.url}`/`href={viewingDocument.url}` — it does NOT cover the raw `src={viewingDocument.url}` in the `<img>`/`<iframe>` preview (page.tsx:520,526). RESEARCH's own Wave 0 spec demands "no raw doc.url bound into a tenant href/**iframe**". Gate can pass while the raw Supabase URL still renders in the PDF iframe — the exact IDOR leak. RECOMMENDED FIX before exec.
- **(b) Consent stub — PASS.** `recordConsent` posts real, degrades to no-op on 403/404, JSDoc'd backend-owned; real enforcement = mandatory unchecked-default `purposeDocAccess` gate. Honestly labeled, not "persisted". Nit: executor must not render a "consentimiento guardado" confirmation.
- **(c) Paz y salvo / cert retención — PASS.** Zero fabrication encoded: no client "sin deuda", no computed 3.5%, no fake downloadUrl, "Próximamente" empty-state; STRIDE T-11/T-12.
- **(d) ARCO excludes contrato — PASS.** Contrato is a `Contract` (not `DocumentItem`) with no delete affordance by construction; delete wired ONLY on app `DocumentItem` cards; inline "no eliminable" note required. Recibos + certs are read-only. Deleting the contract is impossible from this UI.
- **(e) DIAN — PASS.** Recibo = "comprobante interno", never "factura" (grep gate zero-`factura`); no receipt PDF built here (v7-04).

## Guardrails, tier, wave/conflict

- Habeas Data guardrail (consent-por-propósito + ARCO + sin-IDOR) properly encoded WITH honest partial-IDOR disclosure. Architectural Responsibility Map (Dim 7c): every task sits in the correct tier; frontend never claims backend-tier work (signing/fiscal). PASS. No unresolved Open Questions.
- **Wave/atomicity: CORRECT.** Wave1 = 01 (page.tsx) ∥ 02 (types/service/hook — DISJOINT files, safe parallel). Wave2 = 03 (page.tsx, depends 01+02). Wave3 = 04 (page.tsx+new service, depends 03). page.tsx edits strictly serialized 01→03→04 via dependency chain + wave ordering. No parallel pair shares a file. No merge conflict.
- **Executability: PASS.** Files/plan ≤3 (01:1, 02:3, 03:1, 04:2); tasks/plan ≤3. Each DoD has `pnpm build` + `pnpm test` (0 NEW failures; 7 pre-existing per v7-01 deferred-items.md — confirmed 582/7/589). Dialog/Checkbox/EmptyState primitives exist. Every task has an `<automated>` grep gate (Nyquist OK; no watch/E2E).

## Fixes (ordered)

1. **(WARNING, do before exec)** Plan 03 Task 1 `<automated>` verify: extend the zero-grep to also cover bare `src=\{viewingDocument\.url\}` and `src=\{doc\.url\}` so the img/iframe preview (page.tsx:520,526) cannot keep the raw Supabase URL. Bind them through `useSignedDocUrl` (fallback via `?? viewingDocument.url`, which won't trip a bare-token grep). Matches RESEARCH Wave 0.
2. **(NIT)** No "consentimiento guardado" success UI — persistence is a disclosed stub; the unchecked-default gate is the enforcement.
3. **(NIT)** Ensure Plan 01's new `DOC_TYPE_CONFIG` CONTRATO/RECIBO keys are actually consumed by the lease-section rows (label/icon) or drop them (avoid dead config).
4. **(INFO)** Human should consciously accept criteria 2 & 3 ship as honest "Próximamente", not functional downloads (per milestone frontend-first rule + phase def line 74).

Fix #1 is cheap and high-value (this phase's entire value is honest Habeas Data). Execution may proceed after it; nits 2–4 are optional.
