---
phase: v7-01-fundacion-limpieza
plan: 04
subsystem: ui
tags: [nav, sidebar, i18n, inquilino, tenant, dead-code]

# Dependency graph
requires:
  - phase: v7-01-fundacion-limpieza
    provides: "PlanSidebar canonical layout + useUnreadMessages hook + tenant nav i18n keys"
provides:
  - "Tenant sidebar nav exposes Notificaciones / Perfil / Configuración (previously header-dropdown-only)"
  - "Mensajes nav badge wired to the real unread count (useUnreadMessages), no hardcoded value"
  - "Dead TenantDashboardSidebar.tsx removed (0 importers)"
affects: [portal-inquilino, tenant-navigation, notificaciones, perfil, configuracion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tenant nav items live only in useTenantNavItems() → PlanSidebar (single source); dead parallel sidebar removed"
    - "Missing i18n keys use the locale === 'es' ? … : … literal form (t() renders the raw key on miss)"

key-files:
  created: []
  modified:
    - src/app/inquilino/layout.tsx
  deleted:
    - src/components/tenant/TenantDashboardSidebar.tsx

key-decisions:
  - "Notificaciones uses a locale literal (no nav.notifications key exists in the tenant dict); Perfil/Configuración use existing t('nav.profile') / t('nav.settings')"
  - "Mensajes badge = unreadCount > 0 ? unreadCount : undefined — no fabricated count"

patterns-established:
  - "Extend nav via useTenantNavItems() only; PlanSidebar shell is used as-is (DESIGN.md §4)"

requirements-completed: [BASE-04]

# Metrics
duration: ~15min
completed: 2026-07-17
---

# Phase v7-01 Plan 04: Nav items + delete dead code Summary

**Tenant sidebar now exposes Notificaciones/Perfil/Configuración with a real Mensajes unread badge, and the dead `TenantDashboardSidebar.tsx` (0 importers) was deleted.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 1 (`src/app/inquilino/layout.tsx`)
- **Files deleted:** 1 (`src/components/tenant/TenantDashboardSidebar.tsx`)

## Accomplishments
- Added three nav items to `useTenantNavItems()`: Notificaciones (`/inquilino/notificaciones`, Bell), Perfil (`/inquilino/perfil`, UserCircle), Configuración (`/inquilino/configuracion`, Gear). The header dropdown links stay intact (sidebar + header both).
- Replaced the hardcoded Mensajes `badge: 2` with `badge: unreadCount > 0 ? unreadCount : undefined`, wiring `useUnreadMessages()` from `@/lib/hooks/useMessages`.
- Deleted the confirmed-dead `TenantDashboardSidebar.tsx` (re-verified 0 importers before removal; barrel `index.ts` never exported it).

## Task Commits

Both tasks (nav add + dead-code delete) committed atomically in ONE commit per plan instruction:

1. **Task 1 + Task 2** - committed together in this SUMMARY's own commit (see `git log -1` on branch `plan/v7.0-portal-inquilino`) (feat)

## Files Created/Modified
- `src/app/inquilino/layout.tsx` — Added Bell/UserCircle/Gear phosphor imports + `useUnreadMessages` import; `useTenantNavItems()` now calls `useUnreadMessages()`, replaces `badge: 2` with real `unreadCount`, appends the three nav items.
- `src/components/tenant/TenantDashboardSidebar.tsx` — Deleted (dead code, 0 importers).

## Decisions Made
- `nav.notifications` does not exist in the tenant i18n dict (only `profile`/`settings` do). `t()` returns the raw key string on a miss, so `t('nav.notifications') ?? 'Notificaciones'` from the plan's example would have rendered `nav.notifications` in the UI. Used the `locale === 'es' ? 'Notificaciones' : 'Notifications'` literal form already used by the existing "Explorar" item — this matches the plan's explicit fallback instruction ("otherwise use the locale === 'es' ? … : … literal form").
- Perfil/Configuración use the existing `t('nav.profile')` / `t('nav.settings')` keys (present in both es.json and en.json).

## Deviations from Plan

**1. [Rule 1 - Bug avoidance] Notificaciones label uses locale literal instead of `t('nav.notifications') ?? '…'`**
- **Found during:** Task 1
- **Issue:** The plan's example used `t('nav.notifications') ?? 'Notificaciones'`, but `nav.notifications` has no key in the tenant nav dict and `t()` returns the raw key (not null/undefined) on a miss, so the `??` fallback never fires and the UI would display `nav.notifications`.
- **Fix:** Used `locale === 'es' ? 'Notificaciones' : 'Notifications'`, matching the existing "Explorar" item and the plan's stated fallback path.
- **Files modified:** src/app/inquilino/layout.tsx
- **Verification:** Grep gate GATE_OK; build.
- **Committed in:** same commit as this SUMMARY

---

**Total deviations:** 1 (Rule 1). **Impact:** No scope creep — correctness fix aligned with the plan's own fallback instruction.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- BASE-04 satisfied; this is the last plan of phase v7-01. Tenant nav + dead-code cleanup complete.
- The three destination routes (`/inquilino/notificaciones`, `/inquilino/perfil`, `/inquilino/configuracion`) already exist in the app.

## Self-Check: PASSED
- `src/app/inquilino/layout.tsx` — MODIFIED (contains `/inquilino/notificaciones`, `/inquilino/perfil`, `/inquilino/configuracion`, `useUnreadMessages`; no `badge: 2`). GATE_OK.
- `src/components/tenant/TenantDashboardSidebar.tsx` — DELETED; `grep -rn TenantDashboardSidebar src/` returns zero. GATE_OK.
- `pnpm build` — PASSED (exit 0).
- `pnpm test` — 582 passed / 7 failed (589), identical to the documented pre-existing baseline in `deferred-items.md`. 0 new failures.

---
*Phase: v7-01-fundacion-limpieza*
*Completed: 2026-07-17*
