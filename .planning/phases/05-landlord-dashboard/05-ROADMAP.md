# Phase 5: Landlord Dashboard - Roadmap

## Phase Goal

Landlords can evaluate and decide on candidates with a premium, advisor-like experience.

## Vision Summary

From 05-CONTEXT.md:
- **Property-first navigation**: Pick a property, see its candidates
- **Quick comparison cards**: Badge + metrics + AI snippet visible at glance
- **Premium service feel**: Like having a property manager who did all the homework

## Plans

| Plan | Title | Wave | Status | Tasks |
|------|-------|------|--------|-------|
| 01 | Dashboard Foundation & Property Cards | 1 | Ready | 5 |
| 02 | Candidate Cards & Property View | 1 | Ready | 5 |
| 03 | Candidate Detail & Decision Workflow | 2 | Ready | 6 |

**Total Tasks**: 16
**Estimated Duration**: 45-60 minutes

## Wave Execution

### Wave 1: Foundation + Cards (Parallel)
- PLAN-01: Dashboard foundation, types, property cards
- PLAN-02: Candidate cards, list, property candidates page

### Wave 2: Detail & Decisions
- PLAN-03: Full candidate detail, decision workflow, notes

## Success Criteria (from ROADMAP.md)

1. ✓ Dashboard showing properties with application counts → PLAN-01
2. ✓ Candidates list per property (ranked by score) → PLAN-02
3. ✓ Candidate card: photo, name, score badge, key metrics → PLAN-02
4. ✓ Candidate detail modal/page with full AI explanation → PLAN-03
5. ✓ Decision buttons: Pre-aprobar, Aprobar, Rechazar → PLAN-03
6. ✓ Notes functionality (UI only, localStorage) → PLAN-03
7. ✓ Request more info action (UI state only) → PLAN-03

All success criteria mapped to plans.

## Dependencies

### From Phase 4 (Risk Score Display)
- `RiskScoreDisplay` - Full score visualization
- `LevelBadge` - A/B/C/D score badges
- `AIExplanation` - Conversational narrative
- `CategoryBreakdown` - Score details accordion
- `MOCK_CANDIDATES` - 12 test candidates

### From Phase 2 (Property Catalog)
- `MOCK_PROPERTIES` - Property data
- `Property` type - Base property interface

### New Dependencies (shadcn)
- Sheet (drawer) - For candidate detail
- Dialog - For confirmations
- Textarea - For notes

## Routes Created

- `/panel` - Landlord dashboard
- `/panel/[propertyId]` - Property candidates view

## Key Components

### Landlord-Specific
- `PropertyDashboardCard` - Property with candidate count
- `CandidateCard` - Quick comparison view
- `CandidateList` - Sorted candidate grid
- `CandidateDetail` - Full drawer with score display
- `CandidateMetrics` - Income/stability/history
- `AISnippet` - Truncated explanation
- `DecisionButtons` - Pre-aprobar/Aprobar/Rechazar
- `CandidateNotes` - Note-taking UI
- `DashboardSummary` - Stats overview

### Contexts
- `DecisionContext` - Persist decisions to localStorage

---

*Phase: 05-landlord-dashboard*
*Plans: 3*
*Created: 2026-01-19*
