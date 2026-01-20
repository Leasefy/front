---
phase: "07-ux-polish"
plan: "01"
title: "Design System Polish"
wave: 1
autonomous: true
must_haves:
  truths:
    - "Border radius standardized across components"
    - "Typography scale refined with consistent sizing"
    - "Spacing rhythm follows 4px/8px grid"
    - "Color palette consistent with slate theme"
  artifacts:
    - path: "src/app/globals.css"
      description: "Updated CSS variables and base styles"
      min_lines: 100
  key_links:
    - from: "globals.css"
      to: "All components"
      via: "CSS custom properties"
---

# Plan 01: Design System Polish

## Objective

Refine the design system for a more cohesive, premium feel with Luxterra-inspired minimalism.

## Context

The current design uses shadcn/ui defaults. This plan refines:
- Border radius (more subtle, 2-4px instead of 6-8px)
- Typography scale (cleaner hierarchy)
- Spacing rhythm (consistent 4px/8px grid)
- Color refinements (richer slate tones)

### Current State
- shadcn/ui components with default styling
- Slate color palette established
- Basic responsive design in place

## Tasks

### Task 1: Audit Current Design Tokens
**File**: Read and analyze `src/app/globals.css`

Identify current:
- `--radius` value
- Color CSS variables
- Font sizes and weights
- Spacing patterns

**Verification**: Document current state before changes.

### Task 2: Refine Border Radius
**File**: `src/app/globals.css`

Update radius scale:
```css
:root {
  --radius: 0.375rem; /* 6px → refined to 4px feel */
}
```

Consider creating radius variants:
- `--radius-sm`: 2px (subtle)
- `--radius-md`: 4px (default)
- `--radius-lg`: 8px (cards, modals)

**Verification**: Components have subtle, refined corners.

### Task 3: Refine Typography Scale
**File**: `src/app/globals.css`

Add refined typography classes:
```css
/* Refined typography scale */
.text-display { /* Hero headings */ }
.text-title { /* Section titles */ }
.text-subtitle { /* Subsections */ }
.text-body { /* Default text */ }
.text-caption { /* Small text */ }
```

**Verification**: Typography hierarchy is clear and consistent.

### Task 4: Establish Spacing Rhythm
**File**: `src/app/globals.css`

Document spacing tokens following 4px grid:
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-6`: 24px
- `space-8`: 32px

Add utility classes if needed.

**Verification**: Components use consistent spacing grid.

### Task 5: Color Refinements
**File**: `src/app/globals.css`

Refine slate palette for richer depth:
- Ensure sufficient contrast ratios (WCAG AA)
- Add subtle background variations
- Verify risk badge colors still pop

**Verification**: Colors feel premium while maintaining accessibility.

## Verification Checklist

- [ ] `--radius` updated to more subtle value
- [ ] Typography scale documented and applied
- [ ] Spacing follows 4px/8px grid
- [ ] Color contrast meets WCAG AA
- [ ] No visual regressions in existing components

## Output

After completion:
1. Design system refined for premium feel
2. Ready for component-level polish in subsequent plans
3. Foundation set for responsive testing
