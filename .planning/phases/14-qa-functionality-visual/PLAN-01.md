# PLAN-01: Fix Broken CTAs, Navigation Links & Flow Exits

**Phase**: 14 - QA Audit - Functionality & Visual
**Requirements**: QAFN-01, QAFN-02, QAFN-05, QAFN-06
**Depends on**: None
**Goal**: Every CTA leads to a valid destination, every nav link resolves, overlays can be closed, and flows have clear exit paths

## Discovery Findings

1. **`/pricing` page**: "Contactar ventas" links to `/contacto` which does not exist
2. **Property detail "Aplicar" buttons**: Do not navigate to `/aplicar/[propertyId]`
3. **`/panel/propiedades`**: "Nueva Propiedad" button is non-functional
4. **`/panel` navbar**: Links to `/panel/leases` but route may be `/panel/contratos`
5. **Drawers/Modals**: Need verification that all can be closed (QAFN-05)
6. **Wizard flows**: Need clear back/cancel/exit paths (QAFN-06)

## Tasks

### Task 1: Audit All CTA Buttons (QAFN-01)

Systematically check every `<Button>` and `<Link>` that acts as a CTA across all pages:
- Fix `/contacto` link → either create a minimal contact page or redirect to a valid destination
- Fix "Aplicar" buttons on property detail to navigate to `/aplicar/[propertyId]`
- Fix "Nueva Propiedad" button to either open a form or navigate to a creation page
- Verify all other CTAs lead to valid destinations

### Task 2: Audit All Navigation Links (QAFN-02)

Check every `<Link>` in navigation components (Navbar, Sidebar, Footer):
- Fix `/panel/leases` → `/panel/contratos` if route mismatch exists
- Verify all sidebar links in tenant (`/inquilino/*`) and landlord (`/panel/*`) sections
- Verify footer links resolve to existing routes
- Verify mobile navigation links match desktop

### Task 3: Verify Overlay Dismissal (QAFN-05)

Check every Dialog, Sheet, and Drawer:
- Each must have a visible close button (X) or Cancel action
- Backdrop click should dismiss (unless confirmation dialog)
- Escape key should dismiss
- No focus traps that prevent dismissal

### Task 4: Verify Flow Exit Paths (QAFN-06)

Check multi-step flows:
- Application wizard: back button on each step, cancel/exit option
- Contract signing flow: back/cancel at each stage
- Checkout/subscription flow: back/cancel available
- Every flow should allow returning to previous page

## Acceptance Criteria

- [ ] Zero broken CTA destinations across all pages
- [ ] Zero broken navigation links
- [ ] All overlays can be closed via button, backdrop, or Escape
- [ ] All multi-step flows have back/cancel/exit options

## Scope

- ~15-20 page files for CTA/nav audit
- ~5-8 component files for overlay verification
- ~3-4 wizard/flow files for exit path verification
