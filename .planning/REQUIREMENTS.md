# Requirements: Arriendo Fácil

**Defined:** 2026-01-18
**Core Value:** Propietarios toman decisiones informadas sobre inquilinos en minutos, no días, con explicabilidad total del scoring AI.

## v1 Requirements

Requirements for MVP release. Each maps to roadmap phases.

### Foundation (FUND)

- [ ] **FUND-01**: Next.js 14 App Router project scaffolded with TypeScript
- [ ] **FUND-02**: Tailwind CSS + shadcn/ui configured
- [ ] **FUND-03**: Prisma + PostgreSQL schema initialized
- [ ] **FUND-04**: Project deploys to Vercel successfully
- [ ] **FUND-05**: Seed data script creates demo content

### Authentication (AUTH)

- [ ] **AUTH-01**: User can register with email magic link (OTP)
- [ ] **AUTH-02**: User can log in with magic link
- [ ] **AUTH-03**: User session persists across browser refresh
- [ ] **AUTH-04**: User can log out from any page
- [ ] **AUTH-05**: User role distinction (tenant vs landlord) established

### Catalog (CATL)

- [ ] **CATL-01**: User can browse property listings with premium cards (Airbnb-level)
- [ ] **CATL-02**: User can filter by city, neighborhood, price range
- [ ] **CATL-03**: User can filter by bedrooms, pet friendly, furnished, parking
- [ ] **CATL-04**: User can save properties to wishlist (without account)
- [ ] **CATL-05**: User can view property detail with image carousel
- [ ] **CATL-06**: Property detail shows rules, availability, sticky "Apply" CTA
- [ ] **CATL-07**: Map placeholder shows property location

### Property Management (PROP)

- [ ] **PROP-01**: Landlord can view list of own properties
- [ ] **PROP-02**: Landlord can create new property listing
- [ ] **PROP-03**: Landlord can edit property details
- [ ] **PROP-04**: Landlord can upload property photos
- [ ] **PROP-05**: Property photos display with optimized loading

### Application Flow (APPL)

- [ ] **APPL-01**: Tenant can start application wizard for a property
- [ ] **APPL-02**: Wizard has 4-6 steps with clear progress indicator
- [ ] **APPL-03**: Wizard autosaves progress (resume later)
- [ ] **APPL-04**: Tenant can upload identity documents with preview
- [ ] **APPL-05**: Tenant can upload income proof documents
- [ ] **APPL-06**: Tenant provides employment information
- [ ] **APPL-07**: Tenant provides references
- [ ] **APPL-08**: Tenant reviews and submits application

### Risk Score Engine (SCOR)

- [ ] **SCOR-01**: FeatureBuilder extracts features from application data
- [ ] **SCOR-02**: IntegrityEngine detects fraud/inconsistencies
- [ ] **SCOR-03**: FinancialModel calculates rent-to-income ratio + debt buffer
- [ ] **SCOR-04**: StabilityModel evaluates job tenure, contract type, address history
- [ ] **SCOR-05**: HistoryModel evaluates payment history, references
- [ ] **SCOR-06**: Aggregator combines subscores with configurable weights → 0-100
- [ ] **SCOR-07**: Score translates to level A/B/C/D with text recommendation
- [ ] **SCOR-08**: 3-6 driver explanations generated per candidate
- [ ] **SCOR-09**: Risk flags generated as visual chips
- [ ] **SCOR-10**: Suggested conditions generated (cosigner, deposit, insurance)
- [ ] **SCOR-11**: Features + outcomes persisted for future ML

### Tenant Experience (TENT)

- [ ] **TENT-01**: Tenant can view list of own applications with status
- [ ] **TENT-02**: Tenant can view application detail with timeline
- [ ] **TENT-03**: Tenant can see verification checklist status
- [ ] **TENT-04**: Tenant can respond to information requests
- [ ] **TENT-05**: Tenant can withdraw application

### Landlord Experience (LAND)

- [ ] **LAND-01**: Landlord can view candidates for each property
- [ ] **LAND-02**: Candidates ranked by fit score
- [ ] **LAND-03**: Candidate cards show level, score, rent-to-income ratio
- [ ] **LAND-04**: Candidate cards show verification checks and risk flags
- [ ] **LAND-05**: Landlord can request additional information
- [ ] **LAND-06**: Landlord can pre-approve candidate
- [ ] **LAND-07**: Landlord can approve candidate
- [ ] **LAND-08**: Landlord can reject candidate
- [ ] **LAND-09**: Landlord can view detailed candidate profile
- [ ] **LAND-10**: Candidate detail shows AI summary, subscores, drivers
- [ ] **LAND-11**: Candidate detail shows documents, references, notes
- [ ] **LAND-12**: Landlord can add private notes to candidates

### State Machine (STAT)

