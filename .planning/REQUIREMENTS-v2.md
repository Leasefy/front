# Requirements: Arriendo Fácil — v2.0 Design System & QA Audit

**Defined:** 2026-02-02
**Core Value:** Propietarios toman decisiones informadas sobre inquilinos en minutos, no días, con explicabilidad total del scoring AI.

## v2.0 Requirements

Requirements for milestone v2.0. Each maps to roadmap phases.

### Design Tokens (DTKN)

- [ ] **DTKN-01**: Color palette defined as CSS custom properties with semantic naming (primary, secondary, destructive, muted, accent)
- [ ] **DTKN-02**: Typography scale defined as CSS custom properties (font families, sizes, weights, line heights)
- [ ] **DTKN-03**: Spacing scale defined as CSS custom properties (4px base grid)
- [ ] **DTKN-04**: Border radius scale defined as CSS custom properties
- [ ] **DTKN-05**: Shadow scale defined as CSS custom properties (sm, md, lg, xl)
- [ ] **DTKN-06**: Transition/animation tokens defined (durations, easings)
- [ ] **DTKN-07**: All existing hardcoded values migrated to design tokens

### Component Redesign (COMP)

- [ ] **COMP-01**: Button redesigned with consistent variants (primary, secondary, outline, ghost, destructive), sizes (sm, md, lg), and states (default, hover, active, disabled, loading)
- [ ] **COMP-02**: Input/Select/Textarea redesigned with consistent focus, error, disabled states using design tokens
- [ ] **COMP-03**: Card variants unified (property, candidate, application, lease) with shared base styling
- [ ] **COMP-04**: Badge system redesigned (risk A/B/C/D, status, verification) with consistent sizing and colors from tokens
- [ ] **COMP-05**: Dialog/Sheet overlays unified with consistent backdrop, padding, animations
- [ ] **COMP-06**: Skeleton components use design tokens for consistent placeholder styling
- [ ] **COMP-07**: All redesigned components applied across existing pages

### QA Audit - Functionality (QAFN)

- [ ] **QAFN-01**: Every CTA button leads to a valid destination or action
- [ ] **QAFN-02**: Every navigation link resolves to an existing route
- [ ] **QAFN-03**: Every form has clear submit action and feedback
- [ ] **QAFN-04**: Every list/grid has an empty state when no data
- [ ] **QAFN-05**: Every drawer/modal can be closed and doesn't trap the user
- [ ] **QAFN-06**: Every flow has a clear exit path (back, cancel, or redirect)
- [ ] **QAFN-07**: Wizard flows can be resumed after page refresh

### QA Audit - Visual Consistency (QAVS)

- [ ] **QAVS-01**: All spacing uses design tokens (no arbitrary px values)
- [ ] **QAVS-02**: All colors reference design tokens (no hardcoded hex/rgb)
- [ ] **QAVS-03**: All typography uses the defined scale (no arbitrary font sizes)
- [ ] **QAVS-04**: Component variants used consistently across pages (same action = same button variant)
- [ ] **QAVS-05**: Layout patterns consistent (page margins, section spacing, card gaps)

### QA Audit - Responsividad (QARS)

- [ ] **QARS-01**: Every page renders correctly on mobile (375px)
- [ ] **QARS-02**: Every page renders correctly on tablet (768px)
- [ ] **QARS-03**: Every page renders correctly on desktop (1280px+)
- [ ] **QARS-04**: No horizontal overflow on any viewport
- [ ] **QARS-05**: Touch targets meet 44px minimum on mobile

### QA Audit - Accesibilidad (QAAC)

- [ ] **QAAC-01**: All interactive elements have visible focus indicators
- [ ] **QAAC-02**: All images have alt text
- [ ] **QAAC-03**: Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] **QAAC-04**: All forms have associated labels
- [ ] **QAAC-05**: Page can be navigated with keyboard only
- [ ] **QAAC-06**: Screen reader announces page changes and dynamic content

## v2.1 Requirements

Deferred to next milestone.

### Documentation

- **DOCS-01**: Style guide page with live component examples
- **DOCS-02**: Design token documentation with usage guidelines

### Advanced QA

- **AQA-01**: Automated visual regression testing
- **AQA-02**: Lighthouse performance audit per page
- **AQA-03**: Automated a11y testing with axe-core

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Dark mode theme | Focus on getting one theme right first |
| Style guide docs page | Tokens documented in code, no separate docs site |
| New features/pages | v2.0 is refinement only, no new functionality |
| Backend integration | Still frontend-only for this milestone |
| Component library package | Components stay in-project, no separate package |
| Automated testing setup | Manual QA audit for now, automation in v2.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DTKN-01 | Phase 12 | Complete |
| DTKN-02 | Phase 12 | Complete |
| DTKN-03 | Phase 12 | Complete |
| DTKN-04 | Phase 12 | Complete |
| DTKN-05 | Phase 12 | Complete |
| DTKN-06 | Phase 12 | Complete |
| DTKN-07 | Phase 12 | Complete |
| COMP-01 | Phase 13 | Complete |
| COMP-02 | Phase 13 | Complete |
| COMP-03 | Phase 13 | Complete |
| COMP-04 | Phase 13 | Complete |
| COMP-05 | Phase 13 | Complete |
| COMP-06 | Phase 13 | Complete |
| COMP-07 | Phase 13 | Complete |
| QAFN-01 | Phase 14 | Complete |
| QAFN-02 | Phase 14 | Complete |
| QAFN-03 | Phase 14 | Complete |
| QAFN-04 | Phase 14 | Complete |
| QAFN-05 | Phase 14 | Complete |
| QAFN-06 | Phase 14 | Complete |
| QAFN-07 | Phase 14 | Complete |
| QAVS-01 | Phase 14 | Complete |
| QAVS-02 | Phase 14 | Complete |
| QAVS-03 | Phase 14 | Complete |
| QAVS-04 | Phase 14 | Complete |
| QAVS-05 | Phase 14 | Complete |
| QARS-01 | Phase 15 | Complete |
| QARS-02 | Phase 15 | Complete |
| QARS-03 | Phase 15 | Complete |
| QARS-04 | Phase 15 | Complete |
| QARS-05 | Phase 15 | Complete |
| QAAC-01 | Phase 15 | Complete |
| QAAC-02 | Phase 15 | Complete |
| QAAC-03 | Phase 15 | Complete |
| QAAC-04 | Phase 15 | Complete |
| QAAC-05 | Phase 15 | Complete |
| QAAC-06 | Phase 15 | Complete |

**Coverage:**
- v2.0 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 — Phase 15 complete — Milestone v2.0 DONE*
