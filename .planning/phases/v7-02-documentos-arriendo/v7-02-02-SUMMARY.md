---
phase: v7-02-documentos-arriendo
plan: 02
subsystem: api
tags: [documents, signed-url, idor, habeas-data, ley-1581, consent, react-hooks, typescript]

# Dependency graph
requires:
  - phase: v7-02-documentos-arriendo (plan 01)
    provides: documentos hub page + documents service/hooks scaffolding (page already committed in f91439a0)
provides:
  - "DocumentSignedUrl { url, expiresAt } anti-IDOR contract (modeled 1:1 on ContractSignedPdf)"
  - "documentsApi.getSignedUrl(docId) → GET /documents/:id/signed-url"
  - "documentsApi.recordConsent(docId, consent) best-effort POST /documents/:id/consent (404/403 → no-op)"
  - "getDownloadUrl @deprecated with explicit raw-URL / IDOR gap disclosure"
  - "DocumentConsent (2 separate booleans + policyVersion) + createEmptyDocumentConsent factory (both false)"
  - "useSignedDocUrl hook (enabled gate, {url,isLoading,error,refetch}) cloned from useSignedPdfUrl"
affects: [v7-02-03 (documentos page IDOR hardening + consent gate + ARCO delete)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Signed/expiring URL contract cloned from the contracts chain (ContractSignedPdf / getSignedPdfUrl / useSignedPdfUrl)"
    - "Per-purpose Ley 1581 consent model cloned from the avalúo 3-boolean unchecked-default factory"
    - "Best-effort api-client stub: 404/403 → resolved no-op, other errors re-thrown"

key-files:
  created:
    - src/lib/hooks/useDocuments.ts (useSignedDocUrl appended; file pre-existed with other doc hooks)
  modified:
    - src/lib/api/documents.types.ts
    - src/lib/api/documents.service.ts

key-decisions:
  - "getDownloadUrl kept (not deleted) but @deprecated — plan 03 migrates callers; other non-tenant callers may exist"
  - "recordConsent degrades to silent no-op only on 404/403 (missing/blocked endpoint); all other ApiError re-thrown so real failures surface"
  - "useSignedDocUrl appended to the existing useDocuments.ts rather than a new file (file already existed from plan 01)"

patterns-established:
  - "Anti-IDOR download path: backend-minted { url, expiresAt }; frontend never fabricates a signed URL — throws if endpoint absent"
  - "Consent-by-purpose: separate booleans, unchecked default, policyVersion stamped for SIC audit"

requirements-completed: [DOCU-04]

# Metrics
duration: ~12min
completed: 2026-07-18
---

# Phase v7-02 Plan 02: Habeas Data api-client backbone Summary

**Signed/expiring `{ url, expiresAt }` documents contract (anti-IDOR) + `useSignedDocUrl` consumer hook + per-purpose Ley 1581 consent contract, all cloned 1:1 from the real contracts/avalúo chains — with the raw-URL `getDownloadUrl` gap honestly disclosed as a backend dependency, no fabricated signing.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-18T04:13:46Z
- **Completed:** 2026-07-18T04:26:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 appended)

## Accomplishments
- `DocumentSignedUrl { url, expiresAt }` interface modeled 1:1 on `ContractSignedPdf` — the anti-IDOR shape the UI surfaces (expiry).
- `DocumentConsent` (separate `purposeDocAccess` MANDATORY + `purposeThirdPartyShare` OPTIONAL booleans + `policyVersion`) with `createEmptyDocumentConsent(policyVersion)` factory defaulting **both** booleans to `false`.
- `documentsApi.getSignedUrl(docId)` → `GET /documents/:id/signed-url`, cloned from `contractsApi.getSignedPdfUrl`; throws (never fakes) if the endpoint is missing.
- `documentsApi.recordConsent(docId, consent)` → best-effort `POST /documents/:id/consent`; degrades to a resolved no-op only on 404/403, JSDoc'd as backend-owned SIC-audit persistence.
- `getDownloadUrl` marked `@deprecated` with an explicit raw persistent Supabase URL / no-expiry / no-ownership-check IDOR disclosure and a note that FULL closure is a backend dependency.
- `useSignedDocUrl(docId, { enabled })` hook cloned line-for-line in shape from `useSignedPdfUrl` (enabled gate, `{ url, isLoading, error, refetch }`).

