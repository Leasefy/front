# Phase 5 Plan 2: Candidate Cards & Property View Summary

**One-liner:** Quick comparison cards with metrics, AI snippets, and decision buttons for landlord screening.

---

## Frontmatter

```yaml
phase: 5
plan: 2
subsystem: landlord-dashboard
tags: [candidate-cards, metrics, ai-snippet, property-view]

dependency-graph:
  requires: [05-01]
  provides: [candidate-card-system, property-candidates-page]
  affects: [05-03]

tech-stack:
  added: []
  patterns: [responsive-grid, truncation, level-styling]

key-files:
  created:
    - src/components/landlord/CandidateCard.tsx
    - src/components/landlord/CandidateMetrics.tsx
    - src/components/landlord/AISnippet.tsx
    - src/components/landlord/CandidateList.tsx
    - src/app/panel/[propertyId]/page.tsx
    - src/components/landlord/index.ts
  modified: []

decisions:
  - id: metrics-compact-format
    choice: "$XM/mes | X anos estable | icon indicator"
    rationale: "Quick visual scanning for landlords comparing multiple candidates"
  - id: ai-snippet-truncation
    choice: "First 2 sentences or 150 chars, respecting sentence boundaries"
    rationale: "Preserves natural reading flow while keeping cards compact"
  - id: level-styling
    choice: "A/B colored accents, C/D muted styling"
    rationale: "Visual hierarchy prioritizes promising candidates"

metrics:
  duration: 8min
  completed: 2026-01-20
```

---

## What Was Built

### Task 1: CandidateCard Component
**File:** `src/components/landlord/CandidateCard.tsx`

Quick comparison card for landlord screening with:
- Header section: photo placeholder, name (2 words), occupation, age, LevelBadge
- Metrics section: income, employment tenure, history rating (via CandidateMetrics)
- AI section: truncated assessment (via AISnippet)
- Action buttons: Pre-aprobar, Ver mas, Rechazar

The card fetches full candidate data from mock to get extra info not in LandlordCandidate.

### Task 2: CandidateMetrics Component
**File:** `src/components/landlord/CandidateMetrics.tsx`

Displays three key metrics for quick scanning:
- **Income:** Compact format `$8.5M/mes` or full format with label
- **Employment:** `4 anos estable`, `6 meses`, or `Reciente`
- **History:** Icon indicators (checkmark/tilde/question) with color coding

Two variants:
- `compact`: Single row with dividers, icon + value
- `full`: Stacked layout with labels

### Task 3: AISnippet Component
**File:** `src/components/landlord/AISnippet.tsx`

Truncated AI explanation with intelligent truncation:
- Takes first 2 sentences OR maxLength (default 150)
- Respects sentence boundaries for natural reading
- Falls back to word boundary if still too long
- Level-appropriate styling: A/B get colored borders, C/D are muted
- Sparkle icon indicating AI-generated content

### Task 4: CandidateList Component
**File:** `src/components/landlord/CandidateList.tsx`

Grid display of candidate cards:
- Responsive: 2 columns on desktop, 1 on mobile
- Sorted by score (highest first)
- Optional `groupByLevel` prop for visual sections
- Empty state with user-friendly message and icon

### Task 5: Property Candidates Page
**File:** `src/app/panel/[propertyId]/page.tsx`

Route `/panel/[propertyId]` showing:
- Back navigation to dashboard
- Property header card (thumbnail, title, location, rent, stats)
- Candidate count badge
- CandidateList with decision handlers
- Not found state for invalid property IDs

Decision handlers update local state (backend integration in future).

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Technical Decisions

### Metrics Display Format
Chose compact representation `$8.5M/mes` over full currency format to enable quick visual scanning. Landlords comparing 4+ candidates need to see key numbers at a glance.

### AI Truncation Algorithm
Used sentence-boundary-aware truncation rather than simple character limit. First attempts to extract 2 complete sentences, then falls back to maxLength with word boundary preservation. This produces more natural-reading snippets.

### Level-Based Styling
A/B candidates get colored borders (emerald/blue) to draw attention to promising profiles. C/D use muted slate styling to de-emphasize without hiding. This creates natural visual hierarchy without explicit ranking labels.

### Mock Data Integration
CandidateCard reaches into MOCK_CANDIDATES to get full candidate data (income, employment months, risk score) from the basic LandlordCandidate. In production, this would be a single API call returning complete data.

---

## Commits

| Hash | Message |
|------|---------|
| 63637b5 | feat(05-02): create CandidateCard component |
| db423f1 | feat(05-02): create CandidateMetrics component |
| 6e53980 | feat(05-02): create AISnippet component |
| 64d001e | feat(05-02): create CandidateList component |
| 8ed3556 | feat(05-02): create Property Candidates page |

---

## Verification

- [x] Property candidates page at `/panel/[propertyId]`
- [x] CandidateCard shows: score badge, key metrics, AI snippet
- [x] CandidateList displays cards ranked by score
- [x] Quick decision buttons visible on each card
- [x] Property header with back navigation
- [x] 2 candidates visible per row on desktop (3-4 visible without scrolling)
- [x] TypeScript compiles without errors
- [x] ESLint passes without warnings
- [x] Build succeeds

---

## Next Phase Readiness

Ready for PLAN-03: Detail View & Decision Actions
- CandidateCard's "Ver mas" navigates to `/panel/[propertyId]/candidato/[candidateId]`
- Decision buttons call handlers that can be extended for backend integration
- All candidate data structures established and working
