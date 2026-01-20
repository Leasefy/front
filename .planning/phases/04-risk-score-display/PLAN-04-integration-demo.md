# PLAN-04: Integration & Demo Page

---
phase: 4
plan: 4
title: Integration & Demo Page
status: ready
estimated_tasks: 5
depends_on: PLAN-01, PLAN-02, PLAN-03
---

## Objective

Create a demo page to showcase the risk score display in context, with candidate selection and full flow testing. This serves as both a development testing ground and a preview of how scores will appear in the landlord dashboard (Phase 5).

## Must Be True When Done

- [ ] Demo page at `/demo/score` shows risk score components
- [ ] Candidate selector allows switching between mock candidates
- [ ] Full RiskScoreDisplay works with all candidate levels
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Animation sequence plays correctly
- [ ] Components ready for Phase 5 (Landlord Dashboard) integration

## Tasks

### Task 1: Create Demo Page Route
**File**: `src/app/demo/score/page.tsx`

Development demo page for testing risk score display:

```typescript
// Layout:
// ┌─────────────────────────────────────────────┐
// │ Risk Score Display - Demo                   │
// │                                              │
// │ Seleccionar candidato: [▼ Maria Garcia (A)] │
// │                                              │
// │ ┌─────────────────────────────────────────┐ │
// │ │                                         │ │
// │ │   [Full RiskScoreDisplay Component]    │ │
// │ │                                         │ │
// │ └─────────────────────────────────────────┘ │
// │                                              │
// │ ┌─────────────────────────────────────────┐ │
// │ │ Variant: ○ Full  ○ Compact  ○ Embedded │ │
// │ │ Animation: ☑ Enable                     │ │
// │ │ [Replay Animation]                      │ │
// │ └─────────────────────────────────────────┘ │
// └─────────────────────────────────────────────┘
```

Features:
- Dropdown to select mock candidate
- Toggle between display variants
- Animation enable/disable
- Replay animation button
- Mobile responsive

**Verification**: Page loads, candidate selection works

### Task 2: Create CandidateSelector Component
**File**: `src/components/demo/CandidateSelector.tsx`

Reusable selector for demo/testing:

```typescript
interface CandidateSelectorProps {
  candidates: CandidateBasic[];
  selectedId: string;
  onChange: (candidateId: string) => void;
}
```

Design:
- Dropdown showing candidate name + level badge
- Grouped by level (A candidates, B candidates, etc.)
- Quick visual indicator of selected candidate's level

**Verification**: Dropdown works, shows all candidates

### Task 3: Create Demo Controls Component
**File**: `src/components/demo/DemoControls.tsx`

Controls for testing different configurations:

```typescript
interface DemoControlsProps {
  variant: 'compact' | 'full' | 'embedded';
  onVariantChange: (variant: string) => void;
  animationEnabled: boolean;
  onAnimationToggle: () => void;
  onReplayAnimation: () => void;
}
```

Controls:
- Radio buttons for variant selection
- Checkbox for animation enable/disable
- Button to replay animation
- Optional: speed control slider

**Verification**: Controls work, affect display component

### Task 4: Test Responsive Design
**Task type**: Testing, not coding

Test RiskScoreDisplay on:
- Mobile (375px width)
- Tablet (768px width)
- Desktop (1280px width)

Check:
- Text doesn't overflow
- Buttons are touch-friendly
- Animation works on mobile
- Category breakdown accordion works
- No horizontal scroll

Fix any responsive issues found.

**Verification**: All breakpoints tested, no layout issues

### Task 5: Create Phase Summary and Update ROADMAP
**File**: `src/app/demo/score/page.tsx` (finalize)
**File**: `.planning/phases/04-risk-score-display/04-SUMMARY.md`

Final tasks:
1. Ensure demo page is polished and usable
2. Create phase summary documenting what was built
3. Update main ROADMAP.md to mark Phase 4 complete
4. Note any learnings or patterns for Phase 5

**Verification**: Summary created, ROADMAP updated

## Demo Page UX

The demo page should feel like a "playground" for the risk score:

1. **Header**: Clear title explaining what this is
2. **Selector**: Easy candidate switching
3. **Display**: Full risk score component
4. **Controls**: Developer-friendly testing options
5. **Footer**: Link back to main app, notes about Phase 5

## Integration Notes for Phase 5

The RiskScoreDisplay component should be ready for:
- Landlord Dashboard candidate detail view
- Candidate comparison modal
- Quick score preview in candidate list

Export patterns needed:
```typescript
// For quick badge in list
import { LevelBadge } from '@/components/score';

// For full detail view
import { RiskScoreDisplay } from '@/components/score';

// For custom compositions
import {
  ScoreCard,
  AIExplanation,
  CategoryBreakdown,
} from '@/components/score';
```

## Dependencies

- All previous PLAN-01, PLAN-02, PLAN-03 complete
- Mock candidates data available

## Notes

- Demo page is for development, not production users
- Can be hidden behind `/demo/` route (not in nav)
- Consider adding to route group `(demo)` for easy exclusion
- This page validates Phase 4 is complete before Phase 5
