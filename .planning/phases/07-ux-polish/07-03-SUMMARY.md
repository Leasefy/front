---
phase: "07-ux-polish"
plan: "03"
title: "Empty States & Error States"
subsystem: "ui-components"
tags: ["empty-state", "error-state", "ux", "reusable-components"]
dependency-graph:
  requires: ["07-01"]
  provides: ["EmptyState", "ErrorState", "NotFound", "UI-barrel-export"]
  affects: ["all-list-views", "error-boundaries"]
tech-stack:
  added: []
  patterns: ["reusable-state-components", "composition", "barrel-exports"]
key-files:
  created:
    - "src/components/ui/empty-state.tsx"
    - "src/components/ui/error-state.tsx"
    - "src/components/ui/not-found.tsx"
    - "src/components/ui/index.ts"
  modified:
    - "src/components/property/PropertyGrid.tsx"
    - "src/app/mis-aplicaciones/page.tsx"
    - "src/components/landlord/CandidateList.tsx"
decisions:
  - key: "empty-state-pattern"
    choice: "Composable component with icon, title, description, optional CTA"
    rationale: "Flexible enough for all empty list contexts"
  - key: "error-styling"
    choice: "Red-50 background with red-500 icon, non-alarming"
    rationale: "Professional error display without causing user anxiety"
  - key: "not-found-default"
    choice: "Property-focused defaults with customization options"
    rationale: "Most common 404 scenario is property not found"
metrics:
  duration: "3 minutes"
  completed: "2026-01-20"
---

# Phase 7 Plan 03: Empty States & Error States Summary

Reusable empty state and error state components for consistent UX across all list views.

## One-liner

Reusable EmptyState/ErrorState components with icon, text, CTA - applied to PropertyGrid, Mis Aplicaciones, CandidateList.

## What Was Built

### New Components

1. **EmptyState** (`src/components/ui/empty-state.tsx` - 74 lines)
   - Icon with slate-100 circular background
   - Title and description text
   - Optional CTA button with Next.js Link
   - Flexible className prop for container customization

2. **ErrorState** (`src/components/ui/error-state.tsx` - 66 lines)
   - AlertTriangle icon with red-50 background
   - Customizable title and description
   - Optional retry button with RefreshCw icon
   - Spanish default messages

3. **NotFound** (`src/components/ui/not-found.tsx` - 52 lines)
   - Built on EmptyState for consistency
   - Home icon for navigation context
   - Customizable with sensible defaults
   - Min-height container for proper spacing

4. **UI Barrel Export** (`src/components/ui/index.ts`)
   - Exports EmptyState, ErrorState, NotFound
   - Type exports for TypeScript consumers

### Refactored Files

1. **PropertyGrid** - Replaced inline SVG empty state with EmptyState component
2. **Mis Aplicaciones** - Removed inline EmptyState function, use shared component
3. **CandidateList** - Replaced inline SVG with EmptyState in dashed container

## Commit History

| Hash | Type | Description |
|------|------|-------------|
| d9f2c2e | feat | add reusable EmptyState component |
| 006ad77 | feat | add reusable ErrorState component |
| 9b60599 | refactor | use EmptyState in PropertyGrid |
| e7305c6 | refactor | use EmptyState in Mis Aplicaciones |
| 340ef0e | refactor | use EmptyState in CandidateList |
| 6f3031e | feat | add NotFound component for 404 states |
| 0ab2113 | feat | add UI components barrel export |

## Verification Checklist

- [x] EmptyState component created with icon, title, description, CTA (74 lines > 40 min)
- [x] ErrorState component created with retry functionality (66 lines > 40 min)
- [x] PropertyGrid shows empty state when no properties
- [x] Mis Aplicaciones shows empty state when no applications
- [x] CandidateList shows empty state when no candidates
- [x] NotFound component created for 404 scenarios
- [x] TypeScript compiles without errors

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- EmptyState is already being used in existing code (Mis Aplicaciones had an inline version)
- CandidateList maintains its dashed border container around EmptyState
- All Spanish text without accents per project convention
- ErrorState ready for future error boundary integration
