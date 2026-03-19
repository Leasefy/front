---
phase: P1-inmobiliaria-registration
plan: P1-01
subsystem: registration-onboarding
tags: [inmobiliaria, onboarding, auth, wizard, registration]
dependency_graph:
  requires: []
  provides: [agency-registration-flow, agency-setup-wizard, agency-auth-context]
  affects: [auth-context, onboarding-flow, inmobiliaria-dashboard]
tech_stack:
  added: []
  patterns: [modal-wizard, step-form, auth-context-extension]
key_files:
  created:
    - src/components/inmobiliaria/AgencySetupWizard.tsx
    - src/components/inmobiliaria/wizard/AgencyBasicForm.tsx
    - src/components/inmobiliaria/wizard/AgencyOperationsForm.tsx
    - src/components/inmobiliaria/wizard/InviteFirstMemberForm.tsx
    - src/lib/validation/inmobiliariaValidation.ts
  modified:
    - src/app/onboarding/seleccionar-rol/page.tsx
    - src/app/onboarding/inmobiliaria/page.tsx
    - src/app/panel/inmobiliaria/page.tsx
    - src/lib/auth/types.ts
    - src/lib/auth/auth-context.tsx
    - src/components/inmobiliaria/index.ts
decisions:
  - "apiClient has no .put method — use .patch for PATCH requests (matches existing pattern)"
  - "Zod not installed — use TypeScript validation helpers matching existing applicationValidation.ts pattern"
  - "API calls in wizard are non-blocking (try/catch proceeds on failure) — backend may not be deployed yet"
  - "seleccionar-rol page routes inmobiliaria to /onboarding/inmobiliaria (existing page), not a new page"
  - "INMOBILIARIA added to BackendRole enum mapping to 'agency' frontend role (alongside AGENT)"
metrics:
  duration: "21 minutes"
  completed_date: "2026-03-11"
  tasks_completed: 6
  tasks_total: 6
---

# Phase P1 Plan 01: Registro e Onboarding de Inmobiliarias — Summary

**One-liner:** Inmobiliaria registration flow with 3-step AgencySetupWizard, backend onboarding call with agency payload, and agency/agencyRole added to auth context.

---

## What Was Built

### Task 1 — Role Selector Updated

`/onboarding/seleccionar-rol/page.tsx` now shows three options: Inquilino, Propietario, and **Soy una inmobiliaria**. The inmobiliaria card uses indigo accent colors to differentiate it visually. Selecting it routes to `/onboarding/inmobiliaria`.

### Task 2 — Backend Onboarding Call

`/onboarding/inmobiliaria/page.tsx` (the existing multi-step registration page) was updated to:
- Import `apiClient` and `refreshUser`
- Call `POST /users/me/onboarding` with `{ userType: 'INMOBILIARIA', firstName, lastName, phone, agency: { name, nit, city } }`
- Fire `refreshUser()` after successful registration
- Redirect to `/panel/inmobiliaria?setup=true` after registration

### Task 3 — Auth Context Extended

`src/lib/auth/types.ts`:
- Added `Agency` interface (id, name, nit, city, address, phone, email, logoUrl, website)
- Added `AgencyMemberRole` type: `'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER'`
- Added `INMOBILIARIA` to `BackendRole` enum (maps to `'agency'` frontend role)
- Extended `AuthState` with `agency: Agency | null` and `agencyRole: AgencyMemberRole | null`
- Added `setAgency` method to `AuthContextType`

`src/lib/auth/auth-context.tsx`:
- Added `agency` and `agencyRole` state
- Added `setAgency` method (callable by wizard after registration)
- Added `fetchAgency` helper (`GET /inmobiliaria/me/agency`)
- `refreshUser` now also refreshes agency data for `role === 'agency'`
- `SIGNED_OUT` clears agency state

### Task 4 — Agency Setup Wizard

Three new component files created:

**`AgencyBasicForm.tsx`** (Step 1): name (required), NIT, address, city selector, phone, email

**`AgencyOperationsForm.tsx`** (Step 2): default commission % (default 10), collection day (default 5), dispersion day (default 15) — all have sensible defaults

