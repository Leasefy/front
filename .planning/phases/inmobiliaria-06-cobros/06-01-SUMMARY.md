---
phase: inmobiliaria-06-cobros
plan: 01
subsystem: inmobiliaria-collections
tags: [cobro, collections, payments, card, table, filters]

# Dependency Graph
requires:
  - inmobiliaria-03-consignaciones (consignacion types and data)
  - inmobiliaria-types (Cobro, CobroStatus types)
provides:
  - CobroCard component for individual collection display
  - CobroTable component for sortable collection list
  - CobroFilters component for filtering collections
affects:
  - 06-02 (Cobros page will use these components)
  - 06-03 (Dispersions will reference cobro data)

# Tech Tracking
tech-stack:
  added: []
  patterns:
    - Status-colored left border cards
    - Sortable data table with action menus
    - Month selector with status tabs filter pattern

# File Tracking
key-files:
  created:
    - src/components/inmobiliaria/CobroCard.tsx
    - src/components/inmobiliaria/CobroTable.tsx
    - src/components/inmobiliaria/CobroFilters.tsx
  modified:
    - src/components/inmobiliaria/index.ts

# Decisions
decisions:
  - key: status-border-colors
    choice: "Left border accent matching status (amber/emerald/blue/orange/red)"
    rationale: "Visual hierarchy and quick status recognition"
  - key: month-format
    choice: "formatMonth() utility converts '2026-02' to 'Febrero 2026'"
    rationale: "Consistent Spanish month display"
  - key: status-tabs
    choice: "Horizontal tabs with count badges over dropdown"
    rationale: "Quick status filtering with visual counts"
  - key: whatsapp-integration
    choice: "Direct wa.me links with phone number"
    rationale: "Common Colombian communication channel"

# Metrics
metrics:
  duration: 5min
  completed: 2026-02-08
---

# Phase 6 Plan 01: CobroCard, CobroTable, CobroFilters Summary

**One-liner**: Cobro collection components with status-colored cards, sortable table, and month/status filters.

## What Was Built

### CobroCard Component (295 lines)
- **Status-colored left border**: pending (amber), paid (emerald), partial (blue), late (orange), defaulted (red)
- **Header section**: Property title, month display, status badge
- **Tenant section**: Avatar, name, phone with click-to-call, WhatsApp link
- **Amount section**: Total, breakdown (rent + admin), late fees, partial payment tracking
- **Status section**: Due date, days late warning, paid date, reminders count
- **Compact variant**: Single row for list views
- **Actions**: Register payment button for unpaid cobros

### CobroTable Component (418 lines)
- **Sortable columns**: Property, tenant, month, total, paid, pending, status, days late
- **Status priority sorting**: defaulted > late > pending > partial > paid
- **Row actions**: View detail, register payment
- **Summary row**: Optional footer with totals (expected, collected, pending)
- **Empty state**: Icon with message for no results
- **Responsive**: Horizontal scroll on mobile

### CobroFilters Component (421 lines)
- **Month selector**: Dropdown with last 6 months
- **Status tabs**: Todos, Pendientes, Pagados, En mora, Parciales, Incobrables with count badges
- **Property filter**: Dropdown from consignaciones
- **Propietario filter**: Dropdown from propietarios list
- **Debounced search**: 300ms delay for tenant name search
- **Active filter indicator**: Badge showing filter count
- **Clear filters**: Reset to defaults

## Key Implementation Details

### Status Color System
```typescript
const STATUS_BORDER_COLORS: Record<CobroStatus, string> = {
  pending: 'border-l-amber-500',
  paid: 'border-l-emerald-500',
  partial: 'border-l-blue-500',
  late: 'border-l-orange-500',
  defaulted: 'border-l-red-500',
};
```

### CobroFiltersState Interface
```typescript
export interface CobroFiltersState {
  month: string;              // '2026-02'
  status: CobroStatus | 'all';
  consignacionId?: string;
  propietarioId?: string;
  search?: string;
}
```

### Month Formatting
```typescript
function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}
```

## Commits

| Hash | Message |
|------|---------|
| 1e7f3a5 | feat(06-01): create CobroCard component |
| ab4eb92 | feat(06-01): create CobroTable component |
| 2209e71 | feat(06-01): create CobroFilters component |
| 20a5709 | fix(06-01): add CobroCard, CobroTable, CobroFilters exports |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Checklist

- [x] pnpm tsc --noEmit passes
- [x] pnpm build succeeds
- [x] CobroCard renders with status colors (295 lines, min 120)
- [x] CobroTable shows sortable columns (418 lines, min 180)
- [x] CobroFilters includes month selector and status tabs (421 lines, min 150)
- [x] Late cobros show days of mora with warning
- [x] Amounts formatted as currency using formatCurrency()
- [x] Components exported from barrel

## Next Phase Readiness

**Ready for 06-02**: Cobros page can now use:
- CobroCard for grid/list display
- CobroTable for table view
- CobroFilters for filtering
- CobroFiltersState type for filter state management
