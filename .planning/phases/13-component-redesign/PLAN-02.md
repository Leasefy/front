# PLAN-02: Unify Dialog & Sheet Overlays

**Phase**: 13 - Component Redesign
**Requirements**: COMP-05
**Depends on**: PLAN-01
**Goal**: Unify Dialog and Sheet with consistent backdrop, padding, animations, and token usage

## Current State

- **Dialog**: Already decent token usage (bg-background, border, ring). Uses `bg-black/80` backdrop, `rounded-sm`, `duration-200`.
- **Sheet**: Good token usage (bg-background, shadow-lg). Uses `bg-black/80` backdrop, inconsistent padding (p-6 on top/bottom sides only), `duration-300`/`duration-500`.

### Issues
- Close button styling differs slightly between Dialog and Sheet
- Sheet right variant missing padding (`p-6` only on top/bottom)
- Animation durations should use tokens
- Backdrop opacity could use a token for consistency

## Tasks

### Task 1: Dialog Token Alignment

**Changes to `src/components/ui/dialog.tsx`:**
- `bg-black/80` → `bg-black/60` (lighter backdrop, more modern)
- `duration-200` → `duration-[var(--duration-normal)]`
- `rounded-sm` → `rounded-lg` (match Card radius for consistency with overlay panels)
- Close button: add consistent hover state with `hover:bg-muted`
- Keep all Radix animations (they work well)

### Task 2: Sheet Token Alignment

**Changes to `src/components/ui/sheet.tsx`:**
- `bg-black/80` → `bg-black/60` (match Dialog)
- `data-[state=closed]:duration-300 data-[state=open]:duration-500` → `data-[state=closed]:duration-[var(--duration-slow)] data-[state=open]:duration-[var(--duration-slower)]`
- Add `p-6` to right and left variants (currently missing)
- Close button: match Dialog's close button styling exactly

## Acceptance Criteria

- [ ] Dialog and Sheet use identical backdrop opacity
- [ ] Animation durations use design tokens
- [ ] Close buttons styled identically
- [ ] Sheet has consistent padding across all sides
- [ ] No visual regressions in existing dialogs/sheets
- [ ] `npm run build` passes

## Scope

- 2 files: dialog.tsx, sheet.tsx
