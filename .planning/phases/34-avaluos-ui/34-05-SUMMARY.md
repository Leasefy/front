---
phase: 34-avaluos-ui
plan: 05
subsystem: ui
tags: [avaluo, panel, next14, typescript, tailwind, phosphor-icons]

# Dependency graph
requires:
  - phase: 34-03
    provides: AvaluoProvider, AvaluoWizardShell, step components (StepInmueble/Contacto/Fotos/Confirmacion)
  - phase: 34-04
    provides: useAvaluoStatus hook, AvaluoEstadoCard component with WompiPayButton + download link

provides:
  - Agency panel avalúos list page with STATUS_BADGE badges and honest empty state
  - Panel nuevo wizard reusing exact same components (email pre-filled from AuthContext)
  - Panel avalúo detail page reusing useAvaluoStatus + AvaluoEstadoCard

affects: [panel/inmobiliaria, 34-avaluos-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Same wizard components in two contexts (public + authenticated panel) via AvaluoProvider initialEmail"
    - "AuthContext null-safe pattern: useContext(AuthContext)?.user?.email ?? ''"
    - "Honest empty state using EmptyState + FileMagnifyingGlass icon for list pages with pending backend"

key-files:
  created:
    - src/app/panel/inmobiliaria/avaluos/page.tsx
    - src/app/panel/inmobiliaria/avaluos/nuevo/page.tsx
    - src/app/panel/inmobiliaria/avaluos/[id]/page.tsx
  modified: []

key-decisions:
  - "useAgencyAvaluos returns [] with TODO comment — backend list endpoint not yet defined; honest empty state instead of fabricated rows"
  - "On submit, AvaluoContext routes to /avaluo/estado/[id] (public status page acceptable for v1 panel users)"
  - "No ForceLightMode in any panel page — parent layout provides auth/sidebar/theme"

patterns-established:
  - "AvaluoListItem defined locally in the page that needs it (not in lib/types) — endpoint shape not yet confirmed by backend"
  - "Panel detail page reuses AvaluoEstadoCard directly — no new component; WompiPayButton + download already inside"

# Metrics
duration: 12min
completed: 2026-06-03
---

# Phase 34 Plan 05: Avalúos Panel Pages Summary

**Three panel pages integrating avalúos into the agency dashboard: list with STATUS_BADGE badges, nuevo wizard reusing AvaluoProvider/AvaluoWizardShell with email pre-filled from AuthContext, and detail page reusing useAvaluoStatus + AvaluoEstadoCard — no wizard duplication**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-03T23:02:52Z
- **Completed:** 2026-06-03T23:15:12Z
- **Tasks:** 2 (Task 1: list page; Task 2: nuevo + detail pages)
- **Files modified:** 3 created, 0 modified

## Accomplishments

- Agency avalúos list at `/panel/inmobiliaria/avaluos` with STATUS_BADGE, honest empty state via EmptyState, and primary CTA
- Panel nuevo wizard at `/panel/inmobiliaria/avaluos/nuevo` — identical components to public `/avaluo/nuevo`, email pre-filled from `useContext(AuthContext)?.user?.email`
- Panel detail at `/panel/inmobiliaria/avaluos/[id]` — reuses `useAvaluoStatus` polling hook and `AvaluoEstadoCard` (handles all states including WompiPayButton on `firmado`, download on `entregado`)
- Zero ForceLightMode in any panel page (panel layout owns auth/sidebar/theme)

## Task Commits

Each task was committed atomically:

1. **Task 1: Panel avalúos list page** - `2748c09` (feat)
2. **Task 2: Panel nuevo wizard + detail page** - `499aec2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/panel/inmobiliaria/avaluos/page.tsx` — List page with AvaluoListItem type, useAgencyAvaluos stub, EmptyState, STATUS_BADGE rows, Link to detail
- `src/app/panel/inmobiliaria/avaluos/nuevo/page.tsx` — Authenticated wizard: AvaluoProvider(initialEmail) + AvaluoWizardShell + AvaluoSteps inner component
- `src/app/panel/inmobiliaria/avaluos/[id]/page.tsx` — Detail page: useAvaluoStatus + AvaluoEstadoCard + back nav

## Decisions Made

- `useAgencyAvaluos` returns `[]` with a `// TODO` comment — the backend list endpoint is not yet defined. EmptyState renders honestly rather than fabricating mock rows.
- On wizard submit, `AvaluoContext.submitAvaluo` routes to `/avaluo/estado/[id]` (public page) — acceptable for v1 since that page is auth-agnostic.
- No new wizard created: the panel nuevo page uses the exact same `AvaluoSteps` inner component pattern as the public page, wrapping the same 4 step components.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong Phosphor icon name `FileSearch`**
- **Found during:** Task 1 (list page)
- **Issue:** `FileSearch` is not exported from `@phosphor-icons/react`; `tsc --noEmit` caught the error
- **Fix:** Changed import to `FileMagnifyingGlass` (the correct Phosphor icon with matching semantics)
- **Files modified:** `src/app/panel/inmobiliaria/avaluos/page.tsx`
- **Verification:** `tsc --noEmit` passes for all three avaluos files
- **Committed in:** `2748c09` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — wrong icon name caught by TypeScript)
**Impact on plan:** Trivial fix; no scope change.

## Issues Encountered

None — plan executed cleanly after auto-fixing the icon name.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 34 (avaluos-ui) is now complete — all 5 plans done (34-01 through 34-05). The avalúos flow covers:
- Public landing + types (34-01)
- Wompi session route with SHA-256 integrity (34-02)
- Wizard UI + AvaluoContext (34-03)
- Status polling + WompiPayButton + AvaluoEstadoCard (34-04)
- Agency panel integration (34-05)

**Remaining wiring (backend-dependent):**
- Replace `useAgencyAvaluos` stub with real `GET /api/avaluo?agencyId=<id>` call
- Backend list endpoint returns `AvaluoListItem[]`

---
*Phase: 34-avaluos-ui*
*Completed: 2026-06-03*
