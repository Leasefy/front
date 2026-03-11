# PLAN-03: Apply Redesigned Components Across Pages

**Phase**: 13 - Component Redesign
**Requirements**: COMP-07
**Depends on**: PLAN-01, PLAN-02
**Goal**: Verify redesigned components render correctly across all existing pages with no visual regressions

## Strategy

Since PLAN-01 and PLAN-02 modify the base component files directly, all pages that import these components will automatically pick up the changes. This plan focuses on:

1. **Build verification** — ensure no TypeScript/build errors from component API changes
2. **Visual audit** — scan pages for any inline overrides that conflict with new token-based styling
3. **Fix conflicts** — update page-level code that hardcodes styles conflicting with redesigned components

## Tasks

### Task 1: Build Verification

Run `npm run build` and fix any compilation errors resulting from component changes.

### Task 2: Scan for Conflicting Overrides

Search for inline className overrides on redesigned components that may conflict:
- `<Button className="bg-...">` — hardcoded background overriding button variant
- `<Card className="rounded-...">` — radius override conflicting with new rounded-lg
- `<Input className="border-...">` — border override conflicting with new token-based border
- `<Badge className="bg-...">` — color override conflicting with variant

Fix by either:
- Removing the override (if the redesigned component handles it)
- Using the correct variant prop instead of className override
- Keeping intentional overrides that are context-specific

### Task 3: Verify Key Pages

Spot-check the following critical pages for visual consistency:
- Property listing page (Cards, Badges)
- Application wizard (Input, Select, Textarea, Button)
- Landlord dashboard (Cards, Badges, Buttons, Dialog)
- Tenant tracking (Cards, Badges)
- Auth pages (Input, Button)
- Pricing page (Cards, Buttons)
- Contract flow (Dialog, Sheet, Button)

## Acceptance Criteria

- [ ] `npm run build` passes with zero errors
- [ ] No conflicting className overrides remain that break the design system
- [ ] All pages render with consistent component styling
- [ ] Button variants used appropriately across pages (same action = same variant)

## Scope

- Potentially many page files, but changes are surgical (removing conflicting overrides)
- No new components or pages created
