# PLAN-02: Migrate Hardcoded Values to Design Tokens

**Phase**: 12 - Design Tokens
**Requirements**: DTKN-07
**Depends on**: PLAN-01
**Goal**: Replace all hardcoded color, spacing, and sizing values across the codebase with design tokens

## Current State Analysis

From codebase scan:
- **1,451 hardcoded hex colors** across 62 files (bg-[#FBFBFB], text-[#111827], etc.)
- **514 arbitrary pixel values** across 112 files (pt-[65px], text-[10px], rounded-[2px], etc.)
- **29 rgba values** across 8 files

### Priority Categories

**P0 - High frequency, easy wins:**
1. PLan CRM hex colors → already have CSS vars, just need components to use them via Tailwind
2. Background grays (#FBFBFB, #fafafa, #F7F8FA) → unify to `bg-background`
3. Text colors (#111827, #6B7280, #9CA3AF) → map to `text-foreground`, `text-muted-foreground`
4. Border colors (#E5E7EB) → `border-border`
5. Navbar height (65px, 81px) → use layout tokens
6. Brand lime (#D4F934) → use `--plan-accent` token

**P1 - Moderate frequency:**
7. Shadow rgba values → use new shadow tokens
8. Small font sizes (text-[10px], text-[8px]) → map to typography tokens or Tailwind text-xs
9. Rounded-[2px] everywhere → use `rounded-sm` (map --radius-sm to 2px, already done)

**P2 - Low frequency, context-dependent:**
10. SVG fill colors in social buttons (Google/Apple brand colors) → keep as-is (brand guidelines)
11. Dynamic/computed pixel values → evaluate case by case
12. Map-related dimensions → keep as-is (functional, not design)

## Migration Strategy

### Step 1: Tailwind Config Integration

Extend tailwind.config to expose CSS variables as Tailwind utilities so migration is seamless:

```js
// Ensure all --plan-* variables are available as Tailwind classes
// e.g., bg-plan-page, text-plan-primary, border-plan-border
```

### Step 2: Batch Color Migration (62 files)

Replace hardcoded hex in Tailwind arbitrary values with semantic tokens:
- `bg-[#FBFBFB]` → `bg-background`
- `bg-[#F7F8FA]` → `bg-plan-page` or `bg-background`
- `bg-[#FFFFFF]` → `bg-card` or `bg-white`
- `bg-[#111112]` → `bg-primary`
- `text-[#111827]` → `text-plan-primary` or `text-foreground`
- `text-[#6B7280]` → `text-plan-secondary` or `text-muted-foreground`
- `text-[#9CA3AF]` → `text-plan-muted` or `text-muted-foreground`
- `border-[#E5E7EB]` → `border-plan-border` or `border-border`
- `bg-[#D4F934]` → `bg-plan-accent`

### Step 3: Batch Spacing/Sizing Migration (112 files)

- `pt-[65px]` / `top-[65px]` → `pt-[var(--navbar-height-mobile)]`
- `pt-[81px]` / `top-[81px]` → `pt-[var(--navbar-height-desktop)]`
- `text-[10px]` → `text-[0.625rem]` or `text-[var(--text-xs)]` (evaluate)
- `rounded-[2px]` → `rounded-sm` (already mapped in token system)

### Step 4: Verify No Regressions

Visual check key pages after migration to ensure colors/spacing match.

## Acceptance Criteria

- [ ] No hardcoded hex colors remain (except SVG brand colors and intentional one-offs)
- [ ] Navbar height values use layout tokens
- [ ] Background/text/border colors use semantic token classes
- [ ] rounded-[2px] replaced with rounded-sm throughout
- [ ] No visual regressions

## Scope

- ~62 files for color migration
- ~112 files for spacing/sizing migration (many overlap)
- tailwind.config.ts updated for PLan CRM variable exposure
