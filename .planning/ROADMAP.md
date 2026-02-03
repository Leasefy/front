# Roadmap: Arriendo Fácil

## Overview

Frontend experience para marketplace de arriendos en Colombia con Risk Score AI. El backend será desarrollado por otra persona basándose en esta experiencia. Enfoque: UX premium con mock data realista.

## Milestones

- ✅ **v1.0 Frontend MVP** - Phases 1-9 (complete)
- ✅ **v1.1 Post-Approval Flow** - Phases 10-11 (complete)
- ✅ **v2.0 Design System & QA Audit** - Phases 12-15 (complete)
- ✅ **v2.1 Contract UX & Platform QA** - Phase 16 (complete)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation & Design System** - Project setup, UI components, mock data structure
- [x] **Phase 2: Property Catalog** - Listings, filters, wishlist, property detail
- [x] **Phase 3: Application Wizard** - Multi-step form, document upload UI, review
- [x] **Phase 4: Risk Score Display** - AI explanation UI, conversational scoring, level badges
- [x] **Phase 5: Landlord Dashboard** - Candidates view, score details, decision UI
- [x] **Phase 6: Tenant Tracking** - My applications, timeline, status display
- [x] **Phase 7: UX Polish** - Skeletons, empty states, animations, responsive
- [x] **Phase 8: Authentication UI** - Login, register, social auth, split-layout design
- [x] **Phase 9: Interactive Map** - Airbnb-style map with clustering, price markers, filter sync
- [x] **Phase 10: Post-Approval Flow** - Contracts, payments, pricing, coupons, post-rental views
- [x] **Phase 16: Contract UX & Platform QA** - Contract signing redesign, Colombian law compliance, PDF generation, full platform QA (48 fixes), navigation audit (18 fixes), document preview

## Phase Details

### Phase 1: Foundation & Design System
**Goal**: Project configured with design system and mock data ready
**Depends on**: Nothing (first phase)
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts development server without errors
  2. `npm run build` completes successfully
  3. Design system components ready (Button, Card, Input, Badge, etc.)
  4. Mock data files with realistic Colombian properties, candidates, scores
  5. TypeScript types defined for all data structures
  6. Basic layout with navigation shell
**Research**: Unlikely (established patterns)
**Plans**: TBD

### Phase 2: Property Catalog
**Goal**: Users can discover and explore available properties
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):
  1. Property listing page with grid of cards
  2. Filter sidebar: city, price range, bedrooms, amenities
  3. Property cards show: photo, price, location, key features
  4. Wishlist functionality (localStorage)
  5. Property detail page with image carousel
  6. Sticky "Postularme" CTA on detail page
  7. Responsive design (mobile-first)
**Research**: Unlikely (standard UI patterns)
**Plans**: TBD

### Phase 3: Application Wizard
**Goal**: Complete application flow experience
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):
  1. Multi-step wizard (6 steps): Personal → Employment → Income → References → Documents → Review
  2. Progress indicator showing current step
  3. Form validation with clear error messages
  4. Document upload UI with preview (mock - no real upload)
  5. Review step showing all entered information
  6. Submit confirmation with success state
  7. Form state persists in localStorage (resume capability)
**Research**: Likely (React Hook Form wizard patterns)
**Research topics**: Multi-step form UX, Zustand/localStorage persistence
**Plans**: TBD

### Phase 4: Risk Score Display
**Goal**: Premium AI scoring visualization - THE core differentiator
**Depends on**: Phase 3
**Success Criteria** (what must be TRUE):
  1. Score card with A/B/C/D level badge (prominent but not dominant)
  2. **Conversational AI explanation** - "Basado en lo que veo, este candidato..."
  3. Asesor de confianza tone - professional but warm
  4. Key drivers displayed as supporting points
  5. Risk flags shown as subtle warnings (not alarmist)
  6. Suggested conditions based on profile
  7. Score breakdown by category (collapsible detail)
**Research**: Likely (conversational UI patterns, AI explanation UX)
**Research topics**: Explainable AI UX patterns, conversational interfaces
**Plans**: TBD

### Phase 5: Landlord Dashboard
**Goal**: Landlords can evaluate and decide on candidates
**Depends on**: Phase 4
**Success Criteria** (what must be TRUE):
  1. Dashboard showing properties with application counts
  2. Candidates list per property (ranked by score)
  3. Candidate card: photo, name, score badge, key metrics
  4. Candidate detail modal/page with full AI explanation
  5. Decision buttons: Pre-aprobar, Aprobar, Rechazar
  6. Notes functionality (UI only, localStorage)
  7. Request more info action (UI state only)
**Research**: Unlikely (builds on Phase 4 patterns)
**Plans**: TBD

### Phase 6: Tenant Tracking
**Goal**: Tenants can track their application status
**Depends on**: Phase 3, Phase 5
**Success Criteria** (what must be TRUE):
  1. "Mis Postulaciones" page listing all applications
  2. Application card: property thumbnail, status badge, date
  3. Timeline view of application events
  4. Status states: Enviada, En revisión, Pre-aprobada, Aprobada, Rechazada
  5. Detail view with current status explanation
  6. Withdraw application action (UI state change)
