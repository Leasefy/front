# PLAN-01: Formalize & Complete Design Token System

**Phase**: 12 - Design Tokens
**Requirements**: DTKN-01, DTKN-02, DTKN-03, DTKN-04, DTKN-05, DTKN-06
**Goal**: Complete the CSS custom property token system in globals.css with all missing tokens

## Current State Analysis

globals.css already has substantial token infrastructure:
- ✅ Colors: HSL variables for background, foreground, primary, secondary, muted, accent, destructive, border, ring, risk-a/b/c/d, success, warning, info, brand
- ✅ PLan CRM variables: page-bg, card-bg, accent (#D4F934), border, text-primary/secondary/muted, status colors (green/yellow/red/purple/blue with bg variants)
- ✅ Border Radius: --radius-sm through --radius-full
- ✅ Spacing Grid: --space-0 through --space-16 (4px base)
- ✅ Typography: --font-sans defined, utility classes exist (.text-display, .text-h1-h4, .text-body-*, .text-caption, .text-overline)
- ⚠️ Shadows: Only utility classes (.shadow-subtle, .shadow-elevated, .shadow-premium, .shadow-premium-lg), NO CSS custom properties
- ⚠️ Transitions/Animations: Only in design-tokens.ts as Tailwind class strings, NO CSS custom properties
- ⚠️ Typography: Font sizes/weights/line-heights not as CSS variables (only as utility classes)

## Tasks

### Task 1: Shadow Scale as CSS Custom Properties (DTKN-05)

Add to `:root` in globals.css:

```css
/* Shadow Scale */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
--shadow-md: 0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03);
--shadow-lg: 0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04);
--shadow-xl: 0 20px 40px -8px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.06);
```

Update existing utility classes to reference these variables.

### Task 2: Transition & Animation Tokens (DTKN-06)

Add to `:root` in globals.css:

```css
/* Transition Durations */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;

/* Easing Functions */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Task 3: Typography Scale as CSS Custom Properties (DTKN-02)

Add to `:root` in globals.css:

```css
/* Font Sizes */
--text-xs: 0.75rem;       /* 12px */
--text-sm: 0.875rem;      /* 14px */
--text-base: 1rem;        /* 16px */
--text-lg: 1.125rem;      /* 18px */
--text-xl: 1.25rem;       /* 20px */
--text-2xl: 1.5rem;       /* 24px */
--text-3xl: 1.875rem;     /* 30px */
--text-4xl: 2.25rem;      /* 36px */
--text-5xl: 3rem;         /* 48px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Letter Spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
```

Update existing typography utility classes to reference these variables.

### Task 4: Layout Tokens (supplementary)

Add frequently repeated layout values as tokens:

```css
/* Layout */
--navbar-height-mobile: 65px;
--navbar-height-desktop: 81px;
--sidebar-width: 280px;
--container-max: 1280px;
```

### Task 5: Consolidate PLan CRM variables

The PLan CRM hex variables (--plan-*) should reference the HSL system or be documented as an intentional separate namespace for the panel design system.

## Acceptance Criteria

- [ ] All shadow values available as CSS custom properties
- [ ] All transition durations and easings available as CSS custom properties
- [ ] Typography scale (sizes, weights, line-heights) as CSS custom properties
- [ ] Layout constants tokenized
- [ ] Existing utility classes updated to reference new CSS variables
- [ ] No visual regressions (existing pages look identical)

## Dependencies

- None (first plan in Phase 12)

## Estimated Scope

- 1 file primarily changed: `src/app/globals.css`
- design-tokens.ts updated to reference CSS variables where possible
