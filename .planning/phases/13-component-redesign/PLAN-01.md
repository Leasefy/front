# PLAN-01: Redesign Base Components with Design Tokens

**Phase**: 13 - Component Redesign
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-06
**Depends on**: Phase 12 (complete)
**Goal**: Redesign Button, Input/Select/Textarea, Card, Badge, and Skeleton to use design tokens exclusively with consistent styling

## Current Issues

### Border Radius Inconsistency
- Card: `rounded-2xl` (16px) — should use `rounded-lg` (8px, `--radius-lg`)
- Input/Select: `rounded-xl` (12px) — should use `rounded-md` (4px, `--radius-md`)
- Textarea: `rounded-sm` (2px) — inconsistent with Input/Select
- Badge: `rounded-full` — correct for pills, keep
- Dialog: `rounded-sm` — correct

### Hardcoded Colors
- Button: `bg-black`, `bg-red-600`, `border-black/10` — no tokens
- Input/Select: `border-slate-200`, `text-slate-400`, `bg-slate-50` — hardcoded slate
- Card: `border-slate-200/60`, hardcoded shadow rgba
- Badge: `bg-slate-100`, `text-slate-700`, `bg-red-100`, `bg-emerald-100`, etc.

### Missing Token Usage
- Button transitions: hardcoded `duration-200` instead of `var(--duration-normal)`
- Card shadow: inline rgba instead of `var(--shadow-md)`
- Skeleton: uses `bg-primary/10` (acceptable but could use muted)

## Tasks

### Task 1: Button Redesign (COMP-01)

Replace hardcoded colors with token-based classes. Ensure all 6 variants + 4 sizes + states use tokens.

**Changes to `src/components/ui/button.tsx`:**

Base classes:
- `transition-all duration-200 ease-out` → `transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]`
- `focus-visible:ring-black/20` → `focus-visible:ring-ring/20`
- `rounded-sm` added (use design system base radius)

Variants:
- `default`: `bg-black text-white hover:bg-black/90` → `bg-primary text-primary-foreground hover:bg-primary/90`
- `destructive`: `bg-red-600 text-white hover:bg-red-700` → `bg-destructive text-destructive-foreground hover:bg-destructive/90`
- `outline`: `border-black/10 bg-white text-black hover:bg-black/5 hover:border-black/20` → `border border-input bg-background text-foreground hover:bg-accent/10 hover:border-border`
- `secondary`: `bg-black/5 text-black hover:bg-black/10` → `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- `ghost`: `text-black/70 hover:bg-black/5 hover:text-black` → `text-muted-foreground hover:bg-secondary hover:text-foreground`
- `link`: `text-black` → `text-foreground`

### Task 2: Form Components Redesign (COMP-02)

Unify Input, Select trigger, and Textarea with consistent token-based styling.

**Shared form element pattern:**
- Border: `border-2 border-input` (uses `--input` token)
- Radius: `rounded-md` (uses `--radius-md` = 4px)
- Height: `h-11` (keep)
- Focus: `focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/5`
- Hover: `hover:border-border`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted`
- Placeholder: `placeholder:text-muted-foreground`
- Transition: `transition-all duration-[var(--duration-normal)]`

**Files:**
- `src/components/ui/input.tsx` — align to shared pattern
- `src/components/ui/select.tsx` — align SelectTrigger and SelectContent to shared pattern
- `src/components/ui/textarea.tsx` — align to shared pattern (keep min-h-[60px])

### Task 3: Card Redesign (COMP-03)

**Changes to `src/components/ui/card.tsx`:**
- `rounded-2xl` → `rounded-lg` (uses `--radius-lg` = 8px)
- `border-slate-200/60` → `border-border`
- `shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)]` → `shadow-[var(--shadow-md)]`
- `duration-300` → `duration-[var(--duration-slow)]`
- Keep `bg-white text-card-foreground` (bg-card would also work)

### Task 4: Badge Redesign (COMP-04)

**Changes to `src/components/ui/badge.tsx`:**

Replace all hardcoded Tailwind color classes with semantic tokens:
- `default`: `bg-black text-white` → `bg-primary text-primary-foreground`
- `secondary`: `bg-slate-100 text-slate-700 hover:bg-slate-200` → `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- `destructive`: `bg-red-100 text-red-700 hover:bg-red-200` → `bg-destructive/10 text-destructive hover:bg-destructive/20`
- `outline`: `border-slate-200 bg-white text-slate-700` → `border-border bg-background text-foreground`
- `success`: `bg-emerald-100 text-emerald-700` → `bg-success/10 text-success` (need hsl utility for success)
- `warning`: `bg-amber-100 text-amber-700` → `bg-warning/10 text-warning`
- Risk variants: use `--risk-a/b/c/d` tokens → `bg-[hsl(var(--risk-a))] text-white` etc.

Keep `rounded-full` for badges (pill shape is correct for badges).

### Task 5: Skeleton Redesign (COMP-06)

**Changes to `src/components/ui/skeleton.tsx`:**
- `bg-primary/10` → `bg-muted` (more semantic)
- Keep `animate-pulse rounded-sm`

## Acceptance Criteria

- [ ] Button uses only token-based colors, no hardcoded hex/black/red
- [ ] Input, Select, Textarea share identical border/focus/hover/disabled patterns
- [ ] Card uses shadow token and radius token
- [ ] Badge variants use semantic color tokens
- [ ] Skeleton uses muted token
- [ ] All components use transition duration tokens
- [ ] `npm run build` passes with no errors

## Scope

- 6 files modified: button.tsx, input.tsx, select.tsx, textarea.tsx, card.tsx, badge.tsx, skeleton.tsx
- No new files created
- No page-level changes (that's PLAN-03)
