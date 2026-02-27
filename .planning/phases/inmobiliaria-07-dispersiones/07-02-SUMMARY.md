---
phase: inmobiliaria-07-dispersiones
plan: 02
subsystem: inmobiliaria-dispersiones
tags: [dispersion, extracto, commission, pdf, detail-drawer]

dependency-graph:
  requires:
    - inmobiliaria-06-cobros (CobroDetail pattern)
    - inmobiliaria types (Dispersion, ExtractoPropietario)
    - jsPDF (already installed for contract PDF)
  provides:
    - DispersionDetail drawer
    - ComisionDesglose breakdown table
    - ExtractoPropietario statement view
    - DispersionResumen summary card
    - PDF generation for extracto
  affects:
    - 07-03 (dispersiones page integration)

tech-stack:
  added: []
  patterns:
    - Sheet drawer pattern for detail view
    - Animated progress bars for ratios
    - PDF generation with jsPDF
    - Table with collapsible variant

file-tracking:
  created:
    - src/components/inmobiliaria/ComisionDesglose.tsx
    - src/components/inmobiliaria/DispersionResumen.tsx
    - src/components/inmobiliaria/ExtractoPropietario.tsx
    - src/lib/utils/generate-extracto-pdf.ts
    - src/components/inmobiliaria/DispersionDetail.tsx
  modified:
    - src/components/inmobiliaria/index.ts

decisions:
  - id: commission-ratio-bar
    choice: "Progress bar showing commission vs net ratio"
    rationale: "Visual representation of agency cut vs owner payout"
  - id: extracto-pdf-format
    choice: "Colombian business document style with letterhead"
    rationale: "Match professional Colombian business standards"
  - id: status-timeline
    choice: "Vertical timeline with created/approved/processed events"
    rationale: "Clear audit trail for dispersion processing"

metrics:
  duration: 6m23s
  completed: 2026-02-08
---

# Phase Inmobiliaria-07 Plan 02: DispersionDetail + Extracto Summary

## One-liner
Commission breakdown table, owner statement view with PDF download, and dispersion detail drawer with status timeline.

## What Was Built

### 1. ComisionDesglose Component
- Table showing property-level commission breakdown
- Columns: Property, Collected, Commission %, Commission Amount, Net
- Commission percentage badges with color coding (8-12% range)
- Progress bar showing commission vs net ratio visualization
- Full and compact variants for different contexts
- Animated table rows with Framer Motion

### 2. DispersionResumen Component
- Monthly summary card following CobroResumen pattern
- Stats grid with animated currency counters
- "A dispersar" (total net to owners) prominent green display
- "Comisiones" (agency income) indigo display
- Progress bar showing completion rate
- Count badges for pending/completed/failed dispersions
- Quick actions: Generate, Process All, View Pending
- Compact variant for dashboard widgets

### 3. ExtractoPropietario Component
- Owner statement view with printable styling
- Header with inmobiliaria branding (logo, NIT, address)
- Propietario info section with bank account details
- Properties table with detailed breakdown:
  - Property name and address
  - Tenant name
  - Rent and admin amounts
  - Payment status with colored badges
  - Commission % and amount
  - Net amount per property
- Summary section with highlighted net amount
- Actions: Download PDF, Print, Send by Email
- Print-friendly CSS with print-specific footer

### 4. PDF Generation Utility
- Uses jsPDF (already installed for contracts)
- Professional Colombian business document format
- Header with agency info and NIT
- Two-column propietario/bank info section
- Properties table with alternating row colors
- Status labels in Spanish
- Summary box with emerald highlight for net amount
- Footer with legal info and generation date
- Proper Colombian locale formatting (es-CO)

### 5. DispersionDetail Sheet Drawer
- Sheet drawer following CobroDetail pattern
- Header with propietario name, month, status badge
- Propietario section with contact actions (call, WhatsApp, email)
- Bank account details with copy buttons
- Amount summary (collected, commission, net)
- ComisionDesglose integration for property breakdown
- Status timeline:
  - Created date
  - Approved date/by
  - Processed date with transfer reference
  - Error reason for failed dispersions
- Actions footer:
  - "Procesar Dispersion" (pending)
  - "Reintentar" (failed)
  - "Ver Extracto"
  - "Descargar PDF Extracto"

## Patterns Established

### Commission Visualization
```typescript
<CommissionRatioBar
  commission={totals.totalCommission}
  net={totals.totalNet}
/>
```
Visual split showing agency vs owner portions with indigo/emerald colors.

### Status Timeline Events
```typescript
<TimelineEvent
  icon={CheckCircle}
  title="Procesada"
  date={dispersion.processedAt}
  description={`Ref: ${dispersion.transferReference}`}
  isActive
/>
```
Chronological audit trail with icons and descriptions.

### PDF Download Pattern
```typescript
const extracto = generateExtractoPropietario(propietarioId, month);
if (extracto) {
  downloadExtractoPDF(extracto);
}
```
Generate data, then download - follows contract PDF pattern.

## Verification

- [x] pnpm tsc --noEmit passes
- [x] pnpm build succeeds
- [x] ComisionDesglose shows property-level breakdown
- [x] DispersionResumen shows monthly summary stats
- [x] ExtractoPropietario renders printable view
- [x] PDF download generates correctly
- [x] DispersionDetail opens with full dispersion info

## Commits

| Hash | Message |
|------|---------|
| f9957f7 | feat(07-02): add ComisionDesglose component for commission breakdown |
| 1c0573c | feat(07-02): add DispersionResumen component for monthly summary |
| f0e2511 | feat(07-02): add ExtractoPropietario component for owner statements |
| 7aa992c | feat(07-02): add PDF generation utility for extracto propietario |
| e045837 | feat(07-02): add DispersionDetail sheet component |
| f068d8e | feat(07-02): update barrel export with dispersion detail components |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 07-03 (Dispersiones Page) can proceed:
- All detail components ready for integration
- DispersionCard/Table from 07-01 available
- Summary and detail components ready for page layout
- PDF generation utility ready for download actions
