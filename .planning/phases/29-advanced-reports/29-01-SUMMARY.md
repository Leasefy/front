---
phase: 29-advanced-reports
plan: 01
subsystem: reports
tags: [reports, mock-data, occupancy, collections, css-charts]
dependency_graph:
  requires: []
  provides: [mock-reports-data, occupancy-report-component, collections-report-component]
  affects: [29-02, 29-03]
tech_stack:
  added: []
  patterns: [css-bar-charts, kpi-cards, data-props-pattern]
key_files:
  created:
    - src/lib/data/mock-reports.ts
    - src/components/inmobiliaria/reports/OccupancyReport.tsx
    - src/components/inmobiliaria/reports/CollectionsReport.tsx
  modified: []
decisions:
  - id: css-only-charts
    decision: "Use pure CSS/Tailwind for all chart visualizations"
    rationale: "No external charting library needed for simple bar/trend charts"
  - id: data-via-props
    decision: "Components accept data as props, not importing mock data directly"
    rationale: "Flexibility for future API integration; page controls data source"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-27"
---

# Phase 29 Plan 01: Mock Data & Core Report Components Summary

CSS-only occupancy and collections reports with 12-month trend charts, zone breakdowns, and delinquent tracking using mock Colombian property data.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create mock report data | 17f5b9e | src/lib/data/mock-reports.ts |
| 2 | Build OccupancyReport and CollectionsReport | 6aec2da | reports/OccupancyReport.tsx, reports/CollectionsReport.tsx |

## What Was Built

### Mock Data (mock-reports.ts)
- **OccupancyData**: 18 properties across 5 Colombian zones (Chapinero, Usaquen, Suba, Cedritos, Laureles), zone-level aggregation, 12-month occupancy trend
- **CollectionsData**: Monthly expected vs collected for 12 months, 7 top delinquents with contact attempts, mora rate and recovery metrics
- **AgentPerformanceData**: 5 agents with closings, conversion rates, revenue; team summary (for plan 02)
- All amounts in COP, all interfaces exported

### OccupancyReport Component
- 4 KPI cards: total properties, rented, vacant, vacancy rate with avg days vacant
- Zone occupancy bar chart: color-coded by threshold (emerald >= 90%, blue >= 70%, amber >= 50%, red < 50%)
- 12-month trend: CSS bar chart with hover tooltips showing percentage
- Property detail table: status badges (Arrendado/Vacante), days vacant, tenant, rent amount

### CollectionsReport Component
- 4 KPI cards: expected, collected, late amount, recovery rate
- Stacked bar chart: collected (emerald) + late (red) per month with hover mora %
- Mora rate trend: horizontal progress bars per month, color-coded by severity
- Top delinquents table: avatar placeholder, days-late badge (color by severity), amount, contact attempts

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| css-only-charts | Pure CSS/Tailwind bar charts, no charting library | Simple visualizations don't justify a dependency |
| data-via-props | Components receive data as props | Enables future API integration without component changes |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npx next build --no-lint` compiles successfully
- [x] mock-reports.ts exports all 3 data types with TypeScript interfaces (12 interfaces, 3 data constants)
- [x] OccupancyReport renders vacancy stats, zone chart, trend, and property table
- [x] CollectionsReport renders mora stats, monthly breakdown, trend, and delinquents table

## Next Phase Readiness

Plan 29-02 can proceed immediately - AgentPerformanceData is already exported from mock-reports.ts.
Plan 29-03 (page integration) depends on 29-01 and 29-02 completion.
