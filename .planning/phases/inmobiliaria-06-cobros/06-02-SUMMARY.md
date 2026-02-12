---
phase: inmobiliaria-06-cobros
plan: 02
subsystem: inmobiliaria-cobros
tags: [payments, forms, modals, alerts, summary-cards]

dependency-graph:
  requires:
    - inmobiliaria-06-01 (CobroCard, CobroTable types)
  provides:
    - RegistrarPagoModal for payment registration
    - MoraAlert for late payment indicators
    - CobroResumen for monthly summary display
  affects:
    - inmobiliaria-06-03 (Cobros page will use these)

tech-stack:
  added: []
  patterns:
    - react-hook-form for payment form handling
    - Dialog modal pattern for payment registration
    - Severity-based alert styling (warning/critical/severe)
    - Animated counters with easeOutExpo easing
    - Progress bar visualization for collection rate

key-files:
  created:
    - src/components/inmobiliaria/RegistrarPagoModal.tsx
    - src/components/inmobiliaria/MoraAlert.tsx
    - src/components/inmobiliaria/CobroResumen.tsx
  modified:
    - src/components/inmobiliaria/index.ts

decisions:
  - name: "Partial payment confirmation"
    choice: "Show warning dialog before confirming partial payments"
    reason: "Prevent accidental partial payments, make intent explicit"
  - name: "Mora severity thresholds"
    choice: "Warning 1-15d, Critical 16-30d, Severe 30+d"
    reason: "Standard collections industry escalation pattern"
  - name: "Collection rate colors"
    choice: "Green >90%, Amber 70-90%, Red <70%"
    reason: "Industry standard KPI thresholds for healthy collections"

metrics:
  duration: 7min
  completed: 2026-02-08
---

# Phase 6 Plan 2: RegistrarPagoModal + MoraAlert + CobroResumen Summary

**One-liner:** Payment registration modal with full/partial support, severity-based mora alerts, and animated collection summary cards.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | RegistrarPagoModal | 482e997 | RegistrarPagoModal.tsx |
| 2 | MoraAlert | 86835c4 | MoraAlert.tsx |
| 3 | CobroResumen | dba15eb | CobroResumen.tsx |
| 4 | Barrel Export | 48a610c | index.ts |

## Key Implementation Details

### RegistrarPagoModal
- **Modal Structure**: Dialog with cobro summary, payment form, and actions
- **Cobro Summary Section**: Property info, tenant, month, due date, amounts (total, paid, pending)
- **Payment Form**: Amount input with "Pago total" quick button, 6 payment methods grid
- **Validation**: Amount > 0, cannot exceed pending, date required, method required
- **Partial Payment**: Shows confirmation dialog before completing partial payments
- **Payment Methods**: Transferencia, Efectivo, Tarjeta, Cheque, PSE, Otro

### MoraAlert
- **Severity Levels**:
  - Warning (1-15 days): Amber styling
  - Critical (16-30 days): Red with pulse animation
  - Severe (30+ days): Dark red with urgent pulse
- **Content**: Days late count, late fee amount, total with fees
- **Actions**: Optional "Enviar recordatorio" and "Ver historial" buttons
- **Compact Mode**: Just icon + days count for tables/cards

### CobroResumen
- **Stats Grid (2x4)**: Por cobrar, Cobrado, Pendiente, En mora
- **Collection Rate**: Large percentage with progress bar visualization
- **Rate-based Colors**: Green >90%, Amber 70-90%, Red <70%
- **Counts Row**: Pagados, Pendientes, En mora counts
- **Quick Actions**: "Ver pendientes" and "Ver morosos" links
- **Animations**: Counter animation on load (easeOutExpo), progress bar animation

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] pnpm tsc --noEmit passes
- [x] pnpm build succeeds (64/64 pages)
- [x] RegistrarPagoModal opens with cobro info
- [x] Partial payment shows confirmation
- [x] MoraAlert shows severity-based colors
- [x] CobroResumen shows all summary stats
- [x] Collection rate displays with progress bar

## Next Phase Readiness

**Blockers**: None

**For Plan 06-03 (Cobros Page)**:
- RegistrarPagoModal ready for integration
- MoraAlert can be used in CobroCard and CobroTable rows
- CobroResumen ready for page header section
- All components exported from barrel
