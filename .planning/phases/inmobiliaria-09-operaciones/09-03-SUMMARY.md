---
phase: inmobiliaria-09-operaciones
plan: 03
subsystem: operaciones
tags: [mantenimiento, maintenance, forms, lists, filtering]

dependency-graph:
  requires: [08-03, types/inmobiliaria, data/mock-inmobiliaria]
  provides: [MantenimientoList, MantenimientoForm]
  affects: [09-04]

tech-stack:
  added: []
  patterns: [card-list-with-filters, radio-card-selector, photo-upload-zone]

key-files:
  created:
    - src/components/inmobiliaria/MantenimientoList.tsx
    - src/components/inmobiliaria/MantenimientoForm.tsx
  modified:
    - src/components/inmobiliaria/index.ts

decisions:
  - decision: "Card layout over table"
    rationale: "Better visual presentation for maintenance requests with priority indicators and property info"
  - decision: "Radio card selectors for type/priority"
    rationale: "Consistent with ConsignacionWizard pattern, provides visual selection feedback"
  - decision: "Photo upload with blob URLs"
    rationale: "Mock functionality for frontend demo, real upload would go to cloud storage"

metrics:
  duration: 7.4min
  completed: 2026-02-08
---

# Phase 9 Plan 03: Mantenimiento Components Summary

Maintenance request list and form components for property management operations.

## One-liner

Card-based maintenance list with type/priority/status filters and multi-step request form with photo upload

## What Was Built

### MantenimientoList (678 lines)
- **Summary Cards Row**: Total, Reportadas, Cotizadas, Aprobadas, En progreso, Completadas
- **Filter Bar**:
  - Type dropdown with emoji icons
  - Priority filter (low/medium/high/emergency)
  - Status filter (reported/quoted/approved/in_progress/completed/cancelled)
  - Property/zone search
  - Sort options (priority, date, status)
- **Card Layout**:
  - Priority indicator (left border color)
  - Type icon with badge
  - Property info section with thumbnail
  - Tenant name display
  - Priority and status badges
  - Days since created indicator
  - Quotes count and photo indicators
  - Approved amount display
- **Actions Menu**:
  - View details
  - Add quote (for reported)
  - Approve quote (for quoted)
  - Mark completed (for in_progress)
  - Cancel request
- **Responsive**: 1/2/3 column grid layout
- **Empty State**: Filter-aware messaging

### MantenimientoForm (803 lines)
- **Property Selector**:
  - Search by title/address/zone
  - Thumbnail preview when selected
  - Current tenant display
- **Type Selector**:
  - Radio cards with emoji icons
  - 7 types: plumbing, electrical, appliance, structural, painting, locks, other
- **Priority Selector**:
  - Color-coded cards
  - Descriptions for each level
  - Emergency warning alert
- **Request Details**:
  - Title input with validation
  - Description textarea (20+ char minimum)
  - High/emergency priority alerts
- **Photo Upload**:
  - Drop zone component
  - Max 5 photos
  - Preview thumbnails with remove
  - Accepts jpg/png/webp
- **Responsibility Section**:
  - Paid-by selector (owner/tenant/split/agency)
  - Contract responsibility info box
- **Additional Info**:
  - Access notes textarea
- **Form Validation**:
  - Required field validation
  - Touch-based error display
  - Submit loading state

## Key Patterns

1. **Card List with Filters**: Reusable pattern from CobroTable/CobroCard
2. **Radio Card Selector**: Consistent with ConsignacionWizard steps
3. **Priority Colors**: slate (low), blue (medium), amber (high), red (emergency)
4. **Status Colors**: slate (reported), blue (quoted), lime (approved), amber (in_progress), emerald (completed), red (cancelled)
5. **Photo Upload Zone**: Drag-drop pattern with preview thumbnails

## Commits

| Commit | Description |
|--------|-------------|
| 32c9fea | feat(09-03): create MantenimientoList component with filters |
| 8b72a0b | feat(09-03): create MantenimientoForm component for new requests |
| 25e817f | feat(09-03): export MantenimientoList and MantenimientoForm |

## Verification

- [x] pnpm tsc --noEmit passes
- [x] MOCK_MANTENIMIENTOS exports from mock-inmobiliaria
- [x] MantenimientoList shows requests with filters (678 lines > 400 min)
- [x] MantenimientoForm validates and submits (803 lines > 300 min)
- [x] Type selection with icons works
- [x] Priority and status filters work correctly
- [x] Components exported from barrel

## Deviations from Plan

**Task 1 skipped**: Mock maintenance data (MOCK_MANTENIMIENTOS) already existed in mock-inmobiliaria.ts from previous phases. The plan specified creating new mock data, but comprehensive maintenance data with 8+ records covering all statuses and types was already present.

## Next Phase Readiness

Plan 09-04 can proceed with:
- MantenimientoList ready for integration in Operaciones page
- MantenimientoForm ready for "Nueva Solicitud" page
- All exports available from barrel
