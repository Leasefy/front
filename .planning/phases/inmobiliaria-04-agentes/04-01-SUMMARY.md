---
phase: inmobiliaria-04-agentes
plan: 01
subsystem: inmobiliaria-agentes
tags: [agentes, cards, table, filters, listing]

dependency-graph:
  requires: [inmobiliaria-03-consignaciones]
  provides: [AgenteCard, AgenteTable, AgenteFilters, AgentesPage]
  affects: [04-02-AgenteDetail, 04-03-KPIsAgente]

tech-stack:
  added: []
  patterns: [card-table-toggle, filter-panel, responsive-grid]

key-files:
  created:
    - src/components/inmobiliaria/AgenteCard.tsx
    - src/components/inmobiliaria/AgenteTable.tsx
    - src/components/inmobiliaria/AgenteFilters.tsx
    - src/app/panel/inmobiliaria/agentes/page.tsx
  modified:
    - src/components/inmobiliaria/index.ts

decisions:
  - key: role-colors
    value: "agent=blue, coordinator=purple, director=amber"
    rationale: "Visual hierarchy with distinct colors for each role level"
  - key: status-colors
    value: "active=emerald, inactive=gray, on_leave=amber"
    rationale: "Consistent with existing status color patterns in the app"
  - key: metrics-grid
    value: "2x2 grid with properties, active leases, closings, commissions"
    rationale: "Key performance metrics for agent evaluation at a glance"
  - key: commission-split-highlight
    value: "Indigo pill with percentage"
    rationale: "Important financial info highlighted separately from metrics"

metrics:
  duration: 8min
  completed: 2026-02-07
---

# Phase 04 Plan 01: AgenteCard + Lista Agentes Summary

AgenteCard, AgenteTable, AgenteFilters components and agentes listing page for inmobiliaria module.

## What Was Built

### AgenteCard Component
- Avatar with initials fallback (uses role color as background)
- Role badge: agent (blue), coordinator (purple), director (amber)
- Status badge: active (emerald), inactive (gray), on_leave (amber)
- Zone specialty display with MapPin icon
- 2x2 metrics grid: Propiedades, Arriendos, Cierres mes, Comisiones
- Commission split percentage in indigo pill
- Compact and default variants
- Framer Motion hover animations
- View and Edit action buttons

### AgenteTable Component
- Sortable columns: Name, Role, Status, Zone, Properties, Closings, Commissions, Split
- Avatar with initials fallback in role color
- Responsive: hides Zone, Closings, Commissions on smaller screens
- Row click navigates to detail
- Actions dropdown menu (View, Edit)
- Empty state with Users icon

### AgenteFilters Component
- Search input (name or email)
- Role dropdown: All, Agent, Coordinator, Director
- Status dropdown: All, Active, Inactive, On Leave
- Sort dropdown: Name, Cierres mes, Comisiones
- Active filter count badge
- Clear filters button
- Animated filter panel

### Agentes Page (/panel/inmobiliaria/agentes)
- Header: "Equipo de Agentes" with disabled "Nuevo Agente" button
- Summary stats row: Total, Activos, Cierres Mes, Comisiones Mes
- Card/Table view toggle
- Filters component integration
- Responsive grid (1/2/3/4 columns)
- Pagination with 12 items per page
- Click shows toast (detail page in 04-02)

## Commits

| Hash | Message |
|------|---------|
| e6cb7b4 | feat(04-01): create AgenteCard component |
| d94b98a | feat(04-01): create AgenteTable component |
| d530b0d | feat(04-01): create AgenteFilters and agentes page |

## Verification

- [x] pnpm tsc --noEmit passes
- [x] pnpm build succeeds
- [x] Navigate to /panel/inmobiliaria/agentes shows page
- [x] Card and table views toggle correctly
- [x] Filters work (search, role, status, sort)
- [x] Click on agente shows toast

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- 04-02 (AgenteDetail): Ready - AgenteCard onClick handler navigates to detail page (currently toast)
- 04-03 (KPIs Agente): Ready - Metrics data structure in place via AgenteMetrics type