## Task Commits

All three tasks committed atomically in a single `feat(v7-02)` commit (pure additive backbone, no interdependency risk):

1. **Task 1: DocumentSignedUrl + DocumentConsent types** — `src/lib/api/documents.types.ts`
2. **Task 2: getSignedUrl + recordConsent; deprecate getDownloadUrl** — `src/lib/api/documents.service.ts`
3. **Task 3: useSignedDocUrl hook** — `src/lib/hooks/useDocuments.ts`

**Commit:** `98a1b9f1` — `feat(v7-02): document signed-URL + consent api-client backbone (DOCU-04)`

## Files Created/Modified
- `src/lib/api/documents.types.ts` — added `DocumentSignedUrl`, `DocumentConsent`, `createEmptyDocumentConsent`; `BackendDocumentFull` / `UploadDocumentDto` intact.
- `src/lib/api/documents.service.ts` — added `getSignedUrl` + `recordConsent`; `getDownloadUrl` deprecated with IDOR disclosure; imported `ApiError` + new types; `getById`/`getByApplication`/`upload`/`delete` unchanged.
- `src/lib/hooks/useDocuments.ts` — appended `useSignedDocUrl`; existing hooks (`useApplicationDocuments`, `useCandidateDocuments`, `useDocumentUpload`, `useDocumentDelete`) unchanged.

## Decisions Made
- Appended `useSignedDocUrl` to the pre-existing `useDocuments.ts` (created by plan 01) instead of creating a new file — the plan named this path and the imports it needs were already present.
- `recordConsent` treats only 404/403 as "endpoint absent" → no-op; every other error re-thrown to avoid swallowing genuine failures.

## Deviations from Plan

None — plan executed exactly as written. (Note: `src/lib/hooks/useDocuments.ts` already existed from plan 01, so `useSignedDocUrl` was appended rather than created in a fresh file; the plan's `files_modified` and grep gate are satisfied either way.)

## Issues Encountered
None.

## Verification
- **Grep gates:** all three tasks printed `GATE_OK`.
- **`pnpm build`:** succeeds (`✓ Compiled successfully`, exit 0).
- **`pnpm test`:** 582 passed / 7 failed / 589 total — **0 NEW failures**. All 7 failures are the pre-existing set documented in `.planning/phases/v7-01-fundacion-limpieza/deferred-items.md` (asegurabilidad/nueva page.test ×2, EquipoAgentes, WorkItemDetalle, CarrierRegistryTable, risk-levels ×2), none of which import the documents service/types/hook.

## Next Phase Readiness
- Backbone ready for v7-02-03: the page can consume `useSignedDocUrl` for the anti-IDOR download path, gate downloads behind `createEmptyDocumentConsent` + `recordConsent`, and migrate off the now-`@deprecated` `getDownloadUrl`.
- Blocker (disclosed, external): FULL IDOR closure requires the backend to actually sign `/documents/:id/signed-url` and persist consent at `/documents/:id/consent`. The frontend contract + hook are in place; server enforcement is a backend dependency, not faked here.

## Self-Check: PASSED
- All 4 files exist on disk.
- Commit `98a1b9f1` present in git log.
- No file deletions in the commit (`git diff --diff-filter=D HEAD~1 HEAD` → none).
- Only the 3 plan files + this SUMMARY were staged (explicit paths; no `git add -A`).

---
*Phase: v7-02-documentos-arriendo*
*Completed: 2026-07-18*
