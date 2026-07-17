---
phase: v7-01-fundacion-limpieza
plan: 02
subsystem: ui
tags: [tenant-portal, profile, auth, settings-api, supabase, colombia, habeas-data]

# Dependency graph
requires:
  - phase: v7-01-fundacion-limpieza
    provides: "Auth context (useAuth.updateProfile), settingsApi.deleteAccount/uploadAvatar, useLeases/useMyPaymentRequests hooks"
provides:
  - "Real tenant profile read/write bound to useAuth().user + PATCH /users/me"
  - "Real account deletion (ARCO) via settingsApi.deleteAccount() + supabase signOut"
  - "Colombia-localized profile (Cédula label, +57, es-CO, COP) — Chilean RUT/+56/CLP mock removed"
  - "Identity Quick Stats derived from real lease/payment hooks (no fabricated counts)"
affects: [portal-inquilino, v7-02, v7-03, habeas-data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Landlord/tenant profile twins share the same seed→updateProfile→deleteAccount contract"
    - "Single-field name/emergency inputs split via handleNameChange/handleEmergencyContactChange"

key-files:
  created: []
  modified:
    - src/app/inquilino/perfil/page.tsx

key-decisions:
  - "Preserved the legacy `rut` formData key (auth+backend identity contract); only the visible label became 'Cédula'"
  - "Wired Quick Stats to real hooks (useLeases + useMyPaymentRequests) instead of removing — honest counts over deletion"
  - "Gated the delete-modal 'active lease' warning behind the real activeLeaseCount (was an unconditional fabricated claim)"

patterns-established:
  - "Tenant profile mirrors the wired landlord twin 1:1 for seed/save/delete"
  - "Empty user.* fields render empty/placeholder (honest), never a leftover demo literal"

requirements-completed: [BASE-02]

# Metrics
duration: ~20min
completed: 2026-07-17
---

# Phase v7-01 Plan 02: Perfil Colombia real Summary

**Tenant profile converted from a Chilean `setTimeout` mock into a real get/save surface: seeds from `useAuth().user`, saves via `updateProfile()` (PATCH /users/me), deletes via `settingsApi.deleteAccount()` + supabase signOut, and is fully Colombianized (Cédula label, +57, es-CO, COP) with fabricated identity stats replaced by real hook-derived counts.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Personal-info save now calls `updateProfile({ firstName, lastName, phone, address, birthDate })`; emergency-contact save calls `updateProfile({ emergencyContactName, emergencyContactPhone })` — both wrapped in try/catch with `toast.success` ONLY on success and `toast.error` on failure (no unconditional success).
- Avatar save performs a real multipart `settingsApi.uploadAvatar(avatarFile)`; added `avatarFile` state so the real File is uploaded (not the preview data-URL).
- Account deletion performs the real ARCO effect: `await settingsApi.deleteAccount()` → `getSupabase()?.auth.signOut()` → goodbye step → `router.push('/')`. The type-"ELIMINAR" confirm gate is preserved; the success step never shows without the persisted backend effect.
- Colombianized: form seeded from `user` with Colombian fallbacks (`+57 300 123 4567`, `1.020.345.678`, `Cra. 7 #71-21, Bogotá`); ID label → `t('landlordProfile.fields.cedula')` ("Cédula"); birthDate locale `es-CL` → `es-CO`; employment-modal `CLP` → `COP` with `$2.500.000` example. No `RUT`/`+56`/`CLP`/`es-CL` remain; the `rut` key is preserved.
- Purged fabricated identity claims: removed "Inquilino desde Enero 2024"; replaced hardcoded "1 Arriendo activo · Departamento Providencia" and "12 Pagos realizados · 100% a tiempo" with real counts from `useLeases().getActive().length` and `useMyPaymentRequests()` APPROVED count, with loading skeletons and honest subtitles.

## Task Commits

1. **Task 1 + Task 2 (single atomic commit)** - the `feat(v7-01): perfil inquilino real get/save/delete + Colombia data (BASE-02)` commit on `plan/v7.0-portal-inquilino` (this same commit) — both grep gates print GATE_OK.

_Committed together: Task 2's label/locale/stat changes live in the same file and cannot be split without leaving the file in an inconsistent Chilean/Colombian mix mid-history._

## Files Created/Modified
- `src/app/inquilino/perfil/page.tsx` — real profile get/save/delete bound to auth context + settingsApi; Colombia localization; real hook-derived Quick Stats.

## Decisions Made
- Kept the legacy `rut` key (identity contract) — only the visible label changed to "Cédula".
- Chose to WIRE Quick Stats to real hooks (the plan's first-choice) rather than remove them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarded empty birthDate against "Invalid Date"**
- **Found during:** Task 2
- **Issue:** The plan seeds `birthDate: user?.birthDate || ''`. `new Date('').toLocaleDateString(...)` renders "Invalid Date". The landlord twin never hits this because it uses a demo-date fallback.
- **Fix:** Render the formatted date only when `formData.birthDate` is truthy; otherwise show "Sin especificar" / "Not set" (honest empty state per DESIGN §11).
- **Files modified:** src/app/inquilino/perfil/page.tsx

**2. [Rule 1 - Bug] Gated the delete-modal "active lease" warning behind real data**
- **Found during:** Task 2
- **Issue:** The delete modal unconditionally asserted "Tienes un arriendo activo" for every tenant — a fabricated claim (PITFALLS 1).
- **Fix:** Wrapped the warning in `{activeLeaseCount > 0 && (...)}` using the real `useLeases` count already available.
- **Files modified:** src/app/inquilino/perfil/page.tsx

---

**Total deviations:** 2 auto-fixed (2 bugs / honesty fixes)
**Impact on plan:** Both fixes are correctness/honesty requirements directly caused by the plan's honest-empty seed and the honest-surface mandate. No scope creep — both use data/patterns already introduced by the plan.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BASE-02 satisfied: tenant profile loads from and saves to the real `/users/me` API with Colombia data; the `rut` contract key is preserved; all `setTimeout` theater removed.
- The employment-verify modal still submits nothing real (relabeled to COP only, per plan scope) — a future plan can wire it if employment verification is productized.

---
*Phase: v7-01-fundacion-limpieza*
*Completed: 2026-07-17*
