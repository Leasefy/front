---
phase: inmobiliaria-05-pipeline
plan: 02
subsystem: inmobiliaria
tags: [pipeline, filters, detail, sheet, kanban]
requires:
  - inmobiliaria-05-pipeline/05-01 (PipelineCard + PipelineColumn)
provides:
  - PipelineFilters component for filtering pipeline items
  - PipelineDetail sheet for viewing full item details
affects:
  - inmobiliaria-05-pipeline/05-03 (PipelineBoard page integration)
tech-stack:
  added: []
  patterns:
    - Sheet drawer for detail view
    - Date range with presets pattern
    - Timeline visualization
    - Contact action buttons (copy, WhatsApp)
key-files:
  created:
    - src/components/inmobiliaria/PipelineFilters.tsx
    - src/components/inmobiliaria/PipelineDetail.tsx
  modified:
    - src/components/inmobiliaria/index.ts
decisions:
  - "Date presets: Hoy, Esta semana, Este mes for quick filtering"
  - "Timeline auto-generated from pipeline item data, not stored separately"
  - "Contact actions: copy to clipboard and WhatsApp direct links"
  - "Risk badge with level (A-E) and score display"
  - "Overdue threshold: 7 days in stage triggers warning"
metrics:
  duration: 8min
  completed: 2026-02-08
---

# Phase inmobiliaria-05 Plan 02: PipelineFilters + PipelineDetail Summary

PipelineFilters and PipelineDetail components for filtering and viewing rental pipeline items.

## What Was Built

### PipelineFilters Component
- **Agente filter**: Dropdown with avatar and zone display, filtered to active agents only
- **Property filter**: Dropdown with thumbnail, title, and location
- **Date range filter**: Manual date inputs for dateFrom and dateTo
- **Quick date presets**: Hoy, Esta semana, Este mes buttons
- **Search filter**: Debounced candidate name search
- **Active filter badge**: Count of active filters displayed
- **Collapsible panel**: Animated expand/collapse with Framer Motion

### PipelineDetail Component
- **Header**: Property title with stage badge in stage color
- **Property section**: Large thumbnail, address, rent, link to consignacion detail
- **Candidate section**: Avatar with contact actions
  - Copy email and phone to clipboard
  - Direct WhatsApp link
  - Risk score visualization with level badge
- **Progress section**: Current stage, days in stage, next action, target date
- **Timeline section**: Vertical timeline showing stage history
  - Mock data generated from pipeline item
  - Most recent first
  - Shows days spent in each stage
- **Notes section**: Display existing notes + textarea for new notes
- **Lost reason display**: Shows reason when item is in lost stage
- **Action footer**:
  - "Mover a siguiente etapa" button
  - "Marcar como perdido" button
  - Loading states with toasts

## Technical Decisions

1. **Timeline Generation**: Mock timeline auto-generated from item data, not stored separately. This follows the pattern used in ConsignacionTimeline.

2. **Date Presets**: Quick presets (Hoy, Esta semana, Este mes) calculate relative dates on click and update both dateFrom and dateTo.

3. **Overdue Threshold**: Items with daysInStage > 7 show a warning indicator. This matches the warning pattern in PipelineCard.

4. **Contact Actions Pattern**:
   - Copy: Uses navigator.clipboard API with toast confirmation
   - WhatsApp: Opens wa.me link with cleaned phone number

5. **Terminal Stages**: Items in 'completed' or 'lost' stages don't show action buttons (no stage advancement possible).

## Commits

1. `b510c6a` - feat(05-02): add PipelineFilters component
2. `3692976` - feat(05-02): add PipelineDetail sheet component
3. `5cf74cf` - feat(05-02): export PipelineFilters and PipelineDetail from barrel

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

- **PipelineFilters** receives agentes and consignaciones arrays, outputs filter state
- **PipelineDetail** receives single PipelineItem, emits stage change events
- Both export from src/components/inmobiliaria barrel
- PipelineFiltersState type exported for page-level state management

## Next Phase Readiness

Ready for Plan 05-03: PipelineBoard + Pipeline Page
- PipelineCard, PipelineColumn from 05-01
- PipelineFilters, PipelineDetail from 05-02
- Next: @dnd-kit integration for drag-and-drop Kanban board
