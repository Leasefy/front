# Roadmap: Arriendo Fácil

## Overview

Construir un marketplace de arriendos para Colombia con Risk Score AI que permite a propietarios evaluar candidatos de forma rápida, transparente y explicable. El journey va desde la infraestructura base hasta una experiencia premium completa: catálogo → postulación → scoring → decisión.

## Milestones

- 🚧 **v1.0 MVP** - Phases 1-10 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Project setup, tooling, database, Vercel deploy
- [ ] **Phase 2: Authentication** - Clerk magic link, user roles, session persistence
- [ ] **Phase 3: Property Catalog** - Listings, filters, wishlist, property detail
- [ ] **Phase 4: Property Management** - Landlord CRUD, photo upload
- [ ] **Phase 5: Application Wizard** - Multi-step form, document upload, autosave
- [ ] **Phase 6: Risk Score Engine** - Scoring pipeline, models, explainability
- [ ] **Phase 7: Tenant Experience** - My applications, tracking, withdrawal
- [ ] **Phase 8: Landlord Experience** - Candidates ranking, decisions, details
- [ ] **Phase 9: State Machine** - Application states, timeline, events
- [ ] **Phase 10: UX Polish** - Skeletons, empty states, micro-interactions

## Phase Details

### Phase 1: Foundation
**Goal**: Project scaffolded, configured, and deploying to Vercel
**Depends on**: Nothing (first phase)
**Requirements**: FUND-01, FUND-02, FUND-03, FUND-04, FUND-05
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts development server without errors
  2. `npm run build` completes successfully
  3. Vercel preview deployment works
  4. Prisma can connect to database and run migrations
  5. Seed script populates demo properties and users
**Research**: Unlikely (established patterns from STACK.md)
**Plans**: TBD

### Phase 2: Authentication
**Goal**: Users can register, login, and maintain sessions with role distinction
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can receive magic link email and log in
  2. Session persists after browser refresh
  3. User can log out from any page
  4. User type (tenant/landlord) is established at registration
  5. Protected routes redirect unauthenticated users
**Research**: Likely (Clerk integration patterns)
**Research topics**: Clerk Next.js 14 App Router setup, webhook sync to database, role management
**Plans**: TBD

### Phase 3: Property Catalog
**Goal**: Users can discover and explore available properties
**Depends on**: Phase 1, Phase 2
**Requirements**: CATL-01, CATL-02, CATL-03, CATL-04, CATL-05, CATL-06, CATL-07
**Success Criteria** (what must be TRUE):
  1. User can browse property cards with photos, price, and key details
  2. User can filter by city, neighborhood, price, bedrooms, amenities
  3. User can save/unsave properties to wishlist (persists without account via localStorage)
  4. User can view full property detail with image carousel
  5. Property detail has sticky "Postularme" CTA
**Research**: Unlikely (standard UI patterns, research covers stack)
**Plans**: TBD

### Phase 4: Property Management
**Goal**: Landlords can manage their property listings
**Depends on**: Phase 2, Phase 3
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05
**Success Criteria** (what must be TRUE):
  1. Landlord can see list of own properties
  2. Landlord can create new property with all required fields
  3. Landlord can edit existing property details
  4. Landlord can upload multiple photos with drag-and-drop
  5. Photos display with lazy loading and blur placeholders
**Research**: Likely (UploadThing integration)
**Research topics**: UploadThing file router, image optimization, blur placeholder generation
**Plans**: TBD

### Phase 5: Application Wizard
**Goal**: Tenants can complete a comprehensive application with documents
**Depends on**: Phase 3, Phase 4
**Requirements**: APPL-01, APPL-02, APPL-03, APPL-04, APPL-05, APPL-06, APPL-07, APPL-08
**Success Criteria** (what must be TRUE):
  1. Tenant can start application from property detail
  2. Wizard shows clear progress (step X of Y)
  3. Partially completed application auto-saves and can be resumed
  4. Tenant can upload and preview identity/income documents
  5. Tenant can review all information before final submit
  6. Submit triggers Risk Score calculation
