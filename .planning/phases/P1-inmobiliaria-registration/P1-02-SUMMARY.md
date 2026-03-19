---
phase: P1-inmobiliaria-registration
plan: P1-02
subsystem: inmobiliaria
tags: [invitation, onboarding, public-routes, middleware, dashboard]
dependency_graph:
  requires: [P1-01-SUMMARY.md]
  provides: [invitation-page, onboarding-checklist]
  affects: [src/app/panel/inmobiliaria/page.tsx, src/middleware.ts]
tech_stack:
  added: []
  patterns: [useState+useEffect data fetching, cleanup flag for unmount]
key_files:
  created:
    - src/app/invitacion/[token]/page.tsx
    - src/app/invitacion/[token]/loading.tsx
    - src/lib/hooks/useInvitation.ts
    - src/lib/hooks/useAgencyOnboardingStatus.ts
    - src/components/inmobiliaria/OnboardingChecklist.tsx
    - src/middleware.ts
  modified:
    - src/app/panel/inmobiliaria/page.tsx
decisions:
  - AlertCircle does not exist in @phosphor-icons/react — use Warning icon (matches existing codebase pattern)
  - useAgencyOnboardingStatus uses distinct filename to avoid colliding with existing use-onboarding-status.ts (tenant hook)
  - Middleware is pass-through only — documents public routes for when server-side auth is added
  - Decline action navigates away even on network error (UX: user intent is clear)
  - useInvitation uses cleanup flag (cancelled) to prevent setState after unmount
metrics:
  duration: 14 min
  completed: 2026-03-11
---

# Phase P1 Plan 02: Invitation Page + Onboarding Widget Summary

**One-liner:** Public invitation acceptance page at `/invitacion/[token]` with 4 states (loading/valid/expired/invalid) and an admin-only onboarding checklist widget in the inmobiliaria dashboard.

## What Was Built

### 1. `useInvitation(token)` hook

Fetches `GET /inmobiliaria/agency/invitations/{token}` from the backend. Returns status `loading | valid | expired | invalid` and the `InvitationInfo` object when valid. Uses cleanup flag to prevent state updates after unmount.

### 2. `useAgencyOnboardingStatus()` hook

Returns mock setup checklist steps for ADMIN users. Includes completion percentage. Ready to be wired to `GET /inmobiliaria/agency/onboarding-status` when backend endpoint is available. Named `useAgencyOnboardingStatus` to avoid collision with the existing tenant `use-onboarding-status.ts`.

### 3. `OnboardingChecklist` component

Card with indigo border, progress bar, and step list. Self-hides when `isComplete === true` or `!isAdmin`. Renders above the KPI grid in the inmobiliaria dashboard.

### 4. `/invitacion/[token]` page

Public page (no login required to view). Four visual states:
- **Loading:** spinner while auth + token validate
- **Invalid (404/error):** XCircle + "not found" + go home button
- **Expired (400/410):** Warning icon + "ask admin to resend"
- **Valid, not logged in:** agency header + role card + login/register/decline buttons
- **Valid, logged in:** personalized greeting + accept (POST /accept → redirect /panel/inmobiliaria) + decline (POST /decline → redirect /)

### 5. `loading.tsx`

Skeleton loading file for Next.js Suspense fallback.

### 6. `src/middleware.ts`

Pass-through middleware documenting public routes. Establishes the matcher config so `/invitacion` is explicitly noted as public for when server-side auth middleware is added.

### 7. Dashboard Integration

`OnboardingChecklist` imported and rendered after the header in `InmobiliariaDashboardContent`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AlertCircle icon does not exist in @phosphor-icons/react**
- **Found during:** TypeScript compilation after Task 1/2
- **Issue:** Plan specified `AlertCircle` for expired state, but this icon name doesn't exist in the installed Phosphor version
- **Fix:** Replaced with `Warning` — the icon used throughout the rest of the codebase for warning states
- **Files modified:** `src/app/invitacion/[token]/page.tsx`
- **Commit:** 62f6cae

**2. [Rule 2 - Naming] Renamed hook to avoid collision**
- **Found during:** Task 5 planning
- **Issue:** `src/lib/hooks/use-onboarding-status.ts` already exists (tenant hook with identical export name)
- **Fix:** Named the new hook file `useAgencyOnboardingStatus.ts` with export `useAgencyOnboardingStatus()` to avoid ambiguity
- **Files modified:** N/A (naming choice made before creation)

## Self-Check

Checking created files exist:

All 6 created files: FOUND
All 5 task commits: FOUND (7d5c771, d79a7af, b5a2174, 0635a06, 8911f59)
TypeScript compilation: PASSED (0 new errors)

## Self-Check: PASSED