**Research**: Unlikely (standard tracking patterns)
**Plans**: TBD

### Phase 7: UX Polish
**Goal**: Premium, polished experience across all flows
**Depends on**: Phase 2, Phase 5, Phase 6
**Success Criteria** (what must be TRUE):
  1. Skeleton loaders for all list/detail views
  2. Empty states with helpful messaging and CTAs
  3. Smooth page transitions and micro-interactions
  4. Loading states for all async-looking operations
  5. Error states with recovery options
  6. Responsive breakpoints tested (mobile, tablet, desktop)
  7. Accessibility audit passed (keyboard nav, screen reader)
**Research**: Unlikely (UI polish patterns)
**Plans**: TBD

### Phase 8: Authentication UI
**Goal**: Beautiful, minimal auth experience with split-layout design
**Depends on**: Phase 1, Phase 7 (design system)
**Success Criteria** (what must be TRUE):
  1. Split-layout design: property image with testimonial overlay (left), form (right)
  2. Login/Register toggle tabs switching between modes
  3. Social login buttons: Google, Apple (UI only, mock auth)
  4. Email/password form with validation
  5. Clean, minimal design following Luxterra aesthetic (NO glass effects)
  6. Responsive: stacked layout on mobile, split on desktop
  7. Auth state management (localStorage mock, ready for real auth)
  8. Protected route patterns for dashboard/panel pages
**Research**: Unlikely (standard auth UI patterns)
**Plans**: TBD

### Phase 9: Interactive Map
**Goal**: Airbnb-style interactive map for property discovery
**Depends on**: Phase 2 (Property Catalog)
**Success Criteria** (what must be TRUE):
  1. Split layout: property list (left) + interactive map (right) on desktop
  2. Map shows property markers with rent price labels (e.g., "$2.5M")
  3. Marker clustering: zoom out shows cluster counts, zoom in shows individual markers
  4. Click marker to filter/highlight that property in the list
  5. Map bounds sync: moving map filters visible properties
  6. Responsive: map toggle button on mobile (show/hide map)
  7. Smooth animations and interactions (Airbnb-quality UX)
  8. Works with existing filter system
**Research**: Likely (map library selection: Mapbox vs Google Maps vs Leaflet)
**Research topics**: react-map-gl, supercluster for clustering, Mapbox pricing
**Plans**: TBD

### Phase 10: Post-Approval Flow
**Goal**: Complete the rental journey from candidate approval to active lease
**Depends on**: Phase 5 (Landlord Dashboard)
**Success Criteria** (what must be TRUE):
  1. Contract generation UI with template selection
  2. Deel-style sequential signature flow (landlord first, then tenant)
  3. Insurance policy options presented during signing
  4. Pricing page with Free/Pro/Business tiers
  5. Subscription selection and checkout UI (mock)
  6. Coupon system with percentage, fixed amount, and free trial support
  7. Post-contract landlord dashboard (active lease view, payment tracking)
  8. Post-contract tenant dashboard (my lease, payment history, documents)
  9. Payment method selection UI (PSE, cards, Nequi)
**Research**: Completed (see POST_APPROVAL_STRATEGY.md)
**Research topics**: Deel contract UX, Colombian e-signature law, rental pricing models
**Plans**:
  - PLAN-01: Contract Generation & Signing UI
  - PLAN-02: Pricing Page & Subscription Plans
  - PLAN-03: Coupon System
  - PLAN-04: Post-Contract Dashboards

### 🚧 v2.0 Design System & QA Audit

**Milestone Goal:** Establecer sistema de diseño formal con tokens y componentes rediseñados, y auditoría QA exhaustiva del frontend.

- [x] **Phase 12: Design Tokens** - Formal CSS custom properties for colors, typography, spacing, radii, shadows, animations
- [x] **Phase 13: Component Redesign** - Base components redesigned using design tokens
- [x] **Phase 14: QA Audit - Functionality & Visual** - Page-by-page audit of CTAs, flows, states, visual consistency
- [x] **Phase 15: QA Responsive & Accessibility** - Responsividad and accesibilidad verification and fixes

### Phase 12: Design Tokens
**Goal**: Formal design token system established as CSS custom properties
**Depends on**: Nothing (builds on existing globals.css)
**Requirements**: DTKN-01, DTKN-02, DTKN-03, DTKN-04, DTKN-05, DTKN-06, DTKN-07
**Success Criteria** (what must be TRUE):
  1. All colors defined as CSS custom properties with semantic naming
  2. Typography, spacing, radius, shadow scales defined as variables
  3. Animation/transition tokens defined
  4. No hardcoded color/spacing/size values remain in codebase
**Research**: Unlikely (CSS custom properties, established patterns)
**Plans**: TBD

