---
phase: 29-advanced-reports
plan: 03
subsystem: reports
tags: [tabs, feature-gate, pdf-export, page-integration]
completed: 2026-03-27
duration: ~5min

dependency-graph:
  requires: [29-01, 29-02]
  provides: [advanced-reports-page, pdf-export]
  affects: []

tech-stack:
  added: []
  patterns: [tabbed-reports, window-print-pdf, feature-gating]

key-files:
  created:
    - src/components/inmobiliaria/reports/ReportPDFExport.tsx
  modified:
    - src/app/panel/inmobiliaria/reportes/page.tsx

decisions: []
---

# Phase 29 Plan 03: Reports Page Integration, Tabs & PDF Export Summary

**One-liner:** Tabbed advanced reports section with FeatureGate plan gating and browser-based PDF export via window.print().

## What Was Built

### Enhanced Reportes Page
- Added "Reportes Avanzados" section below existing report cards
- 3-tab navigation: Ocupacion (Buildings icon), Cobros (CurrencyDollar icon), Agentes (Users icon)
- Tab bar uses existing app pattern: inline-flex, rounded-lg, active has bg-background + shadow-sm
- Default tab: ocupacion
- All tab content wrapped with `<FeatureGate feature="advanced-reports">` — non-Growth users see UpgradePrompt
- Each tab renders its respective component with mock data from mock-reports.ts

### ReportPDFExport Component
- Button: "Exportar PDF" / "Export PDF" with FileText icon
- Temporarily sets document.title to report name for clean PDF filename
- Calls `window.print()` for browser-native PDF generation
- `@media print` CSS block:
  - Hides nav, sidebar, header, tabs, and `.print:hidden` elements
  - Full-width content with no margins
  - Preserves chart colors via `print-color-adjust: exact`
  - A4 landscape page layout with 1.5cm margins

## Commits

| Hash | Message |
|------|---------|
| 5b09125 | feat(29-03): add advanced reports tabs and PDF export to reportes page |

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 were committed together since ReportPDFExport was needed for the page to compile.

## Verification

- [x] `npx next build --no-lint` compiles successfully
- [x] Reportes page shows 3 tabs (Ocupacion, Cobros, Agentes)
- [x] Switching tabs renders correct report component
- [x] FeatureGate wraps report content with feature='advanced-reports'
- [x] PDF export button present and triggers window.print()
