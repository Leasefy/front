# PLAN-01: Dashboard Foundation & Property Cards

---
phase: 5
plan: 1
title: Dashboard Foundation & Property Cards
status: ready
estimated_tasks: 5
wave: 1
autonomous: true
---

## Objective

Create the landlord dashboard foundation with property-first navigation. Landlords see their properties as cards with application counts ("5 candidatos" badges). This establishes the entry point for the entire landlord experience.

## Must Be True When Done

- [ ] LandlordProperty type extending Property with candidates array
- [ ] Mock data associating candidates with properties (3 properties, 12 candidates distributed)
- [ ] Dashboard page at `/panel` showing landlord's properties
- [ ] PropertyDashboardCard showing property photo + "X candidatos" badge
- [ ] Clicking a property navigates to candidates view

## Tasks

### Task 1: Define Landlord Types
**File**: `src/lib/types/landlord.ts`

```typescript
import type { Property } from './property';
import type { CandidateBasic, CandidateStatus } from './candidate';

// Property with application counts for dashboard
export interface LandlordProperty extends Property {
  candidateCount: number;
  pendingCount: number; // awaiting decision
  candidates?: CandidateBasic[]; // populated on detail view
}

// Candidate status for landlord decisions
export type CandidateStatus =
  | 'pending'      // Nueva - awaiting review
  | 'pre-approved' // Pre-aprobado
  | 'approved'     // Aprobado
  | 'rejected'     // Rechazado
  | 'more-info';   // Requiere más información

// Extended candidate with status for landlord view
export interface LandlordCandidate extends CandidateBasic {
  status: CandidateStatus;
  appliedAt: string;
  notes?: string;
  statusChangedAt?: string;
}

// Dashboard summary
export interface DashboardSummary {
  totalProperties: number;
  totalCandidates: number;
  pendingReview: number;
  preApproved: number;
}
```

**Verification**: Types compile, integrate with existing Property and Candidate types

### Task 2: Create Mock Landlord Data
**File**: `src/lib/data/mock-landlord-data.ts`

Associate the 12 mock candidates with 3 properties for testing:

```typescript
// Property 1: Apartamento Chapinero - 5 candidates (1A, 2B, 1C, 1D)
// Property 2: Casa Usaquén - 4 candidates (1A, 1B, 2C)
// Property 3: Apartamento Poblado - 3 candidates (2B, 1C)

export const LANDLORD_PROPERTIES: LandlordProperty[] = [
  {
    ...MOCK_PROPERTIES[0], // Chapinero property
    candidateCount: 5,
    pendingCount: 3,
  },
  // ...
];

export const PROPERTY_CANDIDATES: Record<string, LandlordCandidate[]> = {
  'prop-1': [/* 5 candidates sorted by score */],
  'prop-2': [/* 4 candidates sorted by score */],
  'prop-3': [/* 3 candidates sorted by score */],
};
```

**Verification**: All 12 candidates associated, counts are accurate

### Task 3: Create PropertyDashboardCard Component
**File**: `src/components/landlord/PropertyDashboardCard.tsx`

Card showing property with candidate count badge:

```typescript
interface PropertyDashboardCardProps {
  property: LandlordProperty;
  onClick?: () => void;
}

// Layout:
// ┌─────────────────────────────────────────┐
// │  [Property Image]                       │
// │                              ┌────────┐ │
// │                              │5 cand. │ │
// │                              └────────┘ │
// ├─────────────────────────────────────────┤
// │  Apartamento en Chapinero               │
// │  $ 2.500.000/mes                        │
// │  ┌──────┐ ┌──────┐                      │
// │  │3 pend│ │2 rev │                      │
// │  └──────┘ └──────┘                      │
// └─────────────────────────────────────────┘
```

Features:
- Property image with badge overlay
- Property title and price
- Candidate count prominent
- Pending vs reviewed breakdown
- Click navigates to property candidates

**Verification**: Card renders with badge, click works

### Task 4: Create Dashboard Page
**File**: `src/app/panel/page.tsx`

Landlord dashboard showing all properties:

```typescript
// Page layout:
// ┌─────────────────────────────────────────────────┐
// │  Mi Panel                                       │
// │                                                 │
// │  ┌─────────────────┐                            │
// │  │ 12 candidatos   │ 5 pendientes │ 2 aprobados│
// │  └─────────────────┘                            │
// │                                                 │
// │  Mis Propiedades                               │
// │                                                 │
// │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
// │  │ Prop 1  │ │ Prop 2  │ │ Prop 3  │           │
// │  │ 5 cand  │ │ 4 cand  │ │ 3 cand  │           │
// │  └─────────┘ └─────────┘ └─────────┘           │
// └─────────────────────────────────────────────────┘
```

Features:
- Summary stats at top
- Grid of PropertyDashboardCards
- Click navigates to `/panel/[propertyId]`
- Premium "asesor" messaging

**Verification**: Page renders at /panel, shows all properties with counts

### Task 5: Create Dashboard Summary Component
**File**: `src/components/landlord/DashboardSummary.tsx`

Summary stats for the dashboard header:

```typescript
interface DashboardSummaryProps {
  summary: DashboardSummary;
}

// Shows: Total candidatos | Pendientes | Pre-aprobados | Aprobados
```

**Verification**: Summary displays correct counts

## Integration Notes

This plan establishes:
- Entry point at `/panel` for landlords
- Property-first navigation pattern
- Foundation for candidate drilling in PLAN-02

Components will be used:
- PropertyDashboardCard → PLAN-02 uses for property detail header
- Dashboard types → PLAN-02, PLAN-03 use for state management

## Dependencies

- Phase 4 mock candidates (`src/lib/data/mock-candidates.ts`)
- Phase 2 properties (`src/lib/data/mock-properties.ts`)
- Existing UI components (Card, Badge)
