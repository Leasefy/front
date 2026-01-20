# Phase 6: Tenant Tracking - Roadmap

## Phase Goal

Tenants can track their application status with a clear timeline view.

## Vision Summary

From Phase 3 Application Wizard:
- Applicants complete a 6-step wizard and receive a tracking code
- "Ver mis aplicaciones" button links to `/mis-aplicaciones`
- Timeline UI pattern already established in ConfirmationScreen

Key UX principles:
- **Status at a glance**: Card shows property, status badge, key date
- **Timeline of events**: Visual progression of application milestones
- **Withdraw capability**: Tenant control over pending applications

## Plans

| Plan | Title | Wave | Status | Tasks |
|------|-------|------|--------|-------|
| 01 | Types, Mock Data & Application Card | 1 | Ready | 4 |
| 02 | Mis Aplicaciones Page & Timeline | 1 | Ready | 4 |

**Total Tasks**: 8
**Estimated Duration**: 25-35 minutes

## Wave Execution

### Wave 1: Foundation + Page (Parallel)
- PLAN-01: Types, mock tenant applications, ApplicationCard component
- PLAN-02: Page route, timeline view, withdraw action

## Success Criteria (from ROADMAP.md)

1. "Mis Postulaciones" page listing all applications → PLAN-02
2. Application card: property thumbnail, status badge, date → PLAN-01
3. Timeline view of application events → PLAN-02
4. Status states: Enviada, En revision, Pre-aprobada, Aprobada, Rechazada → PLAN-01
5. Detail view with current status explanation → PLAN-02
6. Withdraw application action (UI state only) → PLAN-02

All success criteria mapped to plans.

## Dependencies

### From Phase 3 (Application Wizard)
- `Application` type - Base application interface
- `ApplicationStatus` type - Status enum
- `ConfirmationScreen` - Timeline pattern reference
- `generateTrackingCode` - Tracking code format

### From Phase 2 (Property Catalog)
- `MOCK_PROPERTIES` - Property data for application cards
- `Property` type - Property interface

### From Phase 5 (Landlord Dashboard)
- `LandlordCandidateStatus` - Status mapping reference
- Status color pattern - Visual consistency

### New Dependencies (shadcn)
- None - all components available

## Routes Created

- `/mis-aplicaciones` - Tenant applications list

## Key Components

### Tenant-Specific
- `ApplicationCard` - Application summary with property thumbnail
- `ApplicationTimeline` - Event history visualization
- `ApplicationStatusBadge` - Status display with colors
- `ApplicationDetail` - Expanded view with timeline
- `WithdrawButton` - Cancel pending application

### Contexts
- `TenantApplicationContext` - Persist applications to localStorage

---

*Phase: 06-tenant-tracking*
*Plans: 2*
*Created: 2026-01-19*
