---
phase: inmobiliaria-09-operaciones
plan: 02
subsystem: operaciones
tags: [ipc, renovaciones, workflow, calculator, dane]
requires:
  - inmobiliaria-08-reportes
provides:
  - ipc-calculator
  - renovacion-workflow
  - ipc-historical-data
affects:
  - inmobiliaria-09-04-operaciones-page
tech-stack:
  added: []
  patterns:
    - css-only-chart
    - step-workflow
    - sheet-drawer
key-files:
  created:
    - src/components/inmobiliaria/IPCCalculator.tsx
    - src/components/inmobiliaria/RenovacionWorkflow.tsx
  modified:
    - src/lib/data/mock-inmobiliaria.ts
    - src/components/inmobiliaria/index.ts
decisions:
  - key: ipc-trend-chart
    choice: CSS-only bar chart with tooltips
    rationale: No external charting library needed, consistent with project patterns
  - key: workflow-component
    choice: Sheet-based full-screen workflow
    rationale: Consistent with other detail views (CobroDetail, DispersionDetail)
metrics:
  duration: 8min
  completed: 2026-02-08
---

# Phase 9 Plan 02: IPCCalculator + RenovacionWorkflow Summary

IPC-based rent calculator and 6-step renovation workflow for contract renewal management.

## One-liner

IPC calculator with DANE data and 6-step renewal workflow using Sheet-based navigation.

## What Was Built

### Task 1: IPC Historical Data
- Added `IPCRecord` interface with year, month, rate, description fields
- Added `IPC_HISTORICAL` array with 24 months of DANE Colombia data (2023-2024)
- Added `getCurrentIPC()` helper to get latest IPC rate
- Added `getIPCForDate()` helper for month/year lookup
- Added `calculateNewRent()` helper for rent increase calculation

### Task 2: IPCCalculator Component (580 lines)
- **Current IPC Display**: Large rate with trend indicator (up/down)
- **IPC Trend Chart**: CSS-only bar chart showing 12 months with tooltips
- **Calculator Form**:
  - Currency-formatted current rent input
  - Pre-filled IPC rate with custom rate toggle
  - Effective date picker
  - Result display with increase amount and percentage
- **Bulk Mode**: Table for applying IPC to multiple properties
- **Info Section**: Ley 820 de 2003 reference and DANE link

### Task 3: RenovacionWorkflow Component (1056 lines)
- **6 Workflow Steps**:
  1. Revision - Review contract details and IPC preview
  2. Notificacion - Email/WhatsApp notification with message preview
  3. Negociacion - Counter-offer support and notes
  4. Aprobacion - Owner and tenant approval tracking
  5. Firma - Document upload and signature date
  6. Completado - Success summary

- **Visual Stepper**: Progress indicator with completed/current/pending states
- **Sidebar Components**:
  - Status badge
  - Days until expiry countdown
  - History timeline
  - Add note functionality
  - Terminate button

- **Sheet-based Navigation**: Full-screen workflow using Sheet drawer

### Task 4: Barrel Export Update
- Added `IPCCalculator` export
- Added `RenovacionWorkflow` export

## Commits

| Hash | Message |
|------|---------|
| 43ed4ee | feat(09-02): add IPC historical data and calculation helpers |
| e0572d5 | feat(09-02): create IPCCalculator component |
| 801b45b | feat(09-02): create RenovacionWorkflow component |
| fa4b491 | feat(09-02): add IPCCalculator and RenovacionWorkflow to barrel export |

## Technical Decisions

### CSS-only Trend Chart
Used CSS bars with Radix tooltips instead of a charting library. Pattern consistent with FlujoCajaChart and OcupacionChart from Phase 8.

### Sheet-based Workflow
Used Sheet drawer for full-screen workflow, consistent with CobroDetail and DispersionDetail patterns. Allows complex step content without page navigation.

### Emerald for Increases
Used emerald color for rent increases since in this business context, increases are positive (revenue growth) rather than negative.

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Lines | Changes |
|------|-------|---------|
| src/lib/data/mock-inmobiliaria.ts | +51 | IPC historical data and helpers |
| src/components/inmobiliaria/IPCCalculator.tsx | +580 | New component |
| src/components/inmobiliaria/RenovacionWorkflow.tsx | +1056 | New component |
| src/components/inmobiliaria/index.ts | +4 | Barrel exports |

## Verification Results

- [x] pnpm tsc --noEmit passes
- [x] IPC_HISTORICAL exports from mock-inmobiliaria
- [x] IPCCalculator calculates new rent correctly
- [x] IPCCalculator shows historical trend (12-month chart)
- [x] RenovacionWorkflow shows all 6 steps
- [x] Workflow can advance through stages
- [x] Timeline shows history
- [x] Components exported from barrel

## Next Phase Readiness

Plan 09-02 is complete. Provides:
- IPC calculation for rent increases
- Guided renewal workflow for contract management

Ready for:
- Plan 09-03: MantenimientoList + MantenimientoForm
- Plan 09-04: Operaciones page integration
