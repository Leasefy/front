# PLAN-03: Migrate Hardcoded Colors to Design Tokens

**Phase**: 14 - QA Audit - Functionality & Visual
**Requirements**: QAVS-01, QAVS-02, QAVS-03
**Depends on**: None
**Goal**: All spacing, colors, and typography use design tokens — no arbitrary hardcoded values remain

## Discovery Findings

- 112 files still contain hardcoded `slate-*` or `gray-*` Tailwind color classes
- These should be migrated to semantic token classes: `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, etc.
- Pricing page uses `slate-*` colors inconsistently while the rest of the app uses `plan-*` CSS variables

## Migration Map

| Hardcoded Class | Token Replacement |
|----------------|-------------------|
| `text-slate-900`, `text-gray-900` | `text-foreground` |
| `text-slate-700`, `text-gray-700` | `text-foreground` or `text-muted-foreground` |
| `text-slate-600`, `text-gray-600` | `text-muted-foreground` |
| `text-slate-500`, `text-gray-500` | `text-muted-foreground` |
| `text-slate-400`, `text-gray-400` | `text-muted-foreground` |
| `bg-slate-50`, `bg-gray-50` | `bg-muted` or `bg-background` |
| `bg-slate-100`, `bg-gray-100` | `bg-muted` |
| `bg-slate-200`, `bg-gray-200` | `bg-muted` |
| `border-slate-200`, `border-gray-200` | `border-border` |
| `border-slate-300`, `border-gray-300` | `border-border` |
| `divide-slate-200`, `divide-gray-200` | `divide-border` |
| `ring-slate-*`, `ring-gray-*` | `ring-ring` |
| `placeholder-slate-*` | `placeholder:text-muted-foreground` |

## Tasks

### Task 1: Migrate UI Components (non-base)

Migrate hardcoded colors in `src/components/ui/` files not covered by Phase 13:
- `tabs.tsx` — `bg-slate-100`, `text-slate-500`
- `accordion.tsx` — `border-gray-200`, `text-gray-500`
- Other ui components with hardcoded colors

### Task 2: Migrate Layout & Shell Components

Migrate colors in layout/navigation files:
- `src/components/layout/` — navbar, sidebar, footer
- `src/app/layout.tsx` and related layouts

### Task 3: Migrate Feature Components

Migrate colors in feature-specific components:
- `src/components/` subdirectories (property, application, dashboard, etc.)
- `empty-state.tsx`, `error-state.tsx`, `loading-state.tsx`

### Task 4: Migrate Page Files

Migrate remaining hardcoded colors in `src/app/` page files:
- All route `page.tsx` files
- Pricing page (complete migration from `slate-*` to tokens)

### Task 5: Migrate Spacing & Typography Hardcodes (QAVS-01, QAVS-03)

Scan for remaining arbitrary values:
- Hardcoded `px` values that should use spacing tokens
- Arbitrary `text-[size]` that should use typography scale
- Note: Tailwind's built-in spacing (p-4, gap-6, etc.) is acceptable if aligned with 4px grid

## Acceptance Criteria

- [ ] Zero `slate-*` or `gray-*` color classes remain in source files
- [ ] All colors reference design tokens via semantic Tailwind classes
- [ ] Typography uses defined scale (no arbitrary font sizes)
- [ ] `npm run build` passes with zero errors

## Scope

- ~112 files need color migration
- Bulk find-and-replace with contextual judgment for each replacement
- This is the largest plan in the phase
