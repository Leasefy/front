---
phase: 34-avaluos-ui
plan: 01
subsystem: ui
tags: [avaluo, types, api-service, next-app-router, public-route, ley-1581]

# Dependency graph
requires: []
provides:
  - AvaluoFormData interface with 3-step intake fields
  - AvaluoStatus union + STATUS_BADGE map (6 states)
  - createEmptyAvaluoFormData() factory
  - avaluo.service.ts with photoPresign, uploadPhotoToS3, submitIntake, getAvaluoStatus
  - /avaluo route tree with ForceLightMode layout
  - /avaluo public landing page with hero + CTA + how-it-works steps
affects: [34-02, 34-03, 34-04, 34-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ForceLightMode layout wrapper for public /avaluo/* routes (same as /aplicar)"
    - "S3 presign + direct PUT with matching Content-Type header (no auth on S3)"
    - "Ley 1581 consent: 3 SEPARATE boolean fields (purposeAvaluo/Dataset/Contacto)"
    - "getAvaluoStatus mock fallback with TODO comment for backend readiness"

key-files:
  created:
    - src/lib/types/avaluo.ts
    - src/lib/api/avaluo.service.ts
    - src/app/avaluo/layout.tsx
    - src/app/avaluo/page.tsx

key-decisions:
  - "3 separate boolean consent fields (not a single array) — explicit Ley 1581 compliance with JSDoc on each"
  - "uploadPhotoToS3 passes Content-Type matching presign; S3 PUT has no auth headers — documented in code"
  - "getAvaluoStatus has mock fallback { status: 'en_revisión' } with TODO for backend endpoint"
  - "DESIGN.md §10.2 highlighted word treatment on hero headline + §10.4 step cards for how-it-works"

patterns-established:
  - "avaluo types: all in src/lib/types/avaluo.ts; service in src/lib/api/avaluo.service.ts"
  - "Public /avaluo/* routes always render in light mode via ForceLightMode (same pattern as /aplicar)"

# Metrics
duration: 6min
completed: 2026-06-03
---

# Phase 34 Plan 01: Avalúo Foundation — Types, Service, Public Landing

**Typed avalúo foundation: AvaluoFormData with 3 Ley-1581 consent booleans, S3 presign photo service, and /avaluo public landing with DESIGN.md §10.4 step cards**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-03T22:20:32Z
- **Completed:** 2026-06-03T22:26:49Z
- **Tasks:** 3
- **Files created:** 4

## Accomplishments

- `AvaluoFormData` with 3 separate Ley 1581 consent booleans (`purposeAvaluo`, `purposeDataset`, `purposeContacto`) each with JSDoc explaining what data treatment is consented — explicit compliance, never a single "I accept all" checkbox
- `avaluo.service.ts` with S3 presign + direct upload (Content-Type must match presign — prevents 403), typed error codes for intake (rate_limit / validation_error / service_unavailable), and mock-with-TODO for status endpoint
- `/avaluo` route tree: `ForceLightMode` layout wrapper (same pattern as `/aplicar`) + public landing with highlighted hero, primary uppercase CTA to `/avaluo/nuevo`, and 3-step "cómo funciona" strip using DESIGN.md §10.4 step card pattern

## Task Commits

1. **Task 1: avaluo types** - `bf49a45` (feat)
2. **Task 2: avaluo.service.ts** - `8f81bfb` (feat)
3. **Task 3: layout.tsx + page.tsx** - `1af70fa` (feat)

## Files Created/Modified

- `src/lib/types/avaluo.ts` — AvaluoStatus, AvaluoFormData, STATUS_BADGE, TERMINAL_STATUSES, createEmptyAvaluoFormData, IntakeResponse, AvaluoStatusResponse, PhotoPresignResponse
- `src/lib/api/avaluo.service.ts` — photoPresign, uploadPhotoToS3, submitIntake, getAvaluoStatus (172 / 163 lines respectively)
- `src/app/avaluo/layout.tsx` — ForceLightMode wrapper + metadata
- `src/app/avaluo/page.tsx` — public landing with hero + CTA (/avaluo/nuevo) + step cards

## Decisions Made

- **3 separate consent booleans** — Ley 1581 requires tracking exactly what data treatment was consented. A single boolean or array would lose granularity needed for audit trails. Each field has JSDoc with its legal basis.
- **S3 PUT with `Content-Type: file.type`** — presigned URLs embed content-type policy; if the PUT header mismatches, S3 returns 403 (not 4xx auth — it's a signature mismatch). Documented in code with CRITICAL comment.
- **Mock fallback in `getAvaluoStatus`** — backend hasn't exposed the status endpoint yet; rather than throwing, we return `{ status: 'en_revisión' }` so status polling UI can render without crashing. TODO comment tracks when to remove.
- **`/dist/ssr` icon imports** — used `@phosphor-icons/react/dist/ssr` in page.tsx (Server Component context, not client) to avoid "useContext" error from the default client-side export.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. `NEXT_PUBLIC_AVALUO_URL` env var must be set before the service can make real calls (currently absent, but graceful — fetch would throw a TypeError that callers catch).

## Next Phase Readiness

- Plan 34-02 (multi-step form) can import `AvaluoFormData`, `createEmptyAvaluoFormData`, and `avaluo.service.ts` directly — all types and API client are ready
- `/avaluo/nuevo` link is wired in landing page — 404 until 34-02 creates that route
- tsc: no new errors introduced (pre-existing errors: recharts, @react-pdf/renderer, playwright — unrelated devDependencies)

## Self-Check: PASSED

- FOUND: src/lib/types/avaluo.ts
- FOUND: src/lib/api/avaluo.service.ts
- FOUND: src/app/avaluo/layout.tsx
- FOUND: src/app/avaluo/page.tsx
- Commits: bf49a45, 8f81bfb, 1af70fa — all present
- Content checks: 3 consent booleans ✓, STATUS_BADGE ✓, ForceLightMode ✓, /avaluo/nuevo ✓

---
*Phase: 34-avaluos-ui*
*Completed: 2026-06-03*