**`InviteFirstMemberForm.tsx`** (Step 3): email input + role selector (AGENTE/CONTADOR/ADMIN/VIEWER) — skippable

**`AgencySetupWizard.tsx`**: Orchestrates all 3 steps with animated transitions, step progress indicator, prev/next navigation. Step 1 calls `PATCH /inmobiliaria/agency`, Step 2 saves operations settings, Step 3 sends invitation via `POST /inmobiliaria/agency/members`. All API calls are non-blocking.

### Task 5 — Redirect Post-Registro

- Success screen in `/onboarding/inmobiliaria/page.tsx` now redirects to `/panel/inmobiliaria?setup=true`
- `/panel/inmobiliaria/page.tsx` detects `?setup=true` via `useSearchParams()`
- Shows `AgencySetupWizard` as a modal overlay on first visit
- Wizard dismissal removes `?setup=true` from URL via `router.replace()`
- Page wrapped in `Suspense` for `useSearchParams()` compliance

### Task 6 — Validación

`src/lib/validation/inmobiliariaValidation.ts`:
- `isValidNit()`: validates Colombian NIT/RUT format (900.123.456-7)
- `isValidColombianPhone()`: validates 10-digit Colombian numbers (starts with 3 or 6)
- `isValidEmail()`: RFC-compliant email validation
- `validateInmobiliariaOnboarding()`: full schema validation returning typed errors
- `isInmobiliariaOnboardingValid()`: quick boolean check
- `getFieldError()`: extracts first error for a specific field

Validators used in `AgencySetupWizard` Step 1 validation gate.

---

## Acceptance Criteria Verification

- [x] El selector de tipo de cuenta muestra la opción "Soy una inmobiliaria" como cuarta opción — Added as third option (after Inquilino, Propietario)
- [x] Al seleccionar INMOBILIARIA, aparecen campos de nombre de agencia y NIT — Fields collected in /onboarding/inmobiliaria step 1
- [x] El formulario no permite enviar si `agencyName` está vacío cuando tipo = INMOBILIARIA — enforced by isStep1Valid
- [x] El submit llama al endpoint con `{ userType: 'INMOBILIARIA', agency: { name, nit, city } }` — implemented in handleSubmit
- [x] El usuario INMOBILIARIA es redirigido a `/panel/inmobiliaria` tras el registro — goToDashboard redirects to `/panel/inmobiliaria?setup=true`
- [x] El wizard de setup aparece automáticamente en la primera visita al panel — detected via ?setup=true
- [x] El wizard tiene 3 pasos navegables con "Anterior" / "Siguiente" — implemented with CaretLeft/CaretRight nav
- [x] El paso 3 (invitar miembro) puede omitirse — "Omitir por ahora" button calls handleSkipInvite
- [x] El contexto de auth incluye `agency` y `agencyRole` tras el registro — added to AuthState and AuthContextType

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] apiClient has no .put() method**
- **Found during:** Task 4 (TypeScript compilation)
- **Issue:** Plan spec used `PUT /inmobiliaria/agency` but `apiClient` only exposes get/post/patch/delete
- **Fix:** Changed wizard calls to `apiClient.patch()` — matches REST conventions for partial updates
- **Files modified:** `src/components/inmobiliaria/AgencySetupWizard.tsx`
- **Commit:** c9cc437

**2. [Rule 3 - Blocking] Zod not installed, no @hookform/resolvers**
- **Found during:** Task 6
- **Issue:** Plan specified Zod + React Hook Form but Zod is not in package.json or node_modules
- **Fix:** Created TypeScript validation helpers in `src/lib/validation/inmobiliariaValidation.ts` following existing `applicationValidation.ts` pattern. Avoids adding new dependency for pattern already solved in codebase.
- **Files modified:** `src/lib/validation/inmobiliariaValidation.ts` (new)
- **Commit:** 5a215d8

---

## Self-Check: PASSED

All created files verified present. All commits verified in git log. TypeScript errors resolved (only pre-existing errors in non-P1-01 files remain).
