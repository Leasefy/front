---
phase: 5
plan: 3
title: Candidate Detail & Decision Workflow
subsystem: landlord-dashboard
tags: [decision-workflow, drawer, notes, localStorage, shadcn]

dependency-graph:
  requires:
    - 05-01 (landlord types, mock data)
    - 05-02 (CandidateCard, CandidateList)
    - 04 (RiskScoreDisplay, AIExplanation)
  provides:
    - Decision state management (localStorage)
    - Full candidate detail drawer
    - Notes functionality
    - Confirmation dialogs
  affects:
    - 06 (tenant tracking may reuse decision patterns)
    - 07 (UX polish may refine drawer animations)

tech-stack:
  added:
    - shadcn/ui sheet (drawer)
    - shadcn/ui dialog (confirmations)
    - shadcn/ui textarea (notes)
  patterns:
    - Context provider for decision state
    - localStorage persistence with SSR-safe hydration
    - Drawer-based detail views
    - Confirmation dialogs for destructive actions

key-files:
  created:
    - src/lib/context/DecisionContext.tsx
    - src/components/landlord/DecisionButtons.tsx
    - src/components/landlord/CandidateDetail.tsx
    - src/components/landlord/CandidateNotes.tsx
    - src/components/landlord/DecisionConfirmation.tsx
    - src/app/panel/layout.tsx
    - src/components/ui/sheet.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/textarea.tsx
  modified:
    - src/components/landlord/CandidateCard.tsx
    - src/components/landlord/index.ts
    - src/app/panel/[propertyId]/page.tsx

decisions:
  - key: drawer-over-page
    choice: Use Sheet drawer for candidate details instead of separate page
    rationale: Better UX - keeps context, faster navigation, no page reload
  - key: confirmation-for-reject
    choice: Require confirmation dialog for reject action
    rationale: Prevent accidental rejections, give landlords pause before deciding
  - key: localStorage-decisions
    choice: Persist decisions to localStorage under 'arriendo-facil-decisions'
    rationale: Decisions persist across sessions without backend
  - key: notes-auto-save
    choice: Auto-save notes on blur
    rationale: Reduce friction, prevent data loss

metrics:
  duration: 12min
  completed: 2026-01-20
  tasks-completed: 6
  tasks-total: 6
---

# Phase 5 Plan 3: Candidate Detail & Decision Workflow Summary

**One-liner:** Decision workflow with drawer-based candidate detail, notes, and localStorage persistence for landlord screening.

## What Was Built

### 1. DecisionContext (State Management)
- **File:** `src/lib/context/DecisionContext.tsx`
- Manages landlord decisions and notes with localStorage persistence
- SSR-safe hydration pattern (waits for client mount)
- Methods: `getDecision`, `setDecision`, `getNote`, `setNote`, `clearDecision`
- Storage key: `arriendo-facil-decisions`

### 2. DecisionButtons Component
- **File:** `src/components/landlord/DecisionButtons.tsx`
- Two variants:
  - **Card:** Compact [Pre-aprobar] [Rechazar]
  - **Detail:** Full [Pre-aprobar] [Aprobar] [Rechazar] [Mas info] with reset
- Visual feedback for current status (button highlighting)
- Integrates with DecisionContext

### 3. CandidateDetail Drawer
- **File:** `src/components/landlord/CandidateDetail.tsx`
- Slide-in drawer using shadcn Sheet
- Shows full RiskScoreDisplay from Phase 4 with animation
- Header with photo, name, contact info, risk badge
- Notes section for annotations
- Sticky footer with decision buttons
- Status badge for current decision

### 4. CandidateNotes Component
- **File:** `src/components/landlord/CandidateNotes.tsx`
- Two variants:
  - **Inline:** Preview with click-to-expand
  - **Textarea:** Full editing interface
- Auto-save on blur
- Character count (500 max)
- "Guardado" confirmation feedback

### 5. DecisionConfirmation Dialog
- **File:** `src/components/landlord/DecisionConfirmation.tsx`
- Confirmation for reject and approve actions
- Friendly messaging using candidate's first name
- Appropriate styling (red for reject, green for approve)

### 6. CandidateCard Integration
- **Updated:** `src/components/landlord/CandidateCard.tsx`
- Integrates with DecisionContext
- Shows status badge when decision made
- Visual styling changes:
  - Rejected: `opacity-60`
  - Approved: `ring-2 ring-emerald-200`
  - Pre-approved: `ring-2 ring-blue-200`
- Confirmation dialog for reject

### 7. Panel Layout
- **File:** `src/app/panel/layout.tsx`
- Wraps panel pages with DecisionProvider
- Enables decision state across all landlord dashboard pages

## Verification

All success criteria met:
- [x] CandidateDetail drawer shows full RiskScoreDisplay
- [x] Decision buttons work on card AND detail
- [x] Decision state persists in localStorage
- [x] Notes functionality (add/edit notes per candidate)
- [x] "Solicitar mas informacion" updates candidate status
- [x] Visual feedback for decision changes

## Commits

| Hash | Message |
|------|---------|
| af07416 | feat(05-03): create DecisionContext for decision state management |
| e23c423 | feat(05-03): create DecisionButtons component |
| 921146b | feat(05-03): create CandidateDetail drawer component |
| 6bc6b7f | feat(05-03): create CandidateNotes component |
| 4fbb388 | feat(05-03): create DecisionConfirmation dialog |
| 5e86195 | feat(05-03): wire decisions to CandidateCard |
| a4bbc4e | feat(05-03): integrate decision workflow with panel pages |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 5 (Landlord Dashboard) is now **COMPLETE**.

The landlord experience is fully functional:
- Dashboard with property cards and candidate counts
- Candidate list with quick comparison cards
- Full candidate detail with AI explanation
- Decision workflow with persistence
- Notes for personal tracking

**Ready for Phase 6:** Tenant Tracking (application status views for tenants).