### Phase 13: Component Redesign
**Goal**: Base UI components redesigned using design tokens exclusively
**Depends on**: Phase 12
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07
**Success Criteria** (what must be TRUE):
  1. Button variants (primary, secondary, outline, ghost, destructive) with sm/md/lg sizes consistent
  2. Input/Select/Textarea have unified focus, error, disabled states
  3. Card variants (property, candidate, application, lease) share base styling
  4. Badge system (risk, status, verification) uses tokens for colors and sizing
  5. Dialog/Sheet overlays have consistent backdrop, padding, animations
  6. All components applied across existing pages without visual regressions
**Research**: Unlikely (internal component patterns)
**Plans**: TBD

### Phase 14: QA Audit - Functionality & Visual
**Goal**: Every page audited for broken CTAs, dead flows, missing states, visual inconsistencies
**Depends on**: Phase 13
**Requirements**: QAFN-01, QAFN-02, QAFN-03, QAFN-04, QAFN-05, QAFN-06, QAFN-07, QAVS-01, QAVS-02, QAVS-03, QAVS-04, QAVS-05
**Success Criteria** (what must be TRUE):
  1. Every CTA button leads to a valid destination or performs an action
  2. Every navigation link resolves to an existing route
  3. Every list/grid has a proper empty state
  4. Every flow has clear entry and exit paths
  5. All spacing, colors, typography use design tokens
  6. Component variants used consistently (same action = same button variant)
**Research**: Unlikely (manual audit)
**Plans**: TBD

### Phase 15: QA Responsive & Accessibility
**Goal**: Every page verified for responsive behavior and accessibility compliance
**Depends on**: Phase 14
**Requirements**: QARS-01, QARS-02, QARS-03, QARS-04, QARS-05, QAAC-01, QAAC-02, QAAC-03, QAAC-04, QAAC-05, QAAC-06
**Success Criteria** (what must be TRUE):
  1. All pages render correctly on mobile (375px), tablet (768px), desktop (1280px+)
  2. No horizontal overflow on any viewport
  3. Touch targets meet 44px minimum on mobile
  4. All interactive elements have visible focus indicators
  5. Color contrast meets WCAG AA (4.5:1 text, 3:1 large)
  6. All forms have associated labels
  7. Pages navigable with keyboard only
**Research**: Unlikely (standard responsive/a11y patterns)
**Plans**: TBD

### Phase 16: Contract UX & Platform QA
**Goal**: Redesign contract signing flow, ensure Colombian legal compliance, comprehensive QA audit of entire platform
**Depends on**: Phase 15
**Success Criteria** (what must be TRUE):
  1. Contract signing page uses 2-column layout with clear visual hierarchy
  2. Contract templates reference specific Colombian law articles (Ley 820/2003)
  3. PDF download generates real contract document with all parties and clauses
  4. All navigation links resolve to existing routes (zero dead links)
  5. All sidebar nav items point to built pages (no disabled items for existing pages)
  6. Dark mode compatible (no hardcoded bg-white/text-black)
  7. Design tokens used consistently across all components
  8. Legal pages exist (/privacidad, /terminos, /ayuda)
  9. Mobile back navigation on all tenant subpages
**Research**: Completed (Colombian rental law Ley 820/2003, Ley 675/2001, Ley 527/1999)
**Plans**: Executed inline (no formal plan files)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Design System | 4/4 | Complete | 2026-01-18 |
| 2. Property Catalog | 2/2 | Complete | 2026-01-18 |
| 3. Application Wizard | 5/5 | Complete | 2026-01-19 |
| 4. Risk Score Display | 4/4 | Complete | 2026-01-19 |
| 5. Landlord Dashboard | 3/3 | Complete | 2026-01-19 |
| 6. Tenant Tracking | 2/2 | Complete | 2026-01-19 |
| 7. UX Polish | 6/6 | Complete | 2026-01-20 |
| 8. Authentication UI | 2/2 | Complete | 2026-01-19 |
| 9. Interactive Map | 2/2 | Complete | 2026-01-20 |
| 10. Post-Approval Flow | 5/5 | Complete | 2026-01-20 |
| 11. UI/UX Improvements | — | Complete | 2026-01-29 |
| 12. Design Tokens | 2/2 | Complete | 2026-02-02 |
| 13. Component Redesign | 3/3 | Complete | 2026-02-02 |
| 14. QA Functionality & Visual | 4/4 | Complete | 2026-02-02 |
| 15. QA Responsive & A11y | 3/3 | Complete | 2026-02-02 |
| 16. Contract UX & Platform QA | — | Complete | 2026-02-02 |

## Notes

### What's NOT in scope (backend responsibility)
- Database setup and migrations
- API endpoints
- Authentication backend (Clerk webhooks, user sync)
- Scoring algorithm implementation
- File upload to cloud storage
- Email notifications
- State machine enforcement

### Mock Data Strategy
All screens work with realistic mock data:
- 15+ properties across Colombian cities
- 10+ candidate profiles with varied risk levels
- Pre-calculated scores with explanations
- Sample application data in different states

### Integration Points (for backend developer)
When backend is ready, these need API connections:
- Property listing and filtering
- Application submission
- Score retrieval
- Status updates
- User authentication state

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-02-02 (v2.1 Contract UX & Platform QA complete)*
*Vision: FRONTEND-VISION.md*

