---
phase: inmobiliaria-06-cobros
plan: 03
subsystem: inmobiliaria-cobros
tags: [cobros, collections, reminders, modal, page]

dependency-graph:
  requires: ["06-01", "06-02"]
  provides: ["cobros-page", "recordatorio-config", "cobro-detail"]
  affects: ["future-dispersiones-phase"]

tech-stack:
  added: []
  patterns: ["sheet-drawer", "reminder-config", "optimistic-updates"]

key-files:
  created:
    - src/components/inmobiliaria/RecordatorioConfig.tsx
    - src/components/inmobiliaria/CobroDetail.tsx
    - src/app/panel/inmobiliaria/cobros/page.tsx
  modified:
    - src/components/inmobiliaria/index.ts

decisions:
  - id: reminder-sheet
    choice: "Sheet drawer for reminder config"
    reason: "Consistent with other config panels in the app"
  - id: day-selector
    choice: "Multi-select badge buttons for days"
    reason: "Visual clarity and easy toggle"
  - id: channel-toggles
    choice: "Switch components with icon boxes"
    reason: "Clear on/off state with visual appeal"
  - id: message-preview
    choice: "Template preview with highlighted variables"
    reason: "Users can see what messages look like"
  - id: cobro-detail-sections
    choice: "Grouped sections for property/tenant/amounts"
    reason: "Logical organization of information"
  - id: payment-history
    choice: "Timeline-style payment history"
    reason: "Easy to follow payment trail"
  - id: view-toggle
    choice: "Table/Card view toggle"
    reason: "User preference for data density"

metrics:
  duration: "14 min"
  completed: "2026-02-07"
---

# Phase 06 Plan 03: Cobros Page with RecordatorioConfig and CobroDetail Summary

Complete Cobros management page with reminder configuration and detail modal.

## One-liner

Cobros page with month filters, status tabs, payment registration, reminder config, and cobro detail drawer.

## What Was Built

### Task 1: RecordatorioConfig Component (455 lines)
- Sheet drawer for reminder settings
- Pre-vencimiento day selector (1, 3, 5, 7 days before)
- Post-vencimiento day selector (1, 3, 7, 15, 30 days after)
- Channel toggles for email, SMS, WhatsApp
- Message template previews with variable highlighting
- Save/cancel actions with validation

### Task 2: CobroDetail Component (675 lines)
- Sheet drawer showing complete cobro information
- Property section with thumbnail and consignacion link
- Tenant section with contact actions (call, WhatsApp, email)
- Propietario section with profile link
- Amount breakdown (rent, admin, late fee, total)
- Payment history for paid/partial cobros
- Reminder history with channel/type info
- Action footer (register payment, send reminder)
- "Mark as defaulted" option for late cobros

### Task 3: Cobros Page (445 lines)
- Full page at `/panel/inmobiliaria/cobros`
- CobroResumen integration for monthly stats
- CobroFilters with month selector, status tabs
- Table/card view toggle
- CobroDetail modal integration
- RegistrarPagoModal with optimistic updates
- RecordatorioConfig sheet integration
- Empty state for filtered results

## Commits

| Hash | Message |
|------|---------|
| 2c70429 | feat(06-03): create RecordatorioConfig component |
| ccbaeda | feat(06-03): create CobroDetail component |
| f38c399 | feat(06-03): create Cobros page with all integrations |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### RecordatorioConfig Features
- Multi-select day badges with toggle behavior
- Switch components for channel toggles
- Template variable highlighting with regex
- Form validation (requires at least 1 day and 1 channel)
- Framer Motion staggered animations

### CobroDetail Features
- Mock payment history generator for paid/partial
- Mock reminder history based on remindersSent count
- Contact actions with WhatsApp deeplink
- Copy-to-clipboard for email
- Sticky footer for actions

### Cobros Page Features
- Optimistic updates for payment registration
- Real-time summary recalculation
- Status-based filtering with counts
- Debounced search input
- View mode persistence

## Verification Results

- [x] `pnpm tsc --noEmit` passes
- [x] `pnpm build` succeeds
- [x] Navigate to /panel/inmobiliaria/cobros shows page
- [x] Month selector changes displayed cobros
- [x] Status tabs filter correctly
- [x] Click cobro opens detail modal
- [x] Register payment opens payment modal
- [x] Payment registration updates list
- [x] Reminder config saves settings

## Next Phase Readiness

Phase 6 Cobros is now COMPLETE. All 3 plans delivered:
- 06-01: CobroCard, CobroTable, CobroFilters
- 06-02: RegistrarPagoModal, MoraAlert, CobroResumen
- 06-03: RecordatorioConfig, CobroDetail, Cobros page

Ready for Phase 7 (Dispersiones) which will handle:
- Owner payment disbursements
- Commission calculations
- Bank transfer management
