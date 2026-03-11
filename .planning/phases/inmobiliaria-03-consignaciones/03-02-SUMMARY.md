---
phase: 3
plan: 2
subsystem: inmobiliaria-consignaciones
tags: [wizard, multi-step, forms, components]
requires: [03-01]
provides:
  - ConsignacionWizard 6-step component
  - PropietarioSelector with inline creation
  - AgenteSelector with workload sorting
  - Nueva Consignacion page
affects: [03-03]
tech-stack:
  added: []
  patterns: [multi-step-wizard, step-validation, inline-form-creation]
key-files:
  created:
    - src/components/inmobiliaria/PropietarioSelector.tsx
    - src/components/inmobiliaria/AgenteSelector.tsx
    - src/components/inmobiliaria/ConsignacionWizardSteps.tsx
    - src/components/inmobiliaria/ConsignacionWizard.tsx
    - src/app/panel/inmobiliaria/portafolio/nuevo/page.tsx
  modified:
    - src/components/inmobiliaria/index.ts
    - src/app/panel/inmobiliaria/portafolio/page.tsx
decisions:
  - selector-pattern: PropietarioSelector allows both selection and inline creation
  - agent-sorting: Default sort by lowest workload for balanced distribution
  - inventory-photos: Photo upload is placeholder UI only (no actual upload)
  - wizard-validation: Each step validates before allowing progression
  - toast-feedback: Using sonner toast for success/error feedback
metrics:
  duration: ~7min
  completed: 2026-02-08
---

# Phase 3 Plan 2: ConsignacionWizard (6-Step New Consignment) Summary

**One-liner:** 6-step wizard for registering new property consignments with propietario selection/creation, property data, commission terms, agent assignment, and inventory.

## What Was Built

### PropietarioSelector Component
- Search input to filter existing propietarios by name, email, or document
- Grid of PropietarioCard (compact variant) for selection
- Selected state with visual checkmark feedback
- "Agregar nuevo" button that expands inline PropietarioForm
- Inline form for creating new propietario without leaving wizard
- Validation: must select or create one propietario

### AgenteSelector Component
- Grid of agent cards showing avatar, name, role, zone
- Workload display (assigned properties count)
- Commission split percentage and conversion rate metrics
- Filter by zone dropdown
- Sort options: recommended (lowest workload first), name, workload, performance
- Recommended badge for agent with lowest workload
- Single selection with visual highlight

### ConsignacionWizardSteps (6 Steps)
1. **SelectPropietario**: PropietarioSelector integration
2. **PropertyData**: Type selection (6 types), title, address, city, zone, monthly rent, admin fee
3. **CommissionTerms**: Slider 8-15% (default 10%), minimum term (6/12/18/24 months), start date, summary showing agency vs owner split
4. **AssignAgent**: AgenteSelector integration with agent recommendations
5. **ActaEntrega**: Inventory items list (add/remove), condition dropdown, photo upload placeholder, notes textarea
6. **Confirmation**: Complete summary with edit buttons to go back to specific steps

### ConsignacionWizard Orchestrator
- Step indicator with numbered circles and labels (desktop)
- Progress bar with percentage (mobile)
- Completed steps show checkmarks
- Step validation prevents invalid progression
- Back navigation preserves all data
- Cancel button with confirmation dialog
- Submit logs to console and shows success toast
- Redirects to /panel/inmobiliaria/portafolio on completion

### Nueva Consignacion Page
- Route: `/panel/inmobiliaria/portafolio/nuevo`
- Page header with icon and description
- Back link to portafolio
- ConsignacionWizard with mock propietarios and agentes

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Inline propietario creation | Collapsible form in selector | Avoids navigation away from wizard, better UX |
| Agent sorting default | Lowest workload first | Helps balance agent distribution |
| Photo upload | UI placeholder only | No backend for file storage |
| Step validation | Blocks next if invalid | Prevents incomplete submissions |
| Cancel confirmation | Modal dialog | Prevents accidental data loss |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Approach

### Form Data Management
- Single `formData` state object in orchestrator
- `updateFormData` callback passed to all steps
- Validation computed per-step using useMemo

### Step Navigation
- `currentStep` state (1-6)
- `isStepValid` computed from formData
- Navigation blocked when step invalid
- Back navigation always allowed

### Toast Integration
- Using sonner toast via `@/components/ui/toast`
- `toast.success()` for completion
- `toast.error()` for failures

## Commits

| Hash | Message |
|------|---------|
| 22f923a | feat(03-02): create PropietarioSelector component |
| 6ed5b32 | feat(03-02): create AgenteSelector component |
| f52b1ed | feat(03-02): create ConsignacionWizardSteps components |
| 9ad776c | feat(03-02): create ConsignacionWizard orchestrator |
| 993f156 | feat(03-02): create Nueva Consignacion page |
| 0c20599 | feat(03-02): update exports and fix portafolio navigation |

## Next Phase Readiness

**03-03 Prerequisites Met:**
- [x] ConsignacionWizard operational
- [x] PropietarioSelector with inline creation
- [x] AgenteSelector with workload info
- [x] Navigation from portafolio to nuevo works

**Blockers/Concerns:** None
