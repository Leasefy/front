# Changelog

All notable changes to the Arriendo Facil frontend.

---

## [Unreleased] - 2026-02-07

### Phase 15: Complete QA & Polish

#### Empty States & Loading States
- **NEW:** `EmptyState` component with icon, title, description, and action button
- **NEW:** `ErrorState` component for error handling with retry actions
- **NEW:** Loading skeletons for all list views:
  - `LeaseCardSkeleton` - Lease list items
  - `PaymentRowSkeleton` - Payment history rows
  - `DocumentRowSkeleton` - Document list items
  - `NotificationRowSkeleton` - Notification items
  - `MessageRowSkeleton` - Conversation items
  - `CandidateCardSkeleton` - Candidate cards

#### Landlord Dashboard Empty States
- `/panel/visitas` - Tab-aware empty states (próximas/completadas/canceladas)
- `/panel/contratos` - Empty state with create action
- `/panel/leases` - Empty state with "Buscar inquilinos" action
- `/panel/candidatos` - Empty state with publish property action
- `/panel/mensajes` - Empty conversation and chat states
- `/panel/notificaciones` - Loading skeleton + empty state

#### Tenant Dashboard Empty States
- `/inquilino/aplicaciones` - Tab-aware empty states (activas/finalizadas)
- `/inquilino/arriendo` - Empty state with property search action
- `/inquilino/pagos` - Empty state for no payments
- `/inquilino/documentos` - Empty state with upload action
- `/inquilino/mensajes` - Empty conversation and chat states
- `/inquilino/notificaciones` - Loading skeleton + empty state

### Phase 14: Typography & Design System

#### Typography System
- **CHANGED:** Replaced Inter with Manrope (headings)
- **CHANGED:** Added DM Sans for body text
- **CHANGED:** Added DM Mono for monospace/code
- **NEW:** CSS custom properties for typography:
  - `--font-heading`: Manrope
  - `--font-body`: DM Sans
  - `--font-mono`: DM Mono
- **IMPROVED:** Consistent font weights and sizes

#### Dark Mode
- **NEW:** Full dark mode support across all pages
- **NEW:** Theme toggle in navbar
- **IMPROVED:** Dark mode colors with proper contrast
- **FIXED:** Dark mode in all dashboard pages
- **FIXED:** Dark mode in landing and product pages

### Phase 13: Navigation & Product Pages

#### Mega Menu
- **NEW:** Mega menu for "Productos" dropdown
- **NEW:** Mega menu for "Para Quién" dropdown
- **IMPROVED:** Hover animations and transitions
- **IMPROVED:** Mobile navigation menu

#### Product Pages (Complete Redesigns)
- `/productos/evaluacion` - Risk evaluation product page
- `/productos/contratos` - Digital contracts product page
- `/productos/pagos` - Payment collection product page
- `/productos/aplicaciones` - Application management page
- `/productos/seguro` - Insurance product page
- `/productos/api` - API product page

#### Audience Pages
- `/para/propietarios` - Landlord landing page
- `/para/inmobiliarias` - Real estate agencies page
- `/para/inquilinos` - Tenant landing page
- `/para/agentes` - Real estate agents page

### Phase 12: Landing Page Redesign

#### Hero Section
- **CHANGED:** Dark theme hero with gradient background
- **NEW:** Animated property cards preview
- **NEW:** Trust badges and social proof
- **IMPROVED:** CTA buttons with better contrast

#### About Section (Bento Grid)
- **NEW:** Modern bento grid layout
- **NEW:** Risk score preview widget
- **NEW:** Contract signing preview widget
- **NEW:** Search preview widget
- **IMPROVED:** Glass morphism effects

#### Problem/Solution Section
- **NEW:** Pain point cards with statistics
- **NEW:** Solution cards with icons
- **IMPROVED:** Visual hierarchy and spacing

#### CTA Section
- **NEW:** Gradient background with glass effect
- **NEW:** Floating UI widgets for visual interest
- **IMPROVED:** Conversion-focused design

---

## [1.1.0] - 2026-01-29

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

## Technical Summary for Backend

### Routes (50+ pages)

