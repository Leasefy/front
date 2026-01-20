---
phase: "08-authentication-ui"
plan: "01"
title: "Auth Pages - Split Layout Design"
subsystem: "authentication"
tags: ["auth", "login", "register", "split-layout", "social-login"]
dependency-graph:
  requires: ["07-ux-polish"]
  provides: ["auth-pages", "auth-components", "social-login-ui"]
  affects: ["08-02-auth-state"]
tech-stack:
  added: ["react-hook-form"]
  patterns: ["split-layout", "tab-toggle", "suspense-boundary"]
key-files:
  created:
    - "src/app/auth/page.tsx"
    - "src/components/auth/AuthForm.tsx"
    - "src/components/auth/AuthInput.tsx"
    - "src/components/auth/SocialButtons.tsx"
    - "src/components/auth/Testimonial.tsx"
    - "src/components/auth/Divider.tsx"
    - "src/components/auth/index.ts"
  modified: []
decisions:
  - id: "auth-layout"
    description: "Split-layout with image+testimonial left, form right"
    rationale: "Creates premium feel, social proof via testimonial"
  - id: "suspense-searchparams"
    description: "Wrap AuthForm in Suspense for useSearchParams"
    rationale: "Next.js 14 requirement for client components using useSearchParams"
  - id: "demo-credentials-hint"
    description: "Show demo login credentials on form"
    rationale: "Enables testing without documentation lookup"
metrics:
  duration: "5m 25s"
  completed: "2026-01-20"
---

# Phase 8 Plan 1: Auth Pages - Split Layout Design Summary

Split-layout auth page with property image left, form right. Social login buttons and email/password form.

## What Was Built

### Auth Page (`/auth`)
- **Split Layout**: Desktop shows 50/50 split, mobile shows form only
- **Left Panel**: Property image background with dark overlay, testimonial card, stats row
- **Right Panel**: Centered auth form with logo, tabs, social buttons, email/password form
- **Responsive**: Mobile-first with lg: breakpoint for split layout

### Auth Components
- **AuthForm**: Login/register tabs, integrates with AuthContext, form validation with react-hook-form
- **AuthInput**: Input with icon (email/password/user), password show/hide toggle, error state
- **SocialButtons**: Google (multi-color icon) and Apple (black icon) styled buttons
- **Testimonial**: Quote card with avatar, name, role - positioned on image panel
- **Divider**: "o continua con email" line-text-line pattern

### Integration
- Uses existing `useAuth` hook from AuthContext
- Supports `returnUrl` query param for redirect after login
- Mock authentication with localStorage persistence
- Demo credentials hint for testing

## Design Decisions

1. **No Glass Effects**: Clean, solid design following Luxterra aesthetic per user requirement
2. **Suspense for useSearchParams**: Required by Next.js 14 for client components
3. **Tab-based mode switching**: Toggle between login/register rather than separate pages
4. **Error state styling**: Muted red background (bg-red-50) with red-600 text

## Verification Results

| Requirement | Status |
|-------------|--------|
| Split layout (image left, form right) | PASS |
| Mobile: form only, centered | PASS |
| Testimonial card on image panel | PASS |
| Login/Register tabs work | PASS |
| Social buttons styled (Google, Apple) | PASS |
| Email/password form with validation | PASS |
| Password show/hide toggle | PASS |
| NO glass effects | PASS |
| Luxterra aesthetic (light grays, 2px radius) | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies Added

- `react-hook-form@7.71.1` - Form validation library

## Next Phase Readiness

Ready for Plan 02 (Auth State) which will:
- Wrap app with AuthProvider
- Add protected route logic to /panel
- Add user menu to navbar
