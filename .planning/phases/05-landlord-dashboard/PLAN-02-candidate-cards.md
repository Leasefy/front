# PLAN-02: Candidate Cards & Property View

---
phase: 5
plan: 2
title: Candidate Cards & Property View
status: ready
estimated_tasks: 5
wave: 1
depends_on: PLAN-01
autonomous: true
---

## Objective

Create the candidate comparison experience. When landlords click a property, they see candidates as quick comparison cards - 3-4 visible at a glance. Each card shows score badge, key metrics, and a short AI snippet. This is the "premium service" experience where landlords can quickly scan and compare.

## Must Be True When Done

- [ ] Property candidates page at `/panel/[propertyId]`
- [ ] CandidateCard shows: score badge, key metrics (income, stability, history), AI snippet
- [ ] CandidateList displays cards ranked by score (best first)
- [ ] Quick decision buttons visible on each card
- [ ] Property header with back navigation
- [ ] 3-4 candidates visible without scrolling on desktop

## Tasks

### Task 1: Create CandidateCard Component
**File**: `src/components/landlord/CandidateCard.tsx`

Quick comparison card showing everything needed for initial screening:

```typescript
interface CandidateCardProps {
  candidate: LandlordCandidate;
  onViewDetails: (id: string) => void;
  onDecision: (id: string, status: CandidateStatus) => void;
}

// Layout:
// ┌─────────────────────────────────────────────────────────┐
// │ ┌──────┐                                    ┌───┐       │
// │ │ Foto │  María García, 32              [A] │   │       │
// │ │      │  Ingeniera Senior                  └───┘       │
// │ └──────┘                                                │
// ├─────────────────────────────────────────────────────────┤
// │  💰 $8.5M/mes  │  📅 5 años estable  │  ✓ Buen hist.   │
// ├─────────────────────────────────────────────────────────┤
// │  "Perfil excelente. Estabilidad laboral sólida y       │
// │   capacidad de pago comprobada. Sin banderas rojas."   │
// ├─────────────────────────────────────────────────────────┤
// │  [Pre-aprobar]  [Ver más]  [Rechazar]                  │
// └─────────────────────────────────────────────────────────┘
```

Metrics to show:
- Income (formatted): `$8.5M/mes`
- Stability: employment tenure
- History: rental/credit indicator

AI Snippet:
- First 2 sentences of aiExplanation
- Truncated with "..." if longer

**Verification**: Card renders with all sections, responsive

### Task 2: Create Key Metrics Component
**File**: `src/components/landlord/CandidateMetrics.tsx`

Compact metrics display for card:

```typescript
interface CandidateMetricsProps {
  income: number;
  employmentMonths: number;
  historyRating: 'positive' | 'mixed' | 'limited';
  variant?: 'compact' | 'full';
}

// Compact: icon + abbreviated value
// Full: icon + label + full value
```

Uses icons for visual scanning:
- 💰 Income
- 📅 Employment stability
- ✓/⚠/? History indicator

**Verification**: Metrics render in both variants

### Task 3: Create AI Snippet Component
**File**: `src/components/landlord/AISnippet.tsx`

Truncated AI explanation for card view:

```typescript
interface AISnippetProps {
  explanation: string;
  maxLength?: number; // default 150 chars
  level: RiskLevel;
}

// Truncates to first 2 sentences or maxLength
// Shows level-appropriate styling (muted for C/D)
```

**Verification**: Snippet truncates properly, respects sentence boundaries

### Task 4: Create CandidateList Component
**File**: `src/components/landlord/CandidateList.tsx`

Grid of candidate cards:

```typescript
interface CandidateListProps {
  candidates: LandlordCandidate[];
  onViewDetails: (id: string) => void;
  onDecision: (id: string, status: CandidateStatus) => void;
}

// Desktop: 2 columns, 3-4 visible at once
// Mobile: 1 column, scrollable
```

Features:
- Sorted by score (A candidates first)
- Visual grouping by level (optional separator)
- Empty state if no candidates

**Verification**: List renders sorted, responsive grid

### Task 5: Create Property Candidates Page
**File**: `src/app/panel/[propertyId]/page.tsx`

Page showing candidates for a specific property:

```typescript
// Layout:
// ┌─────────────────────────────────────────────────────────┐
// │  ← Volver a mis propiedades                            │
// ├─────────────────────────────────────────────────────────┤
// │  [Property Mini Card]                                  │
// │  Apartamento en Chapinero • $2.5M/mes • 5 candidatos   │
// ├─────────────────────────────────────────────────────────┤
// │                                                         │
// │  Candidatos                                            │
// │                                                         │
// │  ┌─────────────────────┐  ┌─────────────────────┐      │
// │  │   CandidateCard 1   │  │   CandidateCard 2   │      │
// │  │   (Level A)         │  │   (Level A)         │      │
// │  └─────────────────────┘  └─────────────────────┘      │
// │                                                         │
// │  ┌─────────────────────┐  ┌─────────────────────┐      │
// │  │   CandidateCard 3   │  │   CandidateCard 4   │      │
// │  │   (Level B)         │  │   (Level B)         │      │
// │  └─────────────────────┘  └─────────────────────┘      │
// └─────────────────────────────────────────────────────────┘
```

Features:
- Back navigation to dashboard
- Property context header
- CandidateList with all candidates
- Clicking "Ver más" opens detail (PLAN-03)

**Verification**: Page loads with candidates, navigation works

## Integration Notes

This plan delivers:
- The "quick comparison" experience from the vision
- 3-4 candidates visible for easy scanning
- Decision buttons ready for PLAN-03 implementation

Components created:
- CandidateCard → Used in detail view header in PLAN-03
- CandidateMetrics → Used in full detail view
- AISnippet → Complements full AIExplanation

## Dependencies

- PLAN-01: LandlordProperty, LandlordCandidate types
- PLAN-01: Mock landlord data
- Phase 4: LevelBadge component
- Phase 4: RiskScore types
