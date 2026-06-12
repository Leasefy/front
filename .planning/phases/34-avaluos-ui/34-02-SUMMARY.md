---
phase: 34-avaluos-ui
plan: 02
subsystem: api
tags: [wompi, payments, sha256, integrity-hash, server-side, node-crypto, next-app-router]

# Dependency graph
requires:
  - phase: 34-01
    provides: submissionId concept (from submitIntake response — used as reference seed)
provides:
  - POST /api/avaluo/wompi-session — server-side Wompi integrity hash endpoint
  - WOMPI_INTEGRITY_SECRET fully server-side (never exposed to client)
  - reference format: "avaluo-{submissionId}"
  - amount: 5_000_000 centavos = $50.000 COP
affects: [34-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side integrity hash: runtime=nodejs + node:crypto createHash('sha256') — never edge runtime"
    - "Wompi hash concatenation: ref+amountInCents+currency+secret (no separators)"
    - "WOMPI_INTEGRITY_SECRET without NEXT_PUBLIC_ — enforced by route guard + top-of-file warning comment"

key-files:
  created:
    - src/app/api/avaluo/wompi-session/route.ts
  modified: []

key-decisions:
  - "runtime='nodejs' mandatory — node:crypto unavailable in edge runtime"
  - "WOMPI_INTEGRITY_SECRET server-only — leaking it client-side allows forging integrity hashes for arbitrary amounts"
  - "amount hardcoded at 5_000_000 centavos ($50.000 COP) per plan spec — not configurable per request"
  - "reference = 'avaluo-' + submissionId — deterministic, traceable to intake form submission"

patterns-established:
  - "Wompi session pattern: POST route returns { reference, amountInCents, currency, integrity, publicKey } — client never needs secret"

# Metrics
duration: 4min
completed: 2026-06-03
---

# Phase 34 Plan 02: Wompi Session Route — Server-Side Integrity Hash

**Next.js API route computing Wompi SHA-256 integrity hash server-side via node:crypto, ensuring WOMPI_INTEGRITY_SECRET is never exposed to the browser**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-03T22:29:11Z
- **Completed:** 2026-06-03T22:33:34Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- `POST /api/avaluo/wompi-session` handler: parses `{ submissionId }`, validates presence, reads `WOMPI_INTEGRITY_SECRET` + `WOMPI_PUBLIC_KEY` from server env (no `NEXT_PUBLIC_` — secret stays server-side), builds `reference = 'avaluo-' + submissionId`, computes SHA-256 integrity per Wompi spec (concatenation without separators), returns `{ reference, amountInCents, currency, integrity, publicKey }`
- `export const runtime = 'nodejs'` — enforces Node.js runtime so `node:crypto` is available; edge runtime would throw at import time
- Top-of-file warning comment explicitly documents the security constraint for future maintainers

## Task Commits

1. **Task 1: Wompi session route** - `41fb81a` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/app/api/avaluo/wompi-session/route.ts` — POST handler: submissionId validation, env guard, SHA-256 integrity hash, response { reference, amountInCents, currency, integrity, publicKey }

## Decisions Made

- **`runtime = 'nodejs'`** — `node:crypto` is not available in the Next.js edge runtime. Marking the route explicitly as `nodejs` prevents silent fallback to edge and a runtime error on `createHash`.
- **`WOMPI_INTEGRITY_SECRET` server-only** — if this key were prefixed `NEXT_PUBLIC_`, any client JS bundle would include it, allowing anyone to forge valid integrity hashes for arbitrary amounts. The route is the single place it's ever used.
- **Amount hardcoded** — $50.000 COP is the fixed avalúo fee. Not a per-request parameter to prevent amount manipulation attacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added JSON parse error handling**
- **Found during:** Task 1
- **Issue:** Plan specified body parsing but didn't include a try/catch for malformed JSON — `req.json()` throws if body is not valid JSON, which would result in an unhandled 500 instead of a clean 400
- **Fix:** Wrapped `req.json()` in try/catch; returns `{ error: 'invalid_json' }` with status 400
- **Files modified:** src/app/api/avaluo/wompi-session/route.ts
- **Verification:** tsc passes, logic handles both missing body and invalid JSON gracefully
- **Committed in:** 41fb81a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Minimal — added 4 lines of try/catch. No scope creep. Necessary for production-grade error handling.

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required for this plan. The env vars needed (`WOMPI_INTEGRITY_SECRET`, `WOMPI_PUBLIC_KEY`) are documented in `.env.example`. The route returns `{ error: 'wompi_not_configured' }` with 500 if either is missing.

## Next Phase Readiness

- `POST /api/avaluo/wompi-session` is ready to be called from the confirmation page (34-04) after intake submission
- 34-03 (photo upload) does not depend on this route — proceeds independently
- `tsc --noEmit` passes with exit code 0

## Self-Check: PASSED

- FOUND: src/app/api/avaluo/wompi-session/route.ts
- Commit 41fb81a present: `git log --oneline | grep 41fb81a`
- `tsc --noEmit` exit code 0 (both background runs confirmed)
- File content: runtime='nodejs' ✓, node:crypto import ✓, WOMPI_INTEGRITY_SECRET server-only ✓, POST returns {reference, amountInCents, currency, integrity, publicKey} ✓

---
*Phase: 34-avaluos-ui*
*Completed: 2026-06-03*
