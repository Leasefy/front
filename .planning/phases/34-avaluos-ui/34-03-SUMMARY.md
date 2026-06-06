---
phase: 34-avaluos-ui
plan: "03"
subsystem: ui
tags: [react-context, wizard, s3-upload, habeas-data, avaluo, next-app-router]

# Dependency graph
requires:
  - phase: 34-avaluos-ui
    provides: "AvaluoFormData types, avaluo.service (photoPresign, uploadPhotoToS3, submitIntake), /avaluo layout"
provides:
  - AvaluoContext with step validation, nav and submitIntake wiring
  - AvaluoWizardShell (4-step vertical stepper + WizardNavigation footer)
  - StepInmueble (address/city/propertyType/areaM2 + optional estrato/bedrooms/bathrooms)
  - StepContacto (email + 3 Ley 1581 Checkbox components, auth-aware via useContext)
  - StepFotos (S3 upload via uploadPhotoToS3, photoKeys stored in context)
  - StepConfirmacion (read-only summary, no payment UI)
  - /avaluo/nuevo public page
affects: [34-04, 34-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AvaluoContext mirrors ApplicationContext pattern (thin provider + useX() hook that throws outside)
    - StepContacto uses useContext(AuthContext) NOT useAuth() to avoid throw outside AuthProvider
    - Photo upload: presign → PUT to S3 → store key in formData.photoKeys (adapted from StepPhotos.tsx)
    - Three separate Checkbox instances for Ley 1581 consents — NEVER bundled

key-files:
  created:
    - src/components/avaluo/AvaluoContext.tsx
    - src/components/avaluo/AvaluoWizardShell.tsx
    - src/components/avaluo/StepInmueble.tsx
    - src/components/avaluo/StepContacto.tsx
    - src/components/avaluo/StepFotos.tsx
    - src/components/avaluo/StepConfirmacion.tsx
    - src/app/avaluo/nuevo/page.tsx
  modified: []

key-decisions:
  - "useContext(AuthContext) instead of useAuth() in StepContacto — useAuth() throws outside AuthProvider; /avaluo/nuevo is a public route without AuthProvider"
  - "Three separate Checkbox components for Ley 1581 (purposeAvaluo/purposeDataset/purposeContacto) — bundling would violate habeas data granularity"
  - "StepFotos stores S3 keys (not blob URLs) in formData.photoKeys — keys are what the backend needs; previews via uploading state"
  - "canProceed = isStepValid(currentStep) passed directly to WizardNavigation.isValid — no separate attempted-advance logic needed for this simpler flow"
  - "No payment logic in any avaluo component — Wompi is handled by 34-02 server route, never referenced in src/components/avaluo"

patterns-established:
  - "AvaluoContext: flat useState + useMemo + useCallback; no localStorage (public form, no persistence needed)"
  - "isStepValid(): pure function of formData — step 2 requires email regex AND purposeAvaluo===true"
  - "submitAvaluo(): maps machine error codes (rate_limit, validation_error, service_unavailable) to Rioplatense Spanish user messages"

# Metrics
duration: 7min
completed: 2026-06-03
---

# Phase 34 Plan 03: Avalúo Wizard UI Summary

**4-step public avalúo intake wizard: AvaluoContext + shell + 4 step components + /avaluo/nuevo page, with S3 photo upload and Ley 1581 granular consent checkboxes**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-03T22:38:16Z
- **Completed:** 2026-06-03T22:45:20Z
- **Tasks:** 3
- **Files created:** 7

## Accomplishments

- AvaluoContext with step validation (email regex + purposeAvaluo gating for step 2), navigation clamped to 1..4, submitAvaluo with Spanish error mapping
- AvaluoWizardShell with 4-item vertical stepper (mirrors WizardShell pattern), WizardNavigation footer, submitError red alert
- StepInmueble: address/city/propertyType (Select)/areaM2 required; estrato/bedrooms/bathrooms optional grid
- StepContacto: auth-aware via useContext(AuthContext) (not useAuth()); 3 separate Checkbox components for Ley 1581 habeas data consents
- StepFotos: drag-and-drop + file input, calls uploadPhotoToS3, per-file spinner, stores S3 keys in formData.photoKeys, errors via sonner toast
- StepConfirmacion: read-only summary (address, city, type, area, email, consents, photo count), no payment UI
- /avaluo/nuevo page: AvaluoProvider wrapper + AvaluoWizardShell + AvaluoSteps switcher (all inside provider)

## Task Commits

Each task was committed atomically:

1. **Task 1: AvaluoContext** - `a5cae54` (feat)
2. **Task 2: AvaluoWizardShell + StepInmueble + StepConfirmacion** - `fd5781c` (feat)
3. **Task 3: StepContacto + StepFotos + /avaluo/nuevo** - `b81f551` (feat)

## Files Created/Modified

- `src/components/avaluo/AvaluoContext.tsx` — Provider + useAvaluo() hook, 4-step validation, submitIntake wiring
- `src/components/avaluo/AvaluoWizardShell.tsx` — Vertical stepper shell adapted from WizardShell.tsx
- `src/components/avaluo/StepInmueble.tsx` — Step 1: property data form
- `src/components/avaluo/StepContacto.tsx` — Step 2: email + 3 Ley 1581 Checkbox components
- `src/components/avaluo/StepFotos.tsx` — Step 3: S3 photo upload with per-file spinner
- `src/components/avaluo/StepConfirmacion.tsx` — Step 4: read-only summary, no payment UI
- `src/app/avaluo/nuevo/page.tsx` — Public /avaluo/nuevo page entry

## Decisions Made

- Used `useContext(AuthContext)` directly in StepContacto instead of `useAuth()` — the avaluo wizard is a public route rendered outside AuthProvider; `useAuth()` throws in that case
- Three separate `<Checkbox>` instances for Ley 1581 consents — never bundled, each has its own `id`, `checked`, `onCheckedChange` per the legal requirement for granular consent
- No payment logic added anywhere in `src/components/avaluo/` — Wompi session is handled upstream by the 34-02 server route
- `formData.areaM2` typed as `number | ""` (from types file) to allow clearing the field without type coercion

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TSC errors (recharts, @react-pdf/renderer, @playwright/test — all missing in dev environment) are unrelated to this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 files created and TypeScript-clean (no new errors introduced)
- 34-04 (Confirmation + status polling page) can build on `useAvaluo()` and the `/avaluo/estado/:id` route that submitAvaluo navigates to
- 34-05 (Admin/review panel) reads from the same AvaluoStatus types established in 34-01

## Self-Check: PASSED

- All 7 files exist on disk: verified
- Commits a5cae54, fd5781c, b81f551: verified via git log
- No Wompi/payment references in src/components/avaluo/: verified (only comment text)
- useAuth() not called in StepContacto: verified
- 3 Checkbox usages in StepContacto: verified (4 occurrences = 1 import + 3 JSX)
- npx tsc --noEmit: exit code 0 (pre-existing errors only, no new errors)

---
*Phase: 34-avaluos-ui*
*Completed: 2026-06-03*
