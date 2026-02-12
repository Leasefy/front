---
phase: inmobiliaria-09-operaciones
plan: 01
subsystem: renovaciones
tags: [renovaciones, operaciones, table, inmobiliaria, workflow]

dependency-graph:
  requires:
    - inmobiliaria-08-reportes
  provides:
    - Renovacion types and status workflow
    - Mock renovaciones data generator
    - RenovacionesTable component with urgency filtering
  affects:
    - inmobiliaria-09-02 (IPC Calculator, Renewal Workflow)
    - inmobiliaria-09-04 (Operaciones Page)

tech-stack:
  added: []
  patterns:
    - Urgency bucket filtering (0-30, 31-60, 61-90 days)
    - Status workflow (pending -> completed)
    - IPC-based rent calculation

key-files:
  created:
    - src/components/inmobiliaria/RenovacionesTable.tsx
  modified:
    - src/lib/types/inmobiliaria.ts
    - src/lib/data/mock-inmobiliaria.ts
    - src/components/inmobiliaria/index.ts

decisions:
  - { id: renovacion-status-order, decision: "7 statuses from pending to terminated with negotiating flow", rationale: "Matches real-world renewal negotiation workflow" }
  - { id: urgency-buckets, decision: "0-30 (critical/red), 31-60 (urgent/amber), 61-90 (upcoming/blue)", rationale: "Consistent with VencimientosTable pattern" }
  - { id: ipc-calculation, decision: "Use getCurrentIPC() for proposed rent calculation", rationale: "Reuses existing IPC infrastructure from Phase 8" }

metrics:
  duration: 8 min
  completed: 2026-02-08
---

# Phase 9 Plan 01: RenovacionesTable Summary

**One-liner:** Contract renewal table with urgency bucket filtering and status workflow actions.

## What Was Built

### 1. Renovacion Types (Already Existed - Verified)
The Renovacion types were already added in commit 7993cf7:
- `RenovacionStatus`: 7 workflow states (pending -> completed)
- `RenovacionHistoryItem`: Audit trail for workflow actions
- `Renovacion`: Full interface with property, tenant, IPC, and workflow data
- Helper functions: `getRenovacionStatusColor()`, `getRenovacionStatusLabel()`, `getUrgencyColor()`

### 2. Mock Renovaciones Data Generator
Created `generateMockRenovaciones()` function:
- Filters consignaciones with expiring leases (next 90 days)
- Calculates urgency buckets based on days until expiry
- Distributes statuses realistically (critical contracts more advanced)
- Uses current IPC rate for proposed rent calculation
- Generates `generateRenovacionHistory()` workflow timeline

### 3. RenovacionesTable Component (716 lines)
Full-featured contract renewals table:

**Summary Cards Row:**
- Total renovaciones
- Criticas (0-30d) - red gradient card
- Urgentes (31-60d) - amber card
- Proximas (61-90d) - blue card
- Completadas - emerald card

**Filter Tabs:**
- "Todos" with total count
- "Criticas" with red badge
- "Urgentes" with amber badge
- "Proximas" with blue badge
- Status dropdown for workflow states

**Table Columns:**
- Property (title + address with urgency-colored icon)
- Tenant (name + phone)
- Propietario
- Vencimiento (formatted date)
- Dias (urgency badge with warning icon for critical)
- Canon Actual (current rent)
- Propuesto (new rent + IPC increase badge)
- Estado (status badge)
- Actions menu

**Action Menu Options:**
- Ver detalles
- Notificar inquilino (for pending status)
- Iniciar negociacion (for pending/notified)
- Calcular IPC
- Ver historial

**Additional Features:**
- Bulk selection with batch notify/renewal actions
- Sortable columns (property, tenant, propietario, days, rent, status)
- Empty state with appropriate messaging
- Framer Motion animations for rows and menus

### 4. Barrel Export
Added `RenovacionesTable` to `src/components/inmobiliaria/index.ts`

## Implementation Notes

- Follows VencimientosTable pattern for consistency
- Uses existing IPC infrastructure (`getCurrentIPC()`, `calculateNewRent()`)
- Status-aware action menu (different actions available based on current status)
- IPC increase displayed as percentage badge next to proposed rent

## Deviations from Plan

### Task 1 Already Complete
- Renovacion types were already added in commit 7993cf7
- Verified types exist and work correctly
- No additional type changes needed

## Next Phase Readiness

Ready for:
- 09-02: IPCCalculator and RenovacionWorkflow components
- 09-04: Operaciones page integration with RenovacionesTable

## Commits

| Commit | Description |
|--------|-------------|
| f036d36 | feat(09-01): add mock renovaciones data generator |
| 0e74a67 | feat(09-01): create RenovacionesTable component |
| f647d50 | feat(09-01): export RenovacionesTable from barrel |
