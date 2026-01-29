# Changelog

All notable changes to the Arriendo Facil frontend.

---

## [Unreleased] - 2026-01-29

### Phase 11: UI/UX Improvements & Publish Flow Enhancement

#### Property Publishing Wizard
- **NEW:** Plan selection step (Step 8) - Users choose subscription plan during publishing
- **CHANGED:** Neighborhood input is now free text (was dropdown)
- **CHANGED:** City selection uses visual cards instead of dropdown
- **IMPROVED:** Success screen with confetti animation
- **IMPROVED:** Auto-redirect countdown after publishing (5 seconds)
- **IMPROVED:** StepType with emoji illustrations and animations
- **IMPROVED:** StepReview now shows selected plan

#### Landlord Dashboard
- **FIXED:** Properties page with proper scaling and grid layout
- **FIXED:** Notification actions now functional
- **FIXED:** Candidate detail sidebar scroll issues
- **FIXED:** Candidate action buttons (approve/reject/etc)
- **IMPROVED:** Candidatos page with pagination

#### Contract Flow
- **FIXED:** Approving candidate now starts at step 1 (contract type selection)
- **FIXED:** Added `?new=true` param to force fresh contract start
- **FIXED:** Suspense wrapper for useSearchParams (SSR compatibility)

#### Navigation
- **CHANGED:** "Publicar Inmueble" has gray background by default
- **CHANGED:** "Buscar Inmueble" is plain text link
- **RESTORED:** "Precios" link in navbar

#### Dependencies
- **ADDED:** canvas-confetti for success celebrations

---

## [1.0.0] - 2026-01-20

### Phase 10: Post-Approval Flow (Complete)

#### Contract Signing
- Contract types and templates system
- ContractTimeline component (Deel-style)
- ContractPreview with parties and terms
- SignatureForm with Ley 527/1999 compliance
- "Generar contrato" button in CandidateDetail

#### Pricing & Subscriptions
- Three-tier plans: Free, Pro ($149,900), Business ($499,900)
- PricingCard and PricingTable components
- Public /pricing page with FAQ
- /panel/upgrade with checkout flow
- Dashboard upgrade CTA for free users

#### Coupon System
- 11 coupon types (percentage, fixed, free months, trial)
- CouponInput with validation states
- PriceSummary with discount display
- Checkout integration

#### Lease Management
- LeaseCard for landlord/tenant views
- PaymentHistory (responsive table/cards)
- PaymentMethodSelector (Colombian methods)
- /panel/leases page
- /mi-arriendo tenant dashboard

#### Insurance
- Three tiers: none, basic ($45k), premium ($89k)
- InsuranceSelector component
- Contract signing integration

---

## [0.9.0] - 2026-01-19

### Phase 9: Interactive Map

- Mapbox GL integration with react-map-gl
- Property coordinates for all 16 mock properties
- PriceMarker with pill-shaped price display
- ClusterMarker for grouped properties
- Split layout: 55% list, 45% map (desktop)
- Mobile toggle between list and map
- Bidirectional hover sync
- Click-to-scroll behavior

---

## [0.8.0] - 2026-01-19

### Phase 8: Authentication UI

- Split-layout auth page (image + form)
- AuthForm with login/register tabs
- Social login buttons (Google, Apple)
- ProtectedRoute component
- Role-based route protection
- Navbar user menu with dropdown
- Return URL redirect after login

---

## [0.7.0] - 2026-01-19

### Phase 7: UX Polish

- Light theme (Notion-inspired #FBFBFB)
- Typography scale with CSS variables
- Border radius scale (2px base)
- EmptyState, ErrorState, NotFound components
- Skeleton loaders for all list views
- PropertyAccordion for detail page
- StickyCTA with lead capture
- Framer Motion animations
- WCAG AA contrast compliance
- 44px touch targets
- Skip link for accessibility
- Reduced motion support

---

## [0.6.0] - 2026-01-18

### Phase 6: Tenant Tracking

- TenantApplication types
- ApplicationStatusBadge component
- ApplicationCard with status
- ApplicationTimeline with events
- ApplicationDetail drawer
- /mis-aplicaciones page
- Withdraw functionality

---

## [0.5.0] - 2026-01-18

### Phase 5: Landlord Dashboard

- LandlordProperty and LandlordCandidate types
- PropertyDashboardCard component
- DashboardSummary with stats
- CandidateCard with metrics
- CandidateDetail drawer
- DecisionButtons (card/detail variants)
- CandidateNotes with auto-save
- DecisionConfirmation dialog
- /panel routes structure

---

## [0.4.0] - 2026-01-18

### Phase 4: Risk Score Display

- RiskScore type system
- LevelBadge (sm/md/lg sizes)
- ScoreCard (compact/full variants)
- ScoreProgressBar with animation
- CategoryBreakdown accordion
- AIExplanation with typing effect
- KeyDrivers component
- RiskFlags component
- SuggestedConditions component
- RiskScoreDisplay composite
- /demo/score test page

---

## [0.3.0] - 2026-01-18

### Phase 3: Application Wizard

- Application types
- 6-step wizard with progress
- localStorage persistence
- StepPersonal, StepEmployment, StepIncome
- StepReferences with dynamic arrays
- StepDocuments with drag-drop
- StepReview with terms
- ConfirmationScreen
- AI-powered search input
- Spanish NLP query parsing
- UserProfileContext
- Qualification scoring
- ForYouCarousel
- Qualification badges

---

## [0.2.0] - 2026-01-17

### Phase 2: Property Catalog

- Property types
- 16 mock properties
- PropertyCard component
- PropertyGrid with filters
- FilterSidebar (mobile drawer + desktop sticky)
- usePropertyFilters hook
- /propiedades listing page
- /propiedades/[id] detail page
- Image carousel

---

## [0.1.0] - 2026-01-16

### Phase 1: Foundation

- Next.js 14 App Router setup
- TypeScript configuration
- Tailwind CSS + shadcn/ui
- Core UI components (Button, Card, Input, Badge, etc.)
- Risk level badge variants
- Prisma schema (reference)
- Format utilities (COP currency)

---

*Changelog format based on [Keep a Changelog](https://keepachangelog.com/)*
