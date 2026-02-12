---
phase: 21-decision-system
plan: 02
subsystem: ui
tags: [decisions, counter, badge, sidebar, history, beta, react]

requires:
  - phase: 21-decision-system
    plan: 01
    provides: "PendingDecision types, DecisionCard component, selectDecisionOption in useBetaChat"

provides:
  - "Pending decisions counter badge in sidebar Decisiones tab"
  - "DecisionHistory component with pending/resolved grouping"
  - "allDecisions computed value (cross-conversation decision aggregation)"
  - "pendingDecisionsCount computed value"

affects: [22-daily-briefing, 24-api-client]

tech-stack:
  added: []
  patterns:
    - "Cross-conversation computed aggregation (allDecisions flatMap)"
    - "Counter badge pattern reusable for briefing notifications"
    - "DecisionEntry type for flattened decision-with-context data"

key-files:
  created:
    - "src/components/beta/DecisionHistory.tsx"
  modified:
    - "src/lib/hooks/useBetaChat.ts"
    - "src/components/beta/BetaSidebar.tsx"

key-decisions:
  - "DecisionEntry type as flat array (not grouped map) for simpler rendering"
  - "Category badge uses AGENT_METADATA color tokens via template literals"
  - "Pending first, resolved second in DecisionHistory for action-priority UX"

patterns-established:
  - "Counter badge pattern: indigo pill with animate-in, hidden when 0"
  - "Cross-conversation aggregation via conversations.flatMap"

duration: 3min
completed: 2026-02-10
---

# Phase 21 Plan 02: Decision Counter Badge, Sidebar History Summary

**Pending decisions counter badge on Decisiones tab + decision history panel with pending/resolved grouping and conversation navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T17:07:36Z
- **Completed:** 2026-02-10T17:10:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Pending decisions counter badge on BetaSidebar Decisiones tab (indigo pill, animates in/out)
- DecisionHistory component with Pendientes/Resueltas sections
- allDecisions and pendingDecisionsCount computed from all conversations
- Click-to-navigate from decision entry to source conversation

## Task Commits

Each task was committed atomically:

1. **Task 1: Pending decisions counter and useBetaChat extension** - `7285eb3` (feat)
2. **Task 2: Decisions tab content (history view)** - `b310ab8` (feat)

## Files Created/Modified
- `src/components/beta/DecisionHistory.tsx` - Decision history panel with pending/resolved grouping
- `src/lib/hooks/useBetaChat.ts` - Added DecisionEntry type, pendingDecisionsCount, allDecisions
- `src/components/beta/BetaSidebar.tsx` - Counter badge on Decisiones tab, DecisionHistory in tab content

## Decisions Made
- DecisionEntry as a flat array rather than grouped map — simpler to render and filter
- Category badge uses AGENT_METADATA color tokens for consistency with agent activity display
- Pending decisions listed before resolved for action-priority UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21 (Decision System) complete: types, card component, counter badge, and history all implemented
- Counter badge pattern reusable for Phase 22 briefing notifications (BRFG-05)
- allDecisions data structure ready for Phase 24 API client types
- Ready for Phase 22 (Daily Briefing)

---
*Phase: 21-decision-system*
*Completed: 2026-02-10*
