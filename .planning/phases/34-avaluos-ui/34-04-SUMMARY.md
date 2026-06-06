---
phase: 34-avaluos-ui
plan: "04"
subsystem: ui
tags: [avaluo, wompi, polling, status, verification, next14, typescript]

# Dependency graph
requires:
  - phase: 34-avaluos-ui
    provides: types (AvaluoStatus, TERMINAL_STATUSES, STATUS_BADGE, AvaluoStatusResponse)
  - phase: 34-avaluos-ui
    provides: avaluo.service.ts (getAvaluoStatus with mock fallback)
  - phase: 34-avaluos-ui
    provides: /api/avaluo/wompi-session route (server-side SHA-256 integrity hash)
  - phase: 34-avaluos-ui
    provides: /avaluo layout with ForceLightMode
provides:
  - useAvaluoStatus hook — 15s polling, auto-stops on terminal states, clearInterval cleanup
  - WompiPayButton component — POST wompi-session + redirect to Wompi checkout
  - AvaluoEstadoCard component — status badge + conditional CTA per lifecycle state
  - /avaluo/estado/[submissionId] page — wires hook + card + Wompi return toast
  - /avaluo/verificar/[slug] page — public server component, certificate verification UI
affects:
  - 34-05 (admin/review panel — can reference AvaluoEstadoCard patterns)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "setInterval polling with clearInterval cleanup keyed on [id, status] for reactive stop"
    - "Wompi checkout URL built client-side; integrity always from server (never client-computed)"
    - "WompiPayButton ONLY renders inside AvaluoEstadoCard when status === 'firmado'"
    - "verificar/[slug] is a server component with no auth — publicly accessible"

key-files:
  created:
    - src/lib/hooks/use-avaluo-status.ts
    - src/components/avaluo/WompiPayButton.tsx
    - src/components/avaluo/AvaluoEstadoCard.tsx
    - src/app/avaluo/estado/[submissionId]/page.tsx
    - src/app/avaluo/verificar/[slug]/page.tsx
  modified: []

key-decisions:
  - "useEffect keyed on [submissionId, statusData?.status] — reacts when status becomes terminal and clears the interval"
  - "WompiPayButton renders only when status === 'firmado'; no other page exposes payment entry"
  - "verificar/[slug] is server component (no 'use client') — SEO-friendly, no auth middleware"
  - "ForceLightMode from /avaluo layout not re-applied in child pages"
  - "Wompi return params toast is informational only; status re-polled from backend"

patterns-established:
  - "Pattern: avaluo polling hook — useEffect + setInterval + clearInterval, stops on TERMINAL_STATUSES"
  - "Pattern: Wompi session flow — server POST for integrity, client builds URL + redirects"

# Metrics
duration: 18min
completed: 2026-06-03
---

# Phase 34 Plan 04: Confirmation + Status Polling Page Summary

**useAvaluoStatus 15s polling hook + WompiPayButton checkout redirect + AvaluoEstadoCard status UI + /avaluo/estado and /avaluo/verificar public pages**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-03T22:48:01Z
- **Completed:** 2026-06-03T23:06:00Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments

- `useAvaluoStatus` hook: 15s polling via `setInterval`, reactive stop on `TERMINAL_STATUSES`, mandatory `clearInterval` cleanup
- `WompiPayButton`: POSTs to `/api/avaluo/wompi-session` (server-side integrity), builds Wompi checkout URL, redirects browser; loading state + Sonner toast on error
- `AvaluoEstadoCard`: status `Badge` from `STATUS_BADGE`, conditional CTA — `firmado` → WompiPayButton (only here), `entregado` → download + verify links, `rechazado` → destructive note, other → processing message; auto-refresh hint for non-terminal
- `/avaluo/estado/[submissionId]`: client page wiring hook + card + Wompi return params toast (`?id=` + `?status=`)
- `/avaluo/verificar/[slug]`: server component, no auth, publicly accessible, certificate verification card with placeholder rows + TODO for real backend fetch

## Task Commits

1. **Task 1: useAvaluoStatus polling hook** — `69aa649` (feat)
2. **Task 2: WompiPayButton + AvaluoEstadoCard** — `fe41215` (feat)
3. **Task 3: estado/[submissionId] + verificar/[slug] pages** — `e162251` (feat)

## Files Created/Modified

- `src/lib/hooks/use-avaluo-status.ts` — polling hook, 15s interval, terminal-state stop
- `src/components/avaluo/WompiPayButton.tsx` — Wompi checkout initiator
- `src/components/avaluo/AvaluoEstadoCard.tsx` — status display + conditional CTA per state
- `src/app/avaluo/estado/[submissionId]/page.tsx` — status tracking page (client)
- `src/app/avaluo/verificar/[slug]/page.tsx` — certificate verification page (server, no auth)

## Decisions Made

- `useEffect` keyed on `[submissionId, statusData?.status]` so the effect re-runs when the status changes to a terminal value, clearing the interval reactively
- `WompiPayButton` only renders inside `AvaluoEstadoCard` when `status === 'firmado'` — single entry point for payment
- `verificar/[slug]` is a server component: SEO-friendly, no auth middleware needed, publicly accessible
- `ForceLightMode` from `/avaluo` layout not re-applied in child pages — inherited automatically
- Wompi return toast is informational; status is re-fetched from backend independently

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in `cotizador`/`cobranza` components (missing `recharts`/`@react-pdf/renderer` modules) are unrelated to this plan.

## User Setup Required

None — no external service configuration required for this plan. Wompi keys (`WOMPI_INTEGRITY_SECRET`, `WOMPI_PUBLIC_KEY`) were set up in plan 34-02.

## Next Phase Readiness

- Status polling + payment flow complete; ready for 34-05 (admin/review panel)
- `verificar/[slug]` has TODO for real backend fetch when `/verificar/:slug` endpoint is exposed
- All 5 plans in phase 34: 34-01 ✅, 34-02 ✅, 34-03 ✅, 34-04 ✅ — 34-05 remaining

---
*Phase: 34-avaluos-ui*
*Completed: 2026-06-03*

## Self-Check: PASSED

- FOUND: src/lib/hooks/use-avaluo-status.ts
- FOUND: src/components/avaluo/WompiPayButton.tsx
- FOUND: src/components/avaluo/AvaluoEstadoCard.tsx
- FOUND: src/app/avaluo/estado/[submissionId]/page.tsx
- FOUND: src/app/avaluo/verificar/[slug]/page.tsx
- FOUND commits: 69aa649, fe41215, e162251
