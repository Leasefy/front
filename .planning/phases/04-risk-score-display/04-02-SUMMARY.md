---
phase: 4
plan: 2
subsystem: risk-score-display
tags: [components, ui, score-card, badge, progress-bar, accordion]
requires: [04-01]
provides: [score-components, level-badge, score-card, category-breakdown, progress-bar]
affects: [04-03, 04-04, 05-dashboard]
tech-stack:
  added: []
  patterns: [accordion-ui, progress-bar-animation, composable-components]
key-files:
  created:
    - src/components/score/LevelBadge.tsx
    - src/components/score/ScoreCard.tsx
    - src/components/score/CategoryBreakdown.tsx
    - src/components/score/ScoreProgressBar.tsx
    - src/components/score/index.ts
    - src/app/demo/score/page.tsx
  modified: []
decisions:
  - id: score-component-structure
    decision: Composable components with barrel export
    rationale: Flexible composition for different views (dashboard, detail, compact)
  - id: level-badge-sizes
    decision: Three size variants (sm/md/lg) with optional labels
    rationale: Badge needs to work in cards (sm), lists (md), and detail views (lg)
  - id: progress-bar-animation
    decision: CSS transition animation on mount
    rationale: Smooth visual feedback without JavaScript complexity
  - id: category-icons
    decision: Auto-detect icons from category name
    rationale: Consistent iconography without manual mapping per category
metrics:
  duration: 3.5 min
  completed: 2026-01-20
---

# Phase 4 Plan 2: Score Card Component Summary

**One-liner:** Visual score display components - LevelBadge, ScoreCard, CategoryBreakdown, ScoreProgressBar with Luxterra aesthetic.

## What Was Built

### LevelBadge Component
`src/components/score/LevelBadge.tsx`

Circular badge displaying risk level (A/B/C/D):
- Three size variants: sm (24px), md (32px), lg (48px)
- Optional label showing level name (Excelente, Bueno, Regular, Riesgoso)
- Muted Luxterra color palette for professional appearance
- Accessible with aria-label

```typescript
<LevelBadge level="A" size="lg" showLabel />
```

### ScoreCard Component
`src/components/score/ScoreCard.tsx`

Main score display card with two variants:
- **Compact**: Horizontal layout with badge + score + label
- **Full**: Vertical layout with badge + score + label + key drivers

Features:
- Subtle background color matching risk level
- Key drivers shown as checkmark list (up to 4)
- Optional candidate name in full variant
- Border and shadow matching Luxterra design

```typescript
<ScoreCard score={riskScore} variant="full" candidateName="Maria Garcia" />
```

### ScoreProgressBar Component
`src/components/score/ScoreProgressBar.tsx`

Visual progress bar for category scores:
- Two size variants: sm (4px) and md (8px)
- Color matches risk level
- CSS transition animation on mount
- Optional numeric value display
- Accessible with ARIA attributes

```typescript
<ScoreProgressBar score={85} level="A" size="md" showValue />
```

### CategoryBreakdown Component
`src/components/score/CategoryBreakdown.tsx`

Accordion-based category score breakdown:
- Uses shadcn Accordion for expand/collapse
- Auto-icons based on category name (income, stability, history, credit)
- Mini progress bar in header (hidden on mobile)
- Full progress bar when expanded
- Contributing factors list
- Weight percentage indicator

```typescript
<CategoryBreakdown categories={score.categories} defaultExpanded />
```

### Demo Page
`src/app/demo/score/page.tsx`

Visual verification page at `/demo/score`:
- All badge sizes and levels
- Progress bars with/without values
- Score cards in both variants
- Category breakdowns for different risk levels
- Complete example combining all components

## Key Design Decisions

1. **Composable Components**: Each component is standalone and can be combined for different views (dashboard cards, detail pages, comparison views).

2. **Luxterra Aesthetic**: Muted colors from RISK_LEVEL_COLORS constant - light backgrounds (bgLight), subtle borders (border), dark text (text).

3. **Mobile-First**: Mini progress bar hidden on small screens, full layout preserved for essential information.

4. **Accessibility**: ARIA labels on badges and progress bars, semantic HTML structure.

## Commits

| Hash | Description |
|------|-------------|
| d2f7b3b | LevelBadge component with sizes and labels |
| 3e6f689 | ScoreCard component with compact/full variants |
| 0c87093 | ScoreProgressBar component with animation |
| 5d4f316 | CategoryBreakdown component with accordion |
| 8a1367b | Barrel export and demo page |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for PLAN-03: AI Explanation Component
- All visual score components are available
- Demo page can be used to test AI explanation integration
- Components designed for composition with explanation narrative

## Files Summary

```
src/components/score/
  LevelBadge.tsx       # Circular level badge (A/B/C/D)
  ScoreCard.tsx        # Main score display card
  ScoreProgressBar.tsx # Animated progress bar
  CategoryBreakdown.tsx # Accordion category details
  index.ts             # Barrel export

src/app/demo/score/
  page.tsx             # Visual demo page
```
