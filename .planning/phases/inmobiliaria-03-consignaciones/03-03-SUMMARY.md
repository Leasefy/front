---
phase: 3
plan: 3
subsystem: inmobiliaria-portafolio
tags: [consignacion, detail, timeline, inventory, acta-entrega]
requires: [03-01]
provides: [consignacion-detail-page, inventory-view, timeline-component]
affects: [04-pipeline, 05-cobros]
tech-stack:
  added: []
  patterns: [detail-page-with-sections, auto-generated-timeline, image-modal]
key-files:
  created:
    - src/components/inmobiliaria/ConsignacionHeader.tsx
    - src/components/inmobiliaria/ConsignacionDetailSections.tsx
    - src/components/inmobiliaria/ActaEntregaView.tsx
    - src/components/inmobiliaria/ConsignacionTimeline.tsx
    - src/app/panel/inmobiliaria/portafolio/[id]/page.tsx
  modified:
    - src/components/inmobiliaria/index.ts
    - src/app/panel/inmobiliaria/portafolio/page.tsx
decisions:
  - "Two-column layout: 2/3 main content, 1/3 sidebar for inventory/timeline"
  - "Auto-generated timeline events from consignacion data (no separate events table)"
  - "Inventory table on desktop, cards on mobile for responsive design"
  - "Image modal for inventory item photos using AnimatePresence"
  - "Commission split visualization showing agent vs agency percentages"
metrics:
  duration: 6min
  completed: 2026-02-08
---

# Phase 3 Plan 3: Detalle Consignacion + Timeline + ActaEntrega Summary

Consignacion detail page with property info, timeline, and inventory view for the Inmobiliaria module.

## One-Liner
Consignacion detail page with auto-generated timeline, inventory acta de entrega, and propietario/agente sections.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 9abd32a | feat | consignacion detail page with timeline and inventory |

## What Was Built

### ConsignacionHeader Component
- Large property thumbnail with type badge and commission pill
- Availability and consignacion status badges
- Rent display with admin fee
- Contract dates and minimum term info
- Actions bar: Edit, View Portal, Status dropdown, More menu
- Status dropdown allows changing property availability
- More menu with Renew and Terminate options (placeholders)

### ConsignacionDetailSections Component
Five reusable section components:
1. **PropertyInfoSection**: Address, zone, contract dates, minimum term
2. **PropietarioSection**: Owner card with bank account (masked), email/call buttons, link to profile
3. **AgenteSection**: Agent card with commission split visualization, contact buttons, reassign action
4. **CurrentLeaseSection**: Current tenant info or "Sin inquilino" empty state
5. **DocumentsSection**: Links to consignment contract, acta de entrega, photo gallery

### ActaEntregaView Component
- Condition stats row (excellent/good/fair/poor counts)
- Search filter for items
- Desktop: Full table with columns for item, quantity, condition, notes, photo
- Mobile: Card layout for each item
- Condition badges with appropriate colors and icons
- Photo thumbnails that open in modal
- Empty state with "Agregar inventario" CTA
- Print/download buttons (disabled as placeholders)

### ConsignacionTimeline Component
- Auto-generates events from consignacion data:
  - Consignacion created
  - Agent assigned
  - Property published
  - Visits scheduled/completed (mock 2-3)
  - Candidate approved (if rented)
  - Contract signed (if rented)
  - Handover completed (if rented)
- Vertical timeline with connector lines
- Event icons color-coded by type
- Relative dates ("Hace 3 dias") and absolute dates
- Actor shown for each event
- Collapsible if >5 events

### Detail Page
- Route: `/panel/inmobiliaria/portafolio/[id]`
- Breadcrumb navigation back to Portafolio
- 404 state for invalid IDs
- Two-column layout (2/3 + 1/3)
- Left: Property, Propietario, Agente, Lease, Documents
- Right: Inventory (ActaEntrega), Timeline
- All sections with staggered animations
- Toast notifications for placeholder actions

### Navigation Integration
- ConsignacionCard onClick navigates to detail
- ConsignacionTable row click navigates to detail
- Portafolio page handlers updated to use router.push

## Patterns Established

1. **Detail page with sections**: SectionCard wrapper component for consistent styling
2. **Auto-generated timeline**: Events derived from entity data rather than stored separately
3. **Commission split visualization**: Progress bar showing agent vs agency split
4. **Responsive tables**: Table on desktop, cards on mobile
5. **Image modal with AnimatePresence**: Click-to-zoom pattern for photos

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
# Type check passed
pnpm tsc --noEmit

# Build passed
pnpm build
# Output shows /panel/inmobiliaria/portafolio/[id] as dynamic route

# Manual verification steps:
# 1. Navigate to /panel/inmobiliaria/portafolio
# 2. Click any ConsignacionCard - navigates to detail page
# 3. Verify header shows property info and status
# 4. Verify all sections render (propietario, agente, tenant, docs)
# 5. Verify inventory table with conditions
# 6. Verify timeline with events
# 7. Click back to portafolio
# 8. Verify table row click also works
```

## Next Phase Readiness

Phase 3 (Consignaciones) is now complete with all 3 plans:
- 03-01: ConsignacionCard + Lista Consignaciones
- 03-02: ConsignacionWizard (6-Step New Consignment)
- 03-03: Detalle Consignacion + Timeline + ActaEntrega

Ready to proceed to Phase 4 (Pipeline de Arriendos).
