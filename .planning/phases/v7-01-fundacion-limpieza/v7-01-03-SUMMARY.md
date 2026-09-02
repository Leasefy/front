---
phase: v7-01-fundacion-limpieza
plan: 03
subsystem: ui
tags: [settings, supabase-auth, notifications, habeas-data, tenant-portal]

# Dependency graph
requires:
  - phase: v7-01-fundacion-limpieza
    provides: real tenant-portal surfaces + honest empty-states (v7-01-01/02 pattern)
provides:
  - Tenant config page runs real backend actions (password, data-export, delete, notification prefs)
  - Honest active-sessions surface (real global signOut, no fabricated device list)
affects: [portal-inquilino, settings, config, honesty-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config actions mirror the landlord twin 1:1 (getSupabase().auth + settingsApi + useNotificationSettings)"
    - "No-backend surfaces are honest: disabled row for SMS, real global signOut for sessions"

key-files:
  created:
    - .planning/phases/v7-01-fundacion-limpieza/v7-01-03-SUMMARY.md
  modified:
    - src/app/inquilino/configuracion/page.tsx

key-decisions:
  - "SMS notification row kept but rendered disabled ('No disponible') — no backend field exists, so it must not pretend to persist"
  - "Sessions surface uses the landlord's real global signOut (preferred over an EmptyState) since it is a real action"
  - "Kept tenant literal Spanish toast strings (not landlordSettings.* i18n keys) to avoid referencing keys absent from the tenant surface"

patterns-established:
  - "Tenant config = landlord config handlers copied 1:1, tenant i18n/strings preserved"
  - "SettingToggle gained an optional `disabled` prop for honest no-backend rows"

requirements-completed: [BASE-03]

# Metrics
duration: ~30min
completed: 2026-07-17
---

# Phase v7-01 Plan 03: Config — acciones reales + sesiones honestas Summary

**Tenant config page now runs real Supabase auth (password change + global signOut), real `settingsApi` data-export/account-delete, and persisted notification prefs via `useNotificationSettings` — all `setTimeout` theater and the fabricated `mockSessions` device list removed.**

## Performance

- **Duration:** ~30 min (incl. clearing a full-disk ENOSPC blocker before the build)
- **Completed:** 2026-07-17
- **Tasks:** 2
- **Files modified:** 1 (+ 1 summary created)

## Accomplishments
- **Password change** → `getSupabase().auth.updateUser({ password })` with real error surfacing (was `setTimeout(1500)`).
- **Descargar datos** → `settingsApi.requestDataExport()` builds a real JSON `Blob` and triggers an `<a download="leasefy-datos-YYYY-MM-DD.json">` (real ARCO / Habeas Data export; was `setTimeout(2000)`).
- **Eliminar cuenta** → `settingsApi.deleteAccount()` then `getSupabase()?.auth.signOut()` → `router.push('/')`; type-"ELIMINAR" gate kept; toast success only on real delete (was `setTimeout(2000)`).
- **Notification prefs** persist via `useNotificationSettings().updateSetting(backendKey, value)` (optimistic + revert). Map: email→`emailMessages`, push→`pushAll`, payments→`emailPayments`, marketing→`emailMarketing`. SMS has no backend field → rendered disabled with an honest "No disponible" note.
- **Sessions surface is honest**: `mockSessions`, the `sessions` state, and per-device `handleCloseSession` deleted. Modal now shows the current session read-only (device derived from SSR-guarded `navigator.userAgent`) plus a single real "Cerrar todas las sesiones" → `signOut({ scope: 'global' })` → `router.push('/auth')`. Security-section description no longer references a fabricated `${sessions.length} dispositivos` count.

## Task Commits

1. **Tasks 1+2: real config actions + honest sessions** - `<hash>` (feat) — committed together atomically with the summary per the executor's staging instructions.

## Files Created/Modified
- `src/app/inquilino/configuracion/page.tsx` - Real password/export/delete/notification handlers; honest sessions modal; `SettingToggle` gained a `disabled` prop for the SMS no-backend row.

## Decisions Made
- Preserved the tenant's existing literal Spanish toast strings rather than importing `landlordSettings.*` i18n keys, since those keys are landlord-scoped and may be absent in the tenant surface.
- Chose the landlord's real global-signout surface over a DESIGN.md §11 `<EmptyState>` for sessions (plan allowed either; the real action is preferred).
- SMS row kept but disabled (`opacity-60`, `Switch disabled`) instead of removed, to preserve the UI while staying honest about the missing backend.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Freed disk space to allow `pnpm build`**
- **Found during:** Verification (`pnpm build`)
- **Issue:** `next build` aborted with `ENOSPC: no space left on device` — the data volume had ~176Mi free.
- **Fix:** Removed the gitignored `.next` build cache (2.7G) and cleared the regenerable `~/.npm/_cacache` (22G, unused by this pnpm repo) via `npm cache clean --force`. No git operations, no source files touched.
- **Verification:** Disk went to 25Gi free; `pnpm build` then compiled successfully (`/inquilino/configuracion` → 17.2 kB static route).
- **Committed in:** N/A (environment cleanup, no repo changes)

---

**Total deviations:** 1 auto-fixed (1 blocking — environmental disk cleanup, no code/scope change).
**Impact on plan:** None on scope; build unblocked. Plan implemented exactly as written.

## Verification

- **Grep gate 1** (`auth.updateUser` + `settingsApi.requestDataExport` + `settingsApi.deleteAccount`): `GATE_OK`.
- **Grep gate 2** (`useNotificationSettings` present, `mockSessions` count 0, `signOut({ scope: 'global' })` present, `setTimeout(resolve` count 0): `GATE_OK`.
- **`pnpm build`:** ✓ Compiled successfully; `/inquilino/configuracion` route built.
- **`pnpm test`:** 582 passed / 7 failed / 589 total. All 7 failures are the pre-existing, unrelated suites logged in `deferred-items.md` (inmobiliaria AI asegurabilidad/EquipoAgentes/WorkItemDetalle, cotizador CarrierRegistryTable, risk-levels). No test touches `inquilino/configuracion`; zero new failures introduced.
- **Orphan check:** no remaining refs to `setGear`, `handleToggle`, `handleCloseSession`, `mockSessions`, `setSessions`, or `settings.*` state; all remaining `setTimeout` calls are legit `setTimeout(() => router.push(...))` redirects.

## Issues Encountered
- Full disk (ENOSPC) blocked the initial build — resolved by clearing regenerable caches (see Deviation 1).

## User Setup Required
None - no external service configuration required. All actions use existing Supabase auth + `settingsApi` endpoints already wired on the landlord page.

## Next Phase Readiness
- Tenant config is now honest end-to-end; no fake surfaces remain on this page.
- Note (not a blocker): the `/users/me/*` settings endpoints must be reachable from the tenant role for export/delete/notification persistence to succeed at runtime — smoke-test as `tenant` when the backend is available.

---
*Phase: v7-01-fundacion-limpieza*
*Completed: 2026-07-17*
