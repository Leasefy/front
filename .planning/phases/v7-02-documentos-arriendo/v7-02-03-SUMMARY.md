---
phase: v7-02-documentos-arriendo
plan: 03
subsystem: tenant-portal
tags: [documents, idor, habeas-data, ley-1581, consent, arco-delete, docu-04]

# Dependency graph
requires:
  - phase: v7-02-documentos-arriendo (plan 01)
    provides: documentos hub page + lease section (contrato firmado + recibos)
  - phase: v7-02-documentos-arriendo (plan 02)
    provides: useSignedDocUrl hook, documentsApi.getSignedUrl/recordConsent/delete, DocumentConsent + createEmptyDocumentConsent
provides:
  - "DOCU-04 tenant-surface hardening: signed-blob doc access (anti-IDOR), per-purpose Ley 1581 consent gate, real ARCO delete behind type-to-confirm"
  - "Contrato firmado explicitly excluded from delete (statutory retention) with inline 'no eliminable' note"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Signed-blob download (fetch signed URL → blob → <a download> → revoke) cloned from DownloadContractPdfButton"
    - "Per-purpose unchecked-default Ley 1581 consent gate cloned from avalúo StepContacto"
    - "Type-to-confirm ('ELIMINAR') destructive Dialog cloned from perfil handleDeleteAccount"

key-files:
  created: []
  modified:
    - src/app/inquilino/documentos/page.tsx

key-decisions:
  - "Consent gate shown only when documents.length > 0 (no clutter on empty state); mandatory purposeDocAccess gates view+download, does NOT hard-block page chrome"
  - "recordConsent is best-effort per accessed doc (deduped via a ref Set); NO 'consentimiento guardado' confirmation (persistence is a disclosed backend stub)"
  - "Preview <img>/<iframe> bind the signed previewUrl (viewerSignedUrl ?? viewingDocument?.url); raw fallback carries the disclosed IDOR-gap comment"

requirements-completed: [DOCU-04]

# Metrics
duration: ~20min
completed: 2026-07-18
---

# Phase v7-02 Plan 03: Documentos page hardening (Habeas Data DOCU-04) Summary

**Hardened the tenant documentos page for DOCU-04: application-doc download AND the inline preview (`<img>`/`<iframe>`) now route through the backend-signed blob (`useSignedDocUrl`/`getSignedUrl`) instead of the raw Supabase URL; a per-purpose Ley 1581 consent gate (unchecked default, one purpose each) blocks doc access until the mandatory purpose is granted; and a real `documentsApi.delete` ARCO action sits behind a type-to-confirm Dialog — with the signed contrato firmado explicitly excluded from delete as a legal record.**

## Performance
- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 1 (`src/app/inquilino/documentos/page.tsx`)

## Accomplishments

### Task 1 — Anti-IDOR signed access
- Added `handleDownload(doc)`: `documentsApi.getSignedUrl(doc.id)` → `fetch` → `.blob()` → `URL.createObjectURL` → programmatic `<a download>` → `revokeObjectURL` on a tick, so the Supabase URL never lands in the address bar.
- Replaced BOTH the card download `<a href={doc.url}>` and the two viewer-modal download links (header + "other" branch) with signed-blob buttons.
- The viewer preview (`<img src>` / `<iframe src>`) now binds `previewUrl = viewerSignedUrl ?? viewingDocument?.url` from `useSignedDocUrl(viewingDocument?.id, { enabled: !!viewingDocument })`; the page Spinner shows while the signed URL loads. Raw fallback carries the disclosed-gap comment: `TODO(backend): /documents/:id/signed-url not live — raw URL fallback is the disclosed IDOR gap (DOCU-04), not a frontend-satisfiable claim.`
- The lease contrato path (`DownloadContractPdfButton`) was left untouched — it already uses the signed contracts chain.

### Task 2 — Per-purpose consent gate
- `const [consent, setConsent] = useState(() => createEmptyDocumentConsent('v1'))` — both booleans default FALSE (no `defaultChecked`).
- Two separate `<Checkbox>` (avalúo model): `purposeDocAccess` (MANDATORY, `aria-required`, inline `text-warning` when unchecked) and `purposeThirdPartyShare` (OPTIONAL). Ley 1581 notice footer. No blanket single-box consent.
- `canAccessDocs = consent.purposeDocAccess` gates the view+download actions (disabled + title hint); it does NOT hard-block reading the page chrome.
- `maybeRecordConsent(docId)` best-effort POSTs consent once per accessed doc (deduped via a `useRef` Set); wrapped so a missing endpoint is a silent no-op. NO "consentimiento guardado" confirmation is shown (honesty guardrail — persistence is a disclosed backend stub).

### Task 3 — ARCO delete (contract excluded)
- Delete affordance (Trash button) added only to application `DocumentItem` cards. Opens a `Dialog` (DESIGN §17 primitive, z-[300]) requiring the user to type "ELIMINAR"/"DELETE"; the `variant="destructive"` confirm is disabled until it matches.
- On confirm: real `await documentsApi.delete(id)` (no setTimeout theater), removes from local `documents` state, `toast.success`; on failure `toast.error` and keeps the doc.
- The signed contrato firmado is excluded by construction (it is a Contract, not a DocumentItem) — an inline "Documento legal — no eliminable (retención legal)" note with a Lock icon makes the exclusion explicit.

## Deviations from Plan
None — plan executed as written. Line numbers had drifted from plan 01's edits; adapted to the real current code (the guardrails, not exact line numbers, were the contract). Added `handleView` (a thin gated wrapper over `setViewingDocument`) so the view action is consent-gated symmetrically with download; this is within Task 2's "disable the document download/view actions" scope.

## Honesty / disclosed gaps
- FULL IDOR closure remains a backend dependency: `/documents/:id/signed-url` must actually sign `/documents`. Where it isn't live, the blob fetch falls back to the raw URL behind the disclosed comment. The UI does NOT claim "sin IDOR" is fully met.
- Consent persistence (`/documents/:id/consent`) is backend-owned; the UI gate is the real enforcement, so no "saved" claim is surfaced.

## Verification
- **Grep gates:** all 3 tasks print `GATE_OK` (Task 1 also confirms zero raw `src={...url}`).
- **`pnpm build`:** `✓ Compiled successfully`; `/inquilino/documentos` builds (21.9 kB / 577 kB First Load JS).
- **`pnpm test`:** 582 passed / **7 failed** / 589 total — **0 NEW failures**. The 7 failures are the exact pre-existing baseline in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (asegurabilidad/nueva ×2, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels ×2). No documentos test appears in the failing set.

## Task Commits
Single atomic commit — subject `feat(v7-02): harden documentos page for Habeas Data (DOCU-04)` (page.tsx + this SUMMARY, explicit paths only).

## Self-Check: PASSED
- `src/app/inquilino/documentos/page.tsx` exists and compiles in the production build (`✓ Compiled successfully`).
- The `feat(v7-02): harden documentos page for Habeas Data (DOCU-04)` commit is present at HEAD (2 files: page.tsx + SUMMARY).
- Only the plan file + this SUMMARY were staged (explicit paths; no `git add -A`).
- No file deletions in the commit (`git diff --diff-filter=D HEAD~1 HEAD` → none).
- All 3 grep gates print `GATE_OK`.
