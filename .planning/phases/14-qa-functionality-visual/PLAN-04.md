# PLAN-04: Visual Consistency Audit

**Phase**: 14 - QA Audit - Functionality & Visual
**Requirements**: QAVS-04, QAVS-05
**Depends on**: PLAN-03 (colors must be migrated first)
**Goal**: Component variants used consistently across pages and layout patterns are uniform

## Tasks

### Task 1: Button Variant Consistency (QAVS-04)

Audit all Button usage across pages to ensure:
- Primary actions use `variant="default"` (primary)
- Secondary/alternative actions use `variant="secondary"` or `variant="outline"`
- Destructive actions (delete, cancel, reject) use `variant="destructive"`
- Navigation/minor actions use `variant="ghost"` or `variant="link"`
- Same semantic action uses same variant everywhere (e.g., "Submit" is always primary)

### Task 2: Badge Variant Consistency (QAVS-04)

Audit all Badge usage:
- Risk levels consistently use `variant="risk-a"` through `variant="risk-d"`
- Status badges use correct semantic variants (success, warning, destructive)
- Same status = same badge variant everywhere

### Task 3: Layout Pattern Consistency (QAVS-05)

Verify consistent layout patterns across pages:
- Page margins: consistent padding/max-width across all page layouts
- Section spacing: consistent gap between page sections
- Card gaps: consistent grid gaps in card layouts
- Heading hierarchy: consistent heading sizes per page level

### Task 4: Card Usage Consistency (QAVS-04)

Verify Card component usage:
- Property cards: same structure and styling across catalog, dashboard, wishlist
- Candidate cards: consistent across landlord views
- Application cards: consistent across tenant views
- No inline style overrides that break card uniformity

## Acceptance Criteria

- [ ] Same action type = same Button variant across all pages
- [ ] Same status = same Badge variant across all pages
- [ ] Page margins, section spacing, and card gaps are consistent
- [ ] No ad-hoc style overrides breaking component uniformity

## Scope

- Audit across all ~33 routes
- Fixes are surgical: changing variant props, not redesigning components
- Depends on PLAN-03 completing color migration first