**Research**: Likely (multi-step form patterns, Zustand persistence)
**Research topics**: React Hook Form wizard pattern, Zustand persist middleware, UploadThing for documents
**Plans**: TBD

### Phase 6: Risk Score Engine
**Goal**: Applications receive explainable risk scores with drivers and flags
**Depends on**: Phase 5
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04, SCOR-05, SCOR-06, SCOR-07, SCOR-08, SCOR-09, SCOR-10, SCOR-11
**Success Criteria** (what must be TRUE):
  1. Submitted application triggers scoring pipeline (via Inngest)
  2. Score 0-100 calculated with breakdown by category
  3. Level A/B/C/D assigned with text recommendation
  4. 3-6 driver explanations generated explaining score factors
  5. Risk flags (chips) generated for concerning patterns
  6. Suggested conditions generated based on risk profile
  7. All features and outcomes persisted for future ML
**Research**: Likely (Inngest background jobs, scoring algorithm design)
**Research topics**: Inngest function patterns, scoring model weights calibration, fair scoring principles
**Plans**: TBD

### Phase 7: Tenant Experience
**Goal**: Tenants can track and manage their applications
**Depends on**: Phase 5, Phase 6
**Requirements**: TENT-01, TENT-02, TENT-03, TENT-04, TENT-05
**Success Criteria** (what must be TRUE):
  1. Tenant can view list of all applications with current status
  2. Tenant can see detailed timeline of application events
  3. Tenant can see which verifications are complete/pending
  4. Tenant can respond to landlord information requests
  5. Tenant can withdraw application (changes status to WITHDRAWN)
**Research**: Unlikely (standard CRUD + state display)
**Plans**: TBD

### Phase 8: Landlord Experience
**Goal**: Landlords can evaluate, compare, and decide on candidates
**Depends on**: Phase 6, Phase 7
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10, LAND-11, LAND-12
**Success Criteria** (what must be TRUE):
  1. Landlord can view candidates per property ranked by fit
  2. Candidate cards show score level, rent-to-income ratio, key flags
  3. Landlord can view detailed candidate profile with AI summary
  4. Landlord can request additional information from candidate
  5. Landlord can pre-approve, approve, or reject candidates
  6. Landlord can add private notes to candidate files
**Research**: Unlikely (builds on existing patterns)
**Plans**: TBD

### Phase 9: State Machine
**Goal**: Application lifecycle is clearly tracked with visible timeline
**Depends on**: Phase 7, Phase 8
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. Applications enforce valid state transitions only
  2. Every state change creates timestamped event
  3. Timeline displays all events in chronological order
  4. Status changes immediately visible to tenant
**Research**: Unlikely (state machine is straightforward)
**Plans**: TBD

### Phase 10: UX Polish
**Goal**: Premium, polished user experience across all flows
**Depends on**: Phase 3, Phase 7, Phase 8
**Requirements**: UXPL-01, UXPL-02, UXPL-03, UXPL-04, UXPL-05
**Success Criteria** (what must be TRUE):
  1. All list views show skeleton loaders while loading
  2. Empty states have clear messaging and CTAs
  3. Property cards are large with high-quality optimized photos
  4. Hover and transition effects feel smooth and intentional
  5. Verification badges display consistently across views
**Research**: Unlikely (UI polish patterns)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Authentication | 0/TBD | Not started | - |
| 3. Property Catalog | 0/TBD | Not started | - |
| 4. Property Management | 0/TBD | Not started | - |
| 5. Application Wizard | 0/TBD | Not started | - |
| 6. Risk Score Engine | 0/TBD | Not started | - |
| 7. Tenant Experience | 0/TBD | Not started | - |
| 8. Landlord Experience | 0/TBD | Not started | - |
| 9. State Machine | 0/TBD | Not started | - |
| 10. UX Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-01-18*