- [ ] **STAT-01**: Applications have states: DRAFT, SUBMITTED, UNDER_REVIEW, NEEDS_INFO, PREAPPROVED, APPROVED, REJECTED, WITHDRAWN
- [ ] **STAT-02**: State transitions logged with timestamps
- [ ] **STAT-03**: Timeline shows all events visually
- [ ] **STAT-04**: Status changes visible to tenant in real-time

### UX Premium (UXPL)

- [ ] **UXPL-01**: Skeleton loaders on all list views
- [ ] **UXPL-02**: Empty states with clear CTAs
- [ ] **UXPL-03**: Large cards with optimized photos
- [ ] **UXPL-04**: Micro-interactions (hover, transitions)
- [ ] **UXPL-05**: Verification badges displayed consistently

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments & Contracts

- **PAY-01**: Tenant can pay rent through platform
- **PAY-02**: Lease contract generation
- **PAY-03**: Insurance/guarantee integration

### Communication

- **COMM-01**: Real-time chat between tenant and landlord
- **COMM-02**: WhatsApp/SMS notifications
- **COMM-03**: Push notifications

### Advanced Features

- **ADV-01**: Real credit bureau integration (Datacrédito)
- **ADV-02**: Identity verification (facial recognition)
- **ADV-03**: ML-based scoring (trained on outcomes)
- **ADV-04**: Multi-city expansion beyond Colombia

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real payments/contracts | MVP validates flow, not transaction |
| Real-time chat | Async messages sufficient for MVP |
| Real credit bureau integration | Internal scoring rules for MVP |
| Multi-country support | Colombia only (COP, Colombian cities) |
| SMS/WhatsApp OTP | Email magic link reduces complexity |
| Real identity verification | Document upload simulation for MVP |
| ML-based scoring | Rule-based first, save data for future ML |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FUND-01 | Phase 1 | Pending |
| FUND-02 | Phase 1 | Pending |
| FUND-03 | Phase 1 | Pending |
| FUND-04 | Phase 1 | Pending |
| FUND-05 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| CATL-01 | Phase 3 | Pending |
| CATL-02 | Phase 3 | Pending |
| CATL-03 | Phase 3 | Pending |
| CATL-04 | Phase 3 | Pending |
| CATL-05 | Phase 3 | Pending |
| CATL-06 | Phase 3 | Pending |
| CATL-07 | Phase 3 | Pending |
| PROP-01 | Phase 4 | Pending |
| PROP-02 | Phase 4 | Pending |
| PROP-03 | Phase 4 | Pending |
| PROP-04 | Phase 4 | Pending |
| PROP-05 | Phase 4 | Pending |
| APPL-01 | Phase 5 | Pending |
| APPL-02 | Phase 5 | Pending |
| APPL-03 | Phase 5 | Pending |
| APPL-04 | Phase 5 | Pending |
| APPL-05 | Phase 5 | Pending |
| APPL-06 | Phase 5 | Pending |
| APPL-07 | Phase 5 | Pending |
| APPL-08 | Phase 5 | Pending |
| SCOR-01 | Phase 6 | Pending |
| SCOR-02 | Phase 6 | Pending |
| SCOR-03 | Phase 6 | Pending |
| SCOR-04 | Phase 6 | Pending |
| SCOR-05 | Phase 6 | Pending |
| SCOR-06 | Phase 6 | Pending |
| SCOR-07 | Phase 6 | Pending |
| SCOR-08 | Phase 6 | Pending |
| SCOR-09 | Phase 6 | Pending |
| SCOR-10 | Phase 6 | Pending |
| SCOR-11 | Phase 6 | Pending |
| TENT-01 | Phase 7 | Pending |
| TENT-02 | Phase 7 | Pending |
| TENT-03 | Phase 7 | Pending |
| TENT-04 | Phase 7 | Pending |
| TENT-05 | Phase 7 | Pending |
| LAND-01 | Phase 8 | Pending |
| LAND-02 | Phase 8 | Pending |
| LAND-03 | Phase 8 | Pending |
| LAND-04 | Phase 8 | Pending |
| LAND-05 | Phase 8 | Pending |
| LAND-06 | Phase 8 | Pending |
| LAND-07 | Phase 8 | Pending |
| LAND-08 | Phase 8 | Pending |
| LAND-09 | Phase 8 | Pending |
| LAND-10 | Phase 8 | Pending |
| LAND-11 | Phase 8 | Pending |
| LAND-12 | Phase 8 | Pending |
| STAT-01 | Phase 9 | Pending |
| STAT-02 | Phase 9 | Pending |
| STAT-03 | Phase 9 | Pending |
| STAT-04 | Phase 9 | Pending |
| UXPL-01 | Phase 10 | Pending |
| UXPL-02 | Phase 10 | Pending |
| UXPL-03 | Phase 10 | Pending |
| UXPL-04 | Phase 10 | Pending |
| UXPL-05 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 after roadmap creation*
