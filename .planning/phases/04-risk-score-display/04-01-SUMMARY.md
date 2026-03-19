# Phase 4 Plan 1: Risk Score Types & Mock Data Summary

---
phase: 4
plan: 1
subsystem: risk-scoring
tags: [types, mock-data, risk-score, candidates]
requires: [phase-3-complete]
provides: [risk-types, candidate-types, mock-candidates, score-constants]
affects: [04-02, 04-03, 04-04]
tech-stack:
  added: []
  patterns: [type-driven-development, mock-data-first]
key-files:
  created:
    - src/lib/types/risk-score.ts
    - src/lib/types/candidate.ts
    - src/lib/constants/risk-levels.ts
    - src/lib/data/mock-explanations.ts
    - src/lib/data/mock-candidates.ts
    - src/lib/types/index.ts
    - src/lib/data/index.ts
    - src/lib/constants/index.ts
  modified: []
decisions:
  - key: risk-levels
    choice: A/B/C/D with emerald/blue/amber/red colors
    rationale: Matches existing badge variants, clear visual hierarchy
  - key: score-thresholds
    choice: A>=85, B>=70, C>=50, D<50
    rationale: Industry-standard credit score mapping
  - key: explanation-tone
    choice: Conversational Spanish "asesor de confianza"
    rationale: Matches product vision for trustworthy AI advisor
metrics:
  duration: 5.5min
  completed: 2026-01-20
---

## One-liner

Type definitions for risk scoring (RiskScore, Candidate) with 12 mock Colombian profiles and conversational AI explanations per level.

## Completed Tasks

| Task | Description | Commit | Key Output |
|------|-------------|--------|------------|
| 1 | Define Risk Score Types | 9b27fab | `src/lib/types/risk-score.ts` |
| 2 | Define Candidate Types | 61a8234 | `src/lib/types/candidate.ts` |
| 3 | Create Score Level Constants | 433070e | `src/lib/constants/risk-levels.ts` |
| 4 | Create Mock AI Explanations | 83b04dd | `src/lib/data/mock-explanations.ts` |
| 5 | Create Mock Candidates Data | 6643fb1 | `src/lib/data/mock-candidates.ts` |
| 6 | Export and Index | 74acd00 | Index files for types/data/constants |

## Key Deliverables

### Risk Score Type System
- `RiskLevel`: A/B/C/D grades
- `ScoreCategory`: Individual scoring dimensions (financial, employment, history, documents)
- `RiskFlag`: Warning indicators with severity levels
- `SuggestedCondition`: Recommended lease conditions
- `RiskScore`: Complete assessment with AI explanation

### Candidate Type System
- `CandidateBasic`: Minimal info for list views
- `Candidate`: Full profile with all details
- `CandidateStatus`: Application lifecycle states
- `CandidateFilters` and `CandidateSortOptions`: List operations

### Score Level Constants
- `RISK_LEVEL_COLORS`: Tailwind classes per level
- `RISK_LEVEL_BADGE_VARIANTS`: Badge component mapping
- `RISK_LEVEL_LABELS/DESCRIPTIONS/RECOMMENDATIONS`: UI text
- Helper functions: `getScoreLevel()`, `getRiskColors()`, `isSafeRiskLevel()`

### Mock Data
- **12 candidates** with realistic Colombian profiles:
  - 2 Level A (Maria Garcia, Carlos Rodriguez)
  - 4 Level B (Ana Lopez, Juan Martinez, Valentina Restrepo, Santiago Ramirez)
  - 4 Level C (Sofia Hernandez, Pedro Diaz, Camila Torres, Luis Moreno)
  - 2 Level D (Laura Sanchez, Andres Gutierrez)
- **19 AI explanations** (4 Level A, 5 Level B, 5 Level C, 5 Level D)
- Conversational tone: warm, professional, non-alarmist

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Risk levels | A/B/C/D grades | Simple, familiar, maps to badge variants |
| Score thresholds | 85/70/50/0 | Industry-standard credit score ranges |
| Color scheme | emerald/blue/amber/red | Clear severity hierarchy, Luxterra aesthetic |
| Explanation tone | "Asesor de confianza" | Product vision: trusted advisor, not dashboard |
| Mock data scope | 12 candidates | Covers all levels with variety |

## Verification Results

- [x] RiskScore type defined with level, numeric score, categories
- [x] Candidate type defined with personal, employment, income, score
- [x] 12 mock candidates with realistic Colombian profiles
- [x] Pre-written AI explanations for each risk level (19 total)
- [x] Score level constants exported with colors and labels
- [x] Types integrate with existing Application types
- [x] TypeScript compilation passes

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 2: Risk Score Overview Card. All types and mock data are in place for building UI components.

**Dependencies satisfied:**
- RiskScore type for score display components
- Candidate type for candidate cards and lists
- Mock candidates for testing UI with varied profiles
- AI explanations for conversational display
