---
phase: P1
plan: 03
subsystem: inmobiliaria-registration
tags: [api-client, types, i18n, dark-mode, build]
dependency_graph:
  requires: [P1-01, P1-02]
  provides: [agencyApi, InvitationInfo, AgencyOnboardingStatus, i18n-strings]
  affects: [useInvitation, useAgencyOnboardingStatus, inmobiliaria.service.ts]
tech_stack:
  patterns:
    - "agencyApi namespace in inmobiliaria.service.ts for registration endpoints"
    - "Canonical types in inmobiliaria.ts imported by hooks (not redefined locally)"
    - "i18n keys: registration.*, invitation.*, onboarding.checklist.*, onboarding.wizard.*"
key_files:
  created: []
  modified:
    - src/lib/api/inmobiliaria.service.ts
    - src/lib/types/inmobiliaria.ts
    - src/lib/hooks/useInvitation.ts
    - src/lib/hooks/useAgencyOnboardingStatus.ts
    - src/lib/i18n/locales/es.json
    - src/lib/i18n/locales/en.json
    - src/components/inmobiliaria/AgencySetupWizard.tsx
    - src/components/inmobiliaria/wizard/AgencyBasicForm.tsx
    - src/components/inmobiliaria/wizard/AgencyOperationsForm.tsx
    - src/components/inmobiliaria/wizard/InviteFirstMemberForm.tsx
decisions:
  - "AgencyMemberRole canonical type lives in inmobiliaria.ts (same shape as auth/types.ts AgencyMemberRole)"
  - "agencyApi added as named export in inmobiliaria.service.ts (not a new service file)"
  - "Hooks re-export canonical types for backwards compatibility"
  - "MOCK_STEPS array in useAgencyOnboardingStatus remains — swap for agencyApi.getOnboardingStatus() when backend ready"
metrics:
  duration: "~20min"
  completed_date: "2026-03-11"
  tasks_completed: 6
  tasks_total: 6
---

# Phase P1 Plan 03: API Client, i18n & QA Summary

API client methods, TypeScript types, i18n strings, dark mode fixes, and build validation for the inmobiliaria registration flow.

## What Was Done

### Task 1 — API client methods (`inmobiliaria.service.ts`)

Added `agencyApi` namespace with 5 typed methods:

- `getInvitation(token)` — GET `/inmobiliaria/agency/invitations/:token`
- `acceptInvitation(token)` — POST `/inmobiliaria/agency/invitations/:token/accept`
- `declineInvitation(token)` — POST `/inmobiliaria/agency/invitations/:token/decline`
- `resendInvitation(memberId)` — POST `/inmobiliaria/agency/members/:memberId/resend-invitation`
- `getOnboardingStatus()` — GET `/inmobiliaria/agency/onboarding-status`

Also added 3 new type imports to the service: `InvitationInfo`, `AgencyMember`, `AgencyOnboardingStatus`.

### Task 2 — TypeScript types (`inmobiliaria.ts`)

Added 5 new exported types at the end of the file:

- `AgencyMemberRole` — union type `'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER'`
- `AgencyMember` — backend member object with status/role/dates
- `InvitationInfo` — returned by public invitation token endpoint
- `OnboardingStep` — single step in the agency setup checklist
- `AgencyOnboardingStatus` — full checklist response shape

### Task 3 — i18n strings (`es.json` + `en.json`)

Added 4 new top-level sections to both locale files:

- `registration.accountType.inmobiliaria` — role selection card text
- `registration.agencyFields.*` — wizard form labels and placeholders
- `invitation.*` — all strings for `/invitacion/[token]` page (states, buttons, roles)
- `onboarding.checklist.*` — checklist widget strings
- `onboarding.wizard.*` — setup wizard strings

Both JSON files validated with `node -e JSON.parse(...)` before committing.

### Task 4 — Hooks updated to canonical types

- `useInvitation.ts` — removed local `InvitationInfo` definition, imports from `@/lib/types/inmobiliaria`, re-exports for backwards compatibility
- `useAgencyOnboardingStatus.ts` — removed local `AgencyOnboardingStep`, imports `OnboardingStep` from canonical location, keeps `AgencyOnboardingStep` as `@deprecated` alias

### Task 5 — Dark mode verification + fixes

All 4 new P1 wizard components were missing `dark:` variants. Fixed:

- `AgencyBasicForm.tsx` — inputs, labels, icons, placeholder colors
- `AgencyOperationsForm.tsx` — number inputs, suffix text, descriptions
- `InviteFirstMemberForm.tsx` — email input, role option buttons (selected/unselected states)
- `AgencySetupWizard.tsx` — step circles, connector lines, header text, navigation buttons, success state

The invitation page (`/invitacion/[token]`) and `OnboardingChecklist.tsx` already had full dark mode from P1-02.

### Task 6 — Build validation

`npm run build` completed successfully:
- No TypeScript errors
- No build failures
- All pre-existing warnings are unrelated to P1 work

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files modified exist:

- `src/lib/api/inmobiliaria.service.ts` — agencyApi section present
- `src/lib/types/inmobiliaria.ts` — InvitationInfo, AgencyMember, OnboardingStep, AgencyOnboardingStatus present
- `src/lib/i18n/locales/es.json` — registration, invitation, onboarding sections present
- `src/lib/i18n/locales/en.json` — registration, invitation, onboarding sections present

Commits:
- `4e1c632` feat: add API client methods for invitation and onboarding endpoints
- `59e71da` feat: add i18n strings for inmobiliaria registration flow
- `35e3bf2` feat: update hooks to use canonical types
- `4ea5af5` fix: dark mode classes for new P1 wizard components
- `a3f7941` chore: build passes for Phase P1-inmobiliaria-registration

## Self-Check: PASSED