**Public Pages:**
- `/` - Landing page
- `/propiedades` - Property listing with filters
- `/propiedades/[id]` - Property detail
- `/aplicar/[propertyId]` - Application wizard (6 steps)
- `/auth` - Login/Register
- `/pricing` - Subscription plans
- `/productos/*` - Product pages (6)
- `/para/*` - Audience pages (4)
- `/blog`, `/ayuda`, `/privacidad`, `/terminos`

**Landlord Dashboard (`/panel`):**
- `/panel` - Dashboard home
- `/panel/propiedades` - My properties
- `/panel/candidatos` - All candidates
- `/panel/[propertyId]` - Property with candidates
- `/panel/[propertyId]/contract/[candidateId]` - Contract flow
- `/panel/contratos` - Contract management
- `/panel/leases` - Active leases
- `/panel/visitas` - Visit scheduling
- `/panel/mensajes` - Messages
- `/panel/notificaciones` - Notifications
- `/panel/configuracion` - Settings + Team + Payment Accounts
- `/panel/checkout` - Subscription checkout
- `/panel/upgrade` - Plan upgrade

**Tenant Dashboard (`/inquilino`):**
- `/inquilino` - Dashboard home
- `/inquilino/aplicaciones` - My applications
- `/inquilino/aplicaciones/[id]` - Application detail
- `/inquilino/arriendo` - Active leases
- `/inquilino/arriendo/[id]` - Lease detail
- `/inquilino/pagos` - Payment history
- `/inquilino/documentos` - My documents
- `/inquilino/mensajes` - Messages
- `/inquilino/notificaciones` - Notifications
- `/inquilino/perfil` - Profile
- `/inquilino/configuracion` - Settings

### Mock Data Files

- `mock-properties.ts` - 16 properties
- `mock-candidates.ts` - 8 candidates with risk scores
- `mock-contracts.ts` - Contract templates and instances
- `mock-leases.ts` - Active leases with payment history
- `mock-visits.ts` - Visit scheduling data
- `mock-dashboard.ts` - Dashboard stats and activity
- `mock-users.ts` - User profiles
- `mock-subscriptions.ts` - Subscription plans and coupons
- `mock-insurance.ts` - Insurance tiers
- `mock-explanations.ts` - AI explanations for risk scores
- `mock-payment-accounts.ts` - Colombian banks and wallets

### TypeScript Types

- `property.ts` - Property, PropertyFilter, PropertyType
- `application.ts` - Application, ApplicationStep, ApplicationStatus
- `risk-score.ts` - RiskScore, RiskLevel, RiskCategory
- `candidate.ts` - Candidate, CandidateStatus, CandidateDecision
- `contract.ts` - Contract, ContractType, SignatureData
- `lease.ts` - Lease, LeaseStatus, Payment, PaymentStatus
- `user.ts` - User, UserRole, UserProfile
- `subscription.ts` - Plan, Subscription, Coupon
- `publish.ts` - PublishStep, PublishData
- `payment-accounts.ts` - BankAccount, DigitalWallet

### React Contexts

- `AuthContext` - Authentication state
- `UserProfileContext` - User profile and preferences
- `ApplicationContext` - Application wizard state
- `TenantApplicationContext` - Tenant's applications
- `PublishContext` - Property publishing wizard
- `DecisionContext` - Candidate decision flow
- `SidebarContext` - Dashboard sidebar state

### Components (150+)

**UI Components (shadcn/ui):**
- Button, Card, Badge, Input, Select, Checkbox
- Dialog, Sheet, Dropdown, Accordion, Tabs
- Toast, Skeleton, ScrollArea, Pagination

**Custom Components:**
- PropertyCard, PropertyGrid, FilterSidebar
- CandidateCard, CandidateDetail, CandidateNotes
- RiskScoreDisplay, LevelBadge, ScoreCard
- ContractTimeline, ContractPreview, SignatureForm
- LeaseCard, PaymentHistory, PaymentMethodSelector
- ApplicationCard, ApplicationTimeline
- EmptyState, ErrorState, NotFound
- WizardShell, WizardProgress, WizardNavigation
- PricingCard, PricingTable, CouponInput
- InsuranceSelector, PropertyMap, PriceMarker

---

*Changelog format based on [Keep a Changelog](https://keepachangelog.com/)*
