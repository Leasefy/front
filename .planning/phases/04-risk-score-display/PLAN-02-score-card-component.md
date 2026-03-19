# PLAN-02: Score Card Component

---
phase: 4
plan: 2
title: Score Card Component
status: ready
estimated_tasks: 5
depends_on: PLAN-01
---

## Objective

Create the visual score display components with level badge and category breakdown. The score card should be prominent but not dominant - the narrative AI explanation (PLAN-03) will be the focus, with the badge serving as visual backup.

## Must Be True When Done

- [ ] LevelBadge component renders A/B/C/D with appropriate colors
- [ ] ScoreCard shows badge + numeric score + quick summary
- [ ] CategoryBreakdown shows income, stability, history scores
- [ ] Components follow Luxterra aesthetic (muted, professional)
- [ ] Mobile responsive - works beautifully on phones
- [ ] Components are composable and reusable

## Design Reference

From FRONTEND-VISION.md:
- "Level A/B/C/D as visual backup, narrative leads"
- Badge should be visible but secondary to explanation
- Professional, trustworthy appearance

## Tasks

### Task 1: Create LevelBadge Component
**File**: `src/components/score/LevelBadge.tsx`

Badge that displays the risk level (A/B/C/D):

```typescript
interface LevelBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean; // "Excelente", "Bueno", etc.
}
```

Design specs:
- **Size sm**: 24x24px circle, level letter only
- **Size md**: 32x32px circle with optional label below
- **Size lg**: 48x48px circle with label, used in detail views

Colors (Luxterra muted palette):
- A: `bg-emerald-100 text-emerald-800 border-emerald-200`
- B: `bg-blue-100 text-blue-800 border-blue-200`
- C: `bg-amber-100 text-amber-800 border-amber-200`
- D: `bg-red-100 text-red-800 border-red-200`

**Verification**: Badge renders correctly for all levels and sizes

### Task 2: Create ScoreCard Component
**File**: `src/components/score/ScoreCard.tsx`

Main score display card:

```typescript
interface ScoreCardProps {
  score: RiskScore;
  candidateName?: string;
  variant?: 'compact' | 'full';
}
```

Layout (compact):
```
┌─────────────────────────────────┐
│  [A]  Score: 92/100             │
│       Excelente                  │
└─────────────────────────────────┘
```

Layout (full):
```
┌─────────────────────────────────┐
│       [A]                        │
│   Score: 92/100                  │
│    Excelente                     │
│                                  │
│  ✓ Ingresos estables            │
│  ✓ 3+ años estabilidad laboral   │
│  ✓ Historial de pagos positivo   │
└─────────────────────────────────┘
```

Design specs:
- Card with subtle border, rounded-sm (Luxterra)
- Badge centered or left-aligned depending on variant
- Quick drivers as checkmarks
- Subtle background matching level color

**Verification**: Card renders both variants, shows key drivers

### Task 3: Create CategoryBreakdown Component
**File**: `src/components/score/CategoryBreakdown.tsx`

Collapsible breakdown by scoring category:

```typescript
interface CategoryBreakdownProps {
  categories: ScoreCategory[];
  defaultExpanded?: boolean;
}
```

Categories:
1. **Capacidad de Pago** (Income) - salary vs rent ratio
2. **Estabilidad Laboral** (Stability) - job tenure, contract type
3. **Historial de Arrendamientos** (History) - past landlord references
4. **Perfil Crediticio** (Credit) - obligations, debts

Layout:
```
┌─────────────────────────────────┐
│ ▼ Capacidad de Pago      85/100 │
│   ─────────────────[████████░░] │
│   • Ratio arriendo/ingreso: 22% │
│   • Ingresos verificables       │
├─────────────────────────────────┤
│ ▶ Estabilidad Laboral    78/100 │
├─────────────────────────────────┤
│ ▶ Historial              90/100 │
└─────────────────────────────────┘
```

Use shadcn Accordion for expand/collapse.

**Verification**: Accordion works, progress bars show scores

### Task 4: Create ScoreProgressBar Component
**File**: `src/components/score/ScoreProgressBar.tsx`

Visual progress bar for category scores:

```typescript
interface ScoreProgressBarProps {
  score: number; // 0-100
  level: RiskLevel;
  size?: 'sm' | 'md';
  showValue?: boolean;
}
```

Design:
- Thin bar (4px height for sm, 8px for md)
- Color matches risk level
- Animated fill on mount
- Optional numeric value at end

**Verification**: Progress bar animates, colors correct

### Task 5: Create Barrel Export and Storybook-like Demo
**File**: `src/components/score/index.ts`

Export all components:
```typescript
export { LevelBadge } from './LevelBadge';
export { ScoreCard } from './ScoreCard';
export { CategoryBreakdown } from './CategoryBreakdown';
export { ScoreProgressBar } from './ScoreProgressBar';
```

Create a simple demo section in the component (or create test page) to visually verify all components work together.

**Verification**: All components importable, visual demo works

## Dependencies

- PLAN-01: Risk Score types and mock data
- shadcn Accordion component (may need to add)
- Tailwind CSS

## Notes

- Badge is secondary to narrative - don't make it too prominent
- Colors should be muted/professional, not aggressive
- Mobile-first: these will be viewed on phones frequently
- Consider animation for score reveal (will be used with AI explanation)
