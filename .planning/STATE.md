# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-16)
See: .planning/FRONTEND-VISION.md (created 2026-01-18)
See: docs/BACKEND-INTEGRATION.md (created 2026-01-29) - **Backend API Contract**
See: docs/FRONTEND-ARCHITECTURE.md (created 2026-01-29) - **Frontend Structure**
See: docs/CHANGELOG.md (created 2026-01-29) - **All Changes**

**Core value:** Propietarios toman decisiones informadas sobre inquilinos en minutos con explicabilidad conversacional del scoring AI.
**Current focus:** Inmobiliaria Module - Phase 9 Operaciones (IN PROGRESS)

## Current Position

Milestone: v3.0 Inmobiliaria Module
Phase: Inmobiliaria-09 Operaciones (4 plans) - IN PROGRESS
Plan: 09-01 COMPLETE, 09-02, 09-03, 09-04 remaining
Status: Phase 9 In Progress
Last activity: 2026-02-08 — Completed 09-01 RenovacionesTable plan

Progress: ██████████████████████████████ 100% (Phase 8) | ████████░░░░░░░░░░░░░░░░░░░░░░ 25% (Phase 9)

## Roadmap Reorganization (2026-01-18)

**Major change:** Project refocused to frontend-only development.
- Backend will be developed by another person
- All phases now focus on UX/UI with mock data
- Reduced from 10 phases to 7 phases

**Phase status:**
1. Foundation & Design System (COMPLETE)
2. Property Catalog (COMPLETE)
3. Application Wizard (COMPLETE)
4. Risk Score Display (COMPLETE) - THE differentiator
5. Landlord Dashboard (COMPLETE)
6. Tenant Tracking (COMPLETE)
7. UX Polish (COMPLETE)
8. Authentication UI (COMPLETE) - Split-layout auth, protected routes, user menu
9. Interactive Map (COMPLETE) - Airbnb-style map with price markers and clustering
10. Post-Approval Flow (COMPLETE) - Contract generation, pricing, coupons, leases
11. UI/UX Improvements (COMPLETE) - Publish flow enhancement, dashboard fixes

## Performance Metrics

**Velocity:**
- Total plans completed: 35
- Average duration: 6.2 min
- Total execution time: 3.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 38min | 9.5min |
| 02-property-catalog | 2/2 | 15min | 7.5min |
| 03-application-wizard | 5/5 | 30.5min | 6.1min |
| 04-risk-score-display | 4/4 | 18min | 4.5min |
| 05-landlord-dashboard | 3/3 | 28min | 9.3min |
| 06-tenant-tracking | 2/2 | 14min | 7min |
| 07-ux-polish | 6/6 | 33min | 5.5min |
| 08-authentication-ui | 2/2 | 13.5min | 6.75min |
| 09-interactive-map | 2/2 | 17min | 8.5min |
| 10-post-approval-flow | 5/5 | 29.2min | 5.84min |

## Accumulated Context

### Key Decisions

- **Frontend-first approach**: Backend handled separately, we build UX with mock data
- **Risk Score UX**: Conversational "asesor de confianza" tone, not dashboard metrics
- **Mock data strategy**: Realistic Colombian data, all flows functional
- Stack: Next.js 14 + shadcn/ui + Tailwind
- UI: Slate base with blue primary, new-york shadcn style
- Risk badges: variant="risk-a|b|c|d" for A/B/C/D levels
- **Property types**: Comprehensive Property interface with all catalog fields
- **Currency format**: $ 2.500.000 format using es-CO locale
- **Prisma stub**: Use stub for frontend-only development (no generate needed)
- **Filter hook pattern**: Custom hook with memoized filtering for clean separation
- **Mobile filters**: Bottom drawer on mobile, sticky sidebar on desktop
- **Wishlist storage**: localStorage with JSON serialization
- **Application route**: `/aplicar/[propertyId]` for wizard flow
- **Wizard state**: localStorage per property with SSR-safe hydration
- **Step completion**: Minimum fields per step (name+doc, salary, etc.)
- **Touched validation**: Show errors only after field blur
- **Currency input**: Format with locale separators on change
- **Conditional employment**: Show/hide fields based on status
- **Terms in context**: Manage terms acceptance in ApplicationContext for global validation
- **File persistence warning**: Explicit warning that files don't persist (browser limitation)
- **Reference arrays memoized**: useMemo to avoid React hooks dependency warnings
- **AI Search parsing**: Regex-based Spanish NLP for city/type/bedrooms/price/area/amenities
- **Search UX**: ChatGPT-style input with example chips, bidirectional filter sync
- **User profile simulation**: localStorage + toggle for testing personalization without auth
- **30% affordability rule**: Rent + admin <= 30% of available income (industry standard)
- **Match scoring algorithm**: Affordability (ideal 22%) + city + bedrooms + type preferences
- **Qualification badges**: Bottom-right of card image, green for "Califica", amber for "Fuera de presupuesto"
- **Risk score thresholds**: A>=85, B>=70, C>=50, D<50 (industry standard credit mapping)
- **Risk level colors**: emerald/blue/amber/red for A/B/C/D levels
- **AI explanation tone**: Conversational Spanish "asesor de confianza" style
- **Score component structure**: Composable components with barrel export
- **Level badge sizes**: sm (24px), md (32px), lg (48px) with optional labels
- **Progress bar animation**: CSS transition for smooth visual feedback
- **Typing animation**: JS intervals with punctuation-aware pauses for natural feel
- **Risk flags styling**: Muted professional colors (gray/amber/rose) - non-alarmist
- **Animation sequence**: Badge -> explanation -> drivers -> flags -> conditions
- **Actionable language**: "Considere solicitar..." not "Debe requerir..." for helpful tone
- **Demo components**: Separate /components/demo directory for testing utilities
- **Landlord status types**: pending/pre-approved/approved/rejected/more-info
- **Dashboard route**: `/panel` for landlord entry point, `/panel/[propertyId]` for details
- **Candidate distribution**: 12 candidates across 3 properties for realistic testing
- **Metrics compact format**: `$XM/mes | X anos estable | icon` for quick visual scanning
- **AI snippet truncation**: First 2 sentences or 150 chars, respecting sentence boundaries
- **Level-based card styling**: A/B colored accents, C/D muted for visual hierarchy
- **Drawer over page**: Use Sheet drawer for candidate details instead of separate page
- **Confirmation for reject**: Require confirmation dialog for reject action
- **localStorage decisions**: Persist decisions to localStorage under 'arriendo-facil-decisions'
- **Notes auto-save**: Auto-save notes on blur
- **Tenant status states**: submitted, under_review, pre_approved, approved, rejected, withdrawn
- **Tracking code format**: AF-XXXXXX for recognizable tenant codes
- **Event timeline pattern**: ApplicationEvent with chronological history and Spanish descriptions
- **Timeline order**: Oldest first (top-to-bottom chronological flow)
- **Tenant detail drawer**: Sheet drawer pattern for application detail (consistent with CandidateDetail)
- **Withdraw confirmation**: Dialog confirmation for destructive withdraw action
- **Empty state pattern**: Reusable EmptyState with icon, title, description, optional CTA
- **Error state pattern**: ErrorState with retry button, non-alarming red styling
- **NotFound component**: Built on EmptyState for 404 scenarios
- **UI barrel export**: Centralized export for state components
- **Skeleton component naming**: [ComponentName]Skeleton pattern
- **isLoading prop pattern**: Grid/list components accept isLoading for skeleton display
- **Skeleton barrel export**: src/components/skeleton/ with centralized index.ts
- **Light theme default**: Notion-inspired almost-white background (#FBFBFB), dark-section variant for overlays
- **Typography scale**: text-display, text-h1-h4, text-body variants, text-caption, text-overline
- **Border radius scale**: 2px base (--radius-sm through --radius-full CSS variables)
- **Spacing grid**: 4px base documented as CSS custom properties (--space-1 through --space-16)
- **Framer Motion grid**: AnimatePresence mode='popLayout' for smooth layout transitions in PropertyGrid
- **Search loading UX**: 1.2s simulated AI processing for conversational feel
- **Contextual result text**: 'encontradas' vs 'disponibles' based on active filters
- **PropertyAccordion pattern**: Reusable accordion using shadcn with configurable defaultOpen sections
- **StickyCTA separation**: Separate desktop and mobile CTA components for different layouts
- **Image grid over carousel**: Keep Luxterra-style 3-image grid for hero, better visual impact
- **Accordion animations**: Radix accordion with tailwind keyframes (0.2s ease-out)
- **Focus-visible standard**: CSS :focus-visible for keyboard-only focus indicators
- **Skip link pattern**: Invisible skip link visible on focus for screen reader users
- **44px touch targets**: WCAG 2.1 AAA minimum for touch accessibility
- **Contrast adjustment**: --muted-foreground from 45% to 40% lightness for WCAG AA
- **Gray-500 for text**: Replaced gray-400 with gray-500 for readable text elements
- **Reduced motion**: @media (prefers-reduced-motion) disables animations
- **Auth split-layout**: Image+testimonial left, form right on desktop
- **Suspense for useSearchParams**: Next.js 14 requirement for client components
- **Demo credentials hint**: Show login credentials on auth form for testing
- **react-map-gl v8 import**: Use 'react-map-gl/mapbox' not 'react-map-gl' for Mapbox support
- **Property coordinates**: All 16 mock properties have realistic Colombian coordinates
- **Map constants**: COLOMBIA_BOUNDS, CITY_COORDINATES, ZOOM_LEVELS, CLUSTER_CONFIG defined
- **Split layout ratio**: 55% list, 45% map on desktop (Airbnb-style)
- **Hover pan threshold**: Only pan map when zoom >= city level (12)
- **Cluster config**: 50px radius, max zoom 14, min 2 points
- **Mobile map toggle**: Hidden map on mobile, toggle button at bottom center
- **Property ref callback**: Track DOM refs for scroll-to-property behavior
- **Freemium pricing model**: Free/Pro ($49,900)/Business ($149,900) with 20% yearly discount
- **Feature gating**: AI scoring in Pro, API access in Business tier
- **Billing toggle pattern**: Monthly/Yearly with savings badge
- **Coupon types**: PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS for flexible discounts
- **Trial calculation**: isTrialCoupon and getTrialDuration utilities for centralized logic
- **Coupon validation**: Spanish error messages for all validation cases
- **Lease view pattern**: LeaseCard accepts 'view' prop for landlord/tenant rendering
- **Payment methods Colombian**: PSE, cards, Nequi, Daviplata with cash as coming soon
- **Payment history responsive**: Desktop table, mobile cards
- **Insurance tiers**: none ($0), basic ($45k COP), premium ($89k COP) with recommended badge on basic
- **Publish wizard 9 steps**: Type → Location → Details → Amenities → Photos → Pricing → Description → Plan → Review
- **Plan selection required**: Users must choose a plan (free/pro/business) before publishing
- **Neighborhood free text**: Changed from dropdown to free text input for flexibility
- **City visual cards**: Major Colombian cities as clickable visual cards
- **Publish success confetti**: canvas-confetti for celebration effect
- **Auto-redirect**: 5-second countdown after successful publish to /panel/propiedades
- **Contract fresh start**: Approving candidate always starts from step 1 (contract type selection)
- **Navbar styling**: "Publicar Inmueble" with bg-black/5, others as plain text
- **Consignacion availability colors**: emerald=available, indigo=rented, amber=in_process, rose=maintenance
- **Property type icons**: Phosphor icons for apartment/house/studio/commercial/office/warehouse
- **Portafolio pagination**: 12 items per page for optimal grid layout
- **Filter state pattern**: ConsignacionFiltersState type for centralized filter management
- **Consignacion detail layout**: Two-column (2/3 + 1/3) with sections pattern
- **Auto-generated timeline**: Events derived from consignacion data, not stored separately
- **Inventory condition colors**: emerald=excellent, blue=good, amber=fair, rose=poor
- **Commission split visualization**: Progress bar showing agent vs agency percentages
- **Pure CSS charts**: Workload chart uses CSS-only bars (no charting library)
- **Workload thresholds**: 5/8/10 as low/optimal/overloaded property counts
- **Medal icons**: Emoji medals for top 3 leaderboard performers
- **Pipeline card width**: 280px fixed for horizontal Kanban scroll layout
- **Days-in-stage thresholds**: Warning at 7 days (amber), critical at 14 days (red)
- **Stage color extraction**: Parse PIPELINE_STAGES color for top border and indicator
- **Collapsible columns**: Toggle hides cards but shows count footer
- **Drop zone styling**: Dashed border with hint text for drag target feedback
- **@dnd-kit over alternatives**: Modern, accessible, actively maintained drag-and-drop
- **DragOverlay pattern**: Shows card preview during drag for better UX
- **Optimistic stage updates**: Stage changes update local state immediately, toast confirms
- **Lost column collapsed**: De-emphasize failed leads, keep focus on active pipeline
- **Reminder config sheet**: Sheet drawer for reminder settings (consistent with other configs)
- **Day selector multi-select**: Badge buttons with toggle for visual clarity
- **Channel toggles**: Switch components with icon boxes for clear on/off state
- **Template previews**: Highlighted variables in message templates for user visibility
- **Cobro detail sections**: Grouped sections (property/tenant/amounts) for logical organization
- **Payment history timeline**: Timeline-style layout for easy payment trail
- **Table/card view toggle**: User preference for data density in cobros list
- **Optimistic cobro updates**: Payment registration updates state immediately
- **Dispersion status border pattern**: Left border colors (amber/blue/emerald/red) for quick status identification
- **Dispersion month navigation**: Prev/next arrows + dropdown for faster month switching
- **Dispersion expandable properties**: AnimatePresence for smooth expand/collapse of property items
- **Commission ratio visualization**: Progress bar showing agency vs owner split (indigo/emerald)
- **Extracto PDF pattern**: Professional Colombian business document format with jsPDF
- **Status timeline events**: Vertical timeline for dispersion audit trail (created/approved/processed)

### What's Complete (Phase 1)

- Project scaffolded with Next.js 14
- shadcn/ui configured with slate theme
- Core components: Button, Card, Input, Badge, Label, Skeleton
- Risk level badge variants (A/B/C/D colors)
- Prisma schema defined (for backend reference)
- Seed data structure (for mock data reference)
- TypeScript configured

### What's Complete (Phase 2)

- Property TypeScript types (`src/lib/types/property.ts`)
- Mock properties data - 16 Colombian properties (`src/lib/data/mock-properties.ts`)
- PropertyCard component (`src/components/property/PropertyCard.tsx`)
- Format utilities for COP currency (`src/lib/format.ts`)
- Prisma stub for build compatibility (`src/lib/prisma-stub.ts`)
- usePropertyFilters hook (`src/lib/hooks/usePropertyFilters.ts`)
- FilterSidebar component (`src/components/property/FilterSidebar.tsx`)
- PropertyGrid component (`src/components/property/PropertyGrid.tsx`)
- Propiedades listing page (`src/app/propiedades/page.tsx`)
- Property detail page with carousel and CTA (`src/app/propiedades/[id]/page.tsx`)

### What's Complete (Phase 3) - COMPLETE

- Application TypeScript types (`src/lib/types/application.ts`)
- ApplicationContext with localStorage persistence (`src/lib/context/ApplicationContext.tsx`)
- WizardProgress component - 6 steps (`src/components/wizard/WizardProgress.tsx`)
- WizardNavigation component (`src/components/wizard/WizardNavigation.tsx`)
- WizardShell container (`src/components/wizard/WizardShell.tsx`)
- Wizard page route (`src/app/aplicar/[propertyId]/page.tsx`)
- Select component (radix-ui) (`src/components/ui/select.tsx`)
- Validation utilities (`src/lib/validation/applicationValidation.ts`)
- StepPersonal component - identity, contact, stability fields
- StepEmployment component - conditional job fields
- StepIncome component - currency inputs with capacity summary
- **StepReferences component** - landlord/employment/personal refs with dynamic arrays
- **StepDocuments component** - drag-drop upload for required/optional docs
- **StepReview component** - summary cards with edit buttons, terms acceptance
- **DocumentUpload component** - drag-drop with validation
- **ConfirmationScreen component** - success, tracking code, next steps
- **Checkbox component** (radix-ui)
- Terms state management in context with canSubmit validation
- **AI-powered search** - ChatGPT-style natural language input (`src/components/property/AISearchInput.tsx`)
- **Search query parser** - Spanish NLP regex parsing (`src/lib/search/parseSearchQuery.ts`)
- Enhanced usePropertyFilters with setFromParsedQuery for AI search integration
- **UserProfileContext** - Mock user profile with localStorage persistence (`src/lib/context/UserProfileContext.tsx`)
- **Qualification scoring** - 30% affordability + preference matching (`src/lib/scoring/qualificationScore.ts`)
- **ForYouCarousel** - Personalized top 6 matches carousel (`src/components/property/ForYouCarousel.tsx`)
- **Qualification badges** - Califica/Fuera de presupuesto on PropertyCard
- **"Solo propiedades para mi"** toggle in FilterSidebar
- Simulation toggle for testing personalization features

### What's Complete (Phase 4) - COMPLETE

- **RiskScore type** - Full type system for risk assessment (`src/lib/types/risk-score.ts`)
- **Candidate type** - Applicant profiles with scores (`src/lib/types/candidate.ts`)
- **Risk level constants** - Colors, labels, thresholds (`src/lib/constants/risk-levels.ts`)
- **Mock AI explanations** - 19 templates across all levels (`src/lib/data/mock-explanations.ts`)
- **Mock candidates** - 12 realistic Colombian profiles (`src/lib/data/mock-candidates.ts`)
- **Central exports** - Index files for types, data, constants
- **LevelBadge component** - Circular badge with sm/md/lg sizes (`src/components/score/LevelBadge.tsx`)
- **ScoreCard component** - Compact and full variants (`src/components/score/ScoreCard.tsx`)
- **ScoreProgressBar component** - Animated progress with colors (`src/components/score/ScoreProgressBar.tsx`)
- **CategoryBreakdown component** - Accordion with category details (`src/components/score/CategoryBreakdown.tsx`)
- **Score components barrel export** - Central import point (`src/components/score/index.ts`)
- **AIExplanation component** - Conversational narrative with typing animation
- **useTypingAnimation hook** - Typewriter effect with punctuation pauses
- **KeyDrivers component** - Positive factors with level-colored checkmarks
- **RiskFlags component** - Non-alarmist warnings with severity styling
- **SuggestedConditions component** - Actionable recommendations
- **RiskScoreDisplay component** - Full composite with animation sequencing
- **CandidateSelector component** - Dropdown grouped by level (`src/components/demo/CandidateSelector.tsx`)
- **DemoControls component** - Variant and animation controls (`src/components/demo/DemoControls.tsx`)
- **Demo page** - Interactive testing at `/demo/score` (`src/app/demo/score/page.tsx`)

### What's NOT in Scope

Backend responsibilities (for other developer):
- Database setup and migrations
- API endpoints
- Authentication backend
- Scoring algorithm
- File upload to cloud
- Email notifications

### What's Complete (Phase 5) - COMPLETE

- **Landlord types** - LandlordProperty, LandlordCandidate, DashboardSummary (`src/lib/types/landlord.ts`)
- **Mock landlord data** - 12 candidates across 3 properties (`src/lib/data/mock-landlord-data.ts`)
- **PropertyDashboardCard** - Property card with candidate count badge (`src/components/landlord/PropertyDashboardCard.tsx`)
- **DashboardSummary** - Aggregate stats component (`src/components/landlord/DashboardSummary.tsx`)
- **Dashboard page** - Landlord entry at `/panel` (`src/app/panel/page.tsx`)
- **CandidateCard** - Quick comparison card with metrics, AI snippet, decision buttons (`src/components/landlord/CandidateCard.tsx`)
- **CandidateMetrics** - Income, stability, history display in compact/full variants (`src/components/landlord/CandidateMetrics.tsx`)
- **AISnippet** - Truncated AI explanation with level-appropriate styling (`src/components/landlord/AISnippet.tsx`)
- **CandidateList** - Responsive grid sorted by score (`src/components/landlord/CandidateList.tsx`)
- **Property Candidates page** - `/panel/[propertyId]` with candidate list (`src/app/panel/[propertyId]/page.tsx`)
- **Landlord components barrel export** (`src/components/landlord/index.ts`)
- **DecisionContext** - State management for decisions and notes (`src/lib/context/DecisionContext.tsx`)
- **DecisionButtons** - Card and detail variants for decision actions (`src/components/landlord/DecisionButtons.tsx`)
- **CandidateDetail** - Full drawer with RiskScoreDisplay (`src/components/landlord/CandidateDetail.tsx`)
- **CandidateNotes** - Notes with auto-save (`src/components/landlord/CandidateNotes.tsx`)
- **DecisionConfirmation** - Dialog for reject/approve confirmation (`src/components/landlord/DecisionConfirmation.tsx`)
- **Panel layout** - DecisionProvider wrapper (`src/app/panel/layout.tsx`)
- **shadcn components** - Sheet, Dialog, Textarea

### What's Complete (Phase 6) - COMPLETE

- **TenantApplication types** - Status, events, tracking code (`src/lib/types/tenant-application.ts`)
- **Mock tenant applications** - 6 applications in various states (`src/lib/data/mock-tenant-applications.ts`)
- **ApplicationStatusBadge** - Status badge with Spanish labels (`src/components/tenant/ApplicationStatusBadge.tsx`)
- **ApplicationCard** - Card with property thumbnail, status, tracking (`src/components/tenant/ApplicationCard.tsx`)
- **Tenant components barrel export** (`src/components/tenant/index.ts`)
- **TenantApplicationContext** - localStorage persistence with withdraw functionality (`src/lib/context/TenantApplicationContext.tsx`)
- **ApplicationTimeline** - Chronological event display with icons (`src/components/tenant/ApplicationTimeline.tsx`)
- **ApplicationDetail** - Drawer with timeline, progress, withdraw button (`src/components/tenant/ApplicationDetail.tsx`)
- **Mis Aplicaciones page** - `/mis-aplicaciones` with summary cards and list (`src/app/mis-aplicaciones/page.tsx`)
- **Format utilities** - formatDate, formatDateTime, formatRelativeTime (`src/lib/format.ts`)

### What's Complete (Phase 7) - COMPLETE

- **EmptyState component** - Reusable empty state with icon, title, description, CTA (`src/components/ui/empty-state.tsx`)
- **ErrorState component** - Error display with retry button (`src/components/ui/error-state.tsx`)
- **NotFound component** - 404 state built on EmptyState (`src/components/ui/not-found.tsx`)
- **UI barrel export** - Centralized exports (`src/components/ui/index.ts`)
- **PropertyGrid empty state** - Uses reusable EmptyState
- **Mis Aplicaciones empty state** - Uses reusable EmptyState
- **CandidateList empty state** - Uses reusable EmptyState
- **PropertyCardSkeleton** - Skeleton matching PropertyCard dimensions (`src/components/skeleton/PropertyCardSkeleton.tsx`)
- **PropertyDetailSkeleton** - Skeleton for property detail page (`src/components/skeleton/PropertyDetailSkeleton.tsx`)
- **CandidateCardSkeleton** - Skeleton for candidate cards (`src/components/skeleton/CandidateCardSkeleton.tsx`)
- **ApplicationCardSkeleton** - Skeleton for application cards (`src/components/skeleton/ApplicationCardSkeleton.tsx`)
- **Skeleton barrel export** - Centralized exports (`src/components/skeleton/index.ts`)
- **PropertyGrid isLoading** - Displays skeletons during loading state
- **Design System Polish** - Light theme, typography scale, radius scale, spacing grid (`src/app/globals.css`)
- **PropertyAccordion component** - Reusable accordion for property sections (`src/components/property/PropertyAccordion.tsx`)
- **StickyCTA component** - Sticky CTA card with lead capture (`src/components/property/StickyCTA.tsx`)
- **MobileStickyCTA component** - Fixed bottom CTA for mobile
- **ImageCarousel hero variant** - Full-width, taller hero mode with gallery integration
- **Property Detail redesign** - Luxterra-style with reusable components
- **Accordion animations** - Tailwind keyframes for smooth accordion transitions
- **AI Search Enhancement** - Framer Motion animations, loading state, contextual results
- **Focus visible styles** - CSS :focus-visible for accessibility
- **Skip link** - Keyboard users can skip to main content
- **ARIA attributes** - Labels, roles, and states for screen readers
- **WCAG AA contrast** - Adjusted muted colors for compliance
- **Touch targets** - 44px minimum for mobile accessibility
- **Reduced motion** - Respects prefers-reduced-motion preference

### What's Complete (Phase 8) - COMPLETE

**Plan 1 - Auth Pages:**
- **Auth page** - Split-layout at `/auth` with image+testimonial left, form right
- **AuthForm component** - Login/register tabs with react-hook-form validation
- **AuthInput component** - Input with icons, password toggle, error states
- **SocialButtons component** - Google and Apple styled buttons with proper icons
- **Testimonial component** - Quote card with avatar for social proof
- **Divider component** - "o continua con email" line-text-line pattern
- **Auth barrel export** - Centralized exports (`src/components/auth/index.ts`)
- **react-hook-form dependency** - Added for form validation

**Plan 2 - Auth State & Protected Routes:**
- **ProtectedRoute component** - Route protection wrapper with role-based access
- **AuthProvider in root layout** - Auth context available throughout app
- **Protected /panel routes** - Landlord-only access with redirect to /auth
- **Protected /mis-aplicaciones** - Tenant-only access with redirect to /auth
- **Navbar user menu** - Dropdown with dashboard link and logout
- **Mobile user menu** - User info and auth state in mobile navigation
- **Return URL redirect** - After login, redirects to intended page

### What's Complete (Phase 9) - COMPLETE

**Plan 1 - Map Foundation:**
- **Property coordinates** - latitude/longitude fields added to Property type
- **Mock data coordinates** - All 16 properties have realistic Colombian coordinates
- **Mapbox dependencies** - react-map-gl 8.1.0, mapbox-gl 3.18.0 installed
- **PropertyMap component** - Basic map with Colombia bounds and fallback
- **Map constants** - Bounds, city coordinates, zoom levels, cluster config

**Plan 2 - Map Integration:**
- **useSupercluster hook** - Efficient marker clustering with supercluster
- **PriceMarker component** - Pill-shaped markers with "$2.5M" prices
- **ClusterMarker component** - Circular markers with property count
- **MapToggle component** - Mobile toggle between list and map views
- **Split layout** - 55% list, 45% map on desktop
- **Bidirectional hover sync** - List-map interaction
- **Click to scroll** - Marker click scrolls to property in list

### What's Complete (Phase 10) - COMPLETE

**Plan 1 - Contract Signing:**
- **Contract types** - Contract, ContractClause, ContractTemplate, Signature interfaces (`src/lib/types/contract.ts`)
- **Mock contracts** - 3 templates (basico/amoblado/compartido) with Colombian law clauses (`src/lib/data/mock-contracts.ts`)
- **ContractTimeline component** - Deel-style vertical timeline with progress
- **ContractPreview component** - Document preview with parties, terms, signatures
- **SignatureForm component** - Legal compliance with Ley 527/1999 checkboxes
- **Contract signing page** - `/panel/[propertyId]/contract/[candidateId]` with 3-column layout
- **"Generar contrato" button** - Added to CandidateDetail drawer when approved

**Plan 2 - Pricing Page:**
- **Subscription types** - PlanId, BillingCycle, Plan, Subscription interfaces
- **Mock subscriptions** - Free/Pro/Business plans with features
- **PricingCard component** - Individual plan card with features
- **PricingTable component** - Grid with billing toggle
- **Pricing page** - Public `/pricing` with comparison and FAQ
- **Upgrade page** - `/panel/upgrade` with checkout flow
- **Dashboard upgrade CTA** - Sidebar prompt for free users

**Plan 3 - Coupon System:**
- **Coupon types** - CouponType, Coupon, CouponValidationResult, AppliedCoupon (`src/lib/types/coupon.ts`)
- **Mock coupons** - 11 test coupons covering all types (`src/lib/data/mock-coupons.ts`)
- **Coupon validation** - validateCoupon, calculateDiscountedPrice, isTrialCoupon (`src/lib/utils/coupon-validation.ts`)
- **CouponInput component** - Input with validation, success/error states (`src/components/pricing/CouponInput.tsx`)
- **PriceSummary component** - Price breakdown with discount display (`src/components/pricing/PriceSummary.tsx`)
- **Checkout page** - `/panel/checkout` with coupon integration, plan summary, billing toggle

**Plan 4 - Post-Contract Dashboards:**
- **Lease types** - Lease, Payment, PaymentMethod, LeaseSummaryStats (`src/lib/types/lease.ts`)
- **Mock leases** - 4 leases with 16 payments (`src/lib/data/mock-leases.ts`)
- **LeaseCard component** - Dual-view for landlord/tenant (`src/components/lease/LeaseCard.tsx`)
- **PaymentHistory component** - Responsive table/cards (`src/components/lease/PaymentHistory.tsx`)
- **PaymentMethodSelector** - Colombian payment methods (`src/components/lease/PaymentMethodSelector.tsx`)
- **Landlord leases page** - `/panel/leases` with stats and payment history
- **Tenant lease dashboard** - `/mi-arriendo` with payment flow
- **Navigation links** - Added lease links to Navbar

**Plan 5 - Insurance Selection (Gap Closure):**
- **Insurance types** - InsurancePolicy, InsuranceCoverage, SelectedInsurance (`src/lib/types/insurance.ts`)
- **Mock insurance** - 3 tiers: none, basic ($45k), premium ($89k) (`src/lib/data/mock-insurance.ts`)
- **InsuranceSelector component** - Policy cards with selection state (`src/components/contract/InsuranceSelector.tsx`)
- **Contract signing integration** - Insurance selector before signature form
- **ContractPreview update** - Shows selected insurance policy details
- **Gap closed** - "Insurance policy options presented during signing"

### What's Complete (Phase 11) - COMPLETE

**Property Publishing Wizard Improvements:**
- **StepPlan component** - NEW plan selection step (step 8) (`src/components/publish/steps/StepPlan.tsx`)
- **Plan options** - Gratis ($0), Propietario ($149,900/mes), Inmobiliaria ($499,900/mes)
- **StepLocation update** - City visual cards, free text neighborhood input
- **StepType update** - Emoji illustrations with Framer Motion animations
- **StepReview update** - Shows selected plan with icon and price
- **PublishSuccess redesign** - Confetti celebration, property summary, auto-redirect
- **PublishContext update** - 9 steps total with plan validation
- **Publish types update** - selectedPlan field added to PropertyDraft

**Dashboard Fixes:**
- **Property scaling** - Fixed grid layout in /panel/propiedades
- **Notification actions** - Made interactive and functional
- **Candidate sidebar** - Fixed scroll issues in CandidateDetail
- **Candidatos page** - Added pagination, improved layout

**Contract Flow Fix:**
- **Fresh start on approve** - Approving candidate goes to step 1 (contract type)
- **Query param support** - Added `?new=true` to force fresh contract state
- **Suspense wrapper** - Fixed useSearchParams SSR issues

**Navigation Updates:**
- **Publicar Inmueble** - Gray background by default
- **Buscar Inmueble** - Plain text link style
- **Precios link** - Restored to navbar

**Dependencies Added:**
- **canvas-confetti** - For success screen celebration effects

### What's Complete (Phases 12-15) — v2.0 Design System & QA Audit

- **Phase 12 - Design Tokens**: Comprehensive token system, Manrope/DM Sans/DM Mono typography
- **Phase 13 - Component Redesign**: Component library updates with new design tokens
- **Phase 14 - QA Functionality & Visual**: Functional and visual QA across all pages
- **Phase 15 - QA Responsive & Accessibility**: Responsive audit, accessibility, contrast & screen reader support

### What's Complete (Phase 16) — Contract UX & Platform QA (2026-02-02)

**Contract Signing Flow Redesign:**
- Redesigned contract page from 3-column (3/6/3) to 2-column (8/4) layout
- Shared horizontal stepper at top for all contract states
- Status banners: indigo for pending states, emerald for active
- Active contracts show read-only view (no stepper, no sidebar)
- "Esperando firma" card with indigo styling + CTA back to property
- Rented property view shows different content (lease info, tenant info, contract details)

**Contract Templates — Colombian Law Compliance:**
- Rewrote all contract templates (basico, amoblado, compartido) with specific Colombian law article references
- 18 common clauses referencing Ley 820/2003, Ley 675/2001, Ley 527/1999, Ley 1581/2012
- Guarantee clause prohibits cash deposits (Art. 16, Ley 820)
- Shared/furnished clauses with specific legal citations

**PDF Generation:**
- Created `src/lib/utils/generate-contract-pdf.ts` using jsPDF
- Full contract PDF with parties, terms, clauses, signature boxes, legal footer
- Download button on active contracts in ContractExpandableItem

**Reminder System:**
- "Recordar" button in ContractExpandableItem for pending tenant signatures
- Loading state, toast confirmation with tenant name/email, 60s cooldown

**QA Audit — General (48 findings fixed):**

Critical (8):
- Dynamic copyright year in Footer
- "Agendar visita" modal with form (was placeholder toast)
- Map section replaced with address + Google Maps link (was "proximamente")
- Terms link to /terminos (was href="#")
- Social links to real placeholder URLs (was href="#")
- Removed console.log from PublishContext and StickyCTA
- Landlord sidebar: unblocked 4 disabled nav items (Propiedades, Candidatos, Mensajes, Config)
- Tenant sidebar: unblocked 3 disabled nav items (Documentos, Mensajes, Config)

Important (13):
- Dark mode: 216 bg-white to bg-card/bg-background across 62+ files
- Dark mode: 435 text-black to text-foreground/text-muted-foreground
- Dark mode: 135 border-black/* to border-border
- Status badge colors in 3 type files to plan-status-* tokens
- Border-radius standardized to rounded-sm in 20+ files
- Navbar logo text-black to text-foreground
- Tenant sidebar mobile menu aria-label added
- Footer legal links (Privacidad, Terminos) now are Link elements
- Newsletter form with validation + toast
- Risk levels to risk-a/b/c/d tokens
- Pricing page dark mode fixes
- Blog pages bg-white to bg-background
- Financial cards bg-indigo-950 preserved (intentional)

Minor (9):
- Notification colors to plan-status tokens
- PRIORITY_STYLES to plan-status tokens
- VISIT_STATUS_COLORS to plan-status tokens
- Section label dots to plan-status tokens
- Sidebar bg-[black] to bg-foreground
- font-mono labels standardized
- Tenant sidebar width w-60 to w-64 (matches landlord)
- Cancel subscription toast with email + timeframe

**QA Audit — Navigation (18 findings fixed):**

Critical (6):
- Created /privacidad page (Ley 1581/2012)
- Created /terminos page (Ley 820/2003, Ley 527/1999)
- Created /ayuda page (FAQ with collapsible sections)
- Fixed LeaseExpandableItem to navigate to correct contract route
- Added Notificaciones + Visitas to landlord sidebar
- Added Notificaciones + Perfil to tenant sidebar

Important (7):
- /mi-arriendo redirect to /inquilino/arriendo
- /mis-aplicaciones redirect to /inquilino/aplicaciones
- Added id="faq" to pricing page for anchor scroll
- Social links to arriendofacil profile URLs
- Mobile back navigation (lg:hidden) on 8 tenant pages
- PlanHeader role guards verified (already correct)

Minor (5):
- "Registrarme" to /auth?mode=register
- Blog added to footer links
- id="main-content" verified on pages
- Perfil verified in tenant sidebar

**Document Preview Modal:**
- Candidate documents now clickable in property detail page
- Modal shows verified status, mock PDF details, download button
- Pending documents show explanation state

**Files Created:**
- `src/lib/utils/generate-contract-pdf.ts`
- `src/app/privacidad/page.tsx`
- `src/app/terminos/page.tsx`
- `src/app/ayuda/page.tsx`

**Dependencies Added:**
- jspdf (PDF generation)

### What's Complete (Inmobiliaria Phase 1) - Dashboard KPIs
- **Route**: `/panel/inmobiliaria` with KPI cards
- **Types**: `src/lib/types/inmobiliaria.ts` - Full type system
- **Mock data**: `src/lib/data/mock-inmobiliaria.ts` - Comprehensive data
- **Dashboard**: Inmobiliaria main page with metrics

### What's Complete (Inmobiliaria Phase 2) - Propietarios
- **PropietarioCard**: Card with owner info, properties, balance
- **PropietarioTable**: Sortable table with search, filters
- **PropietarioForm**: Form for creating/editing owners
- **PropietarioBankInfo**: Bank account display components
- **PropietarioStats**: Statistics component
- **Routes**: `/panel/inmobiliaria/propietarios`, `/panel/inmobiliaria/propietarios/[id]`

### What's Complete (Inmobiliaria Phase 3) - Consignaciones
- **Plan 03-01 COMPLETE**: ConsignacionCard + Lista Consignaciones
  - ConsignacionCard with thumbnail, status, agent/owner info
  - ConsignacionTable with sortable columns
  - ConsignacionFilters with search, dropdowns
  - Portafolio page at `/panel/inmobiliaria/portafolio`
- **Plan 03-02 COMPLETE**: ConsignacionWizard (6-Step New Consignment)
  - PropietarioSelector with search, selection, and inline creation
  - AgenteSelector with workload sorting and recommendations
  - 6 wizard steps: Propietario, Property, Commission, Agent, Inventory, Confirm
  - Step validation and back navigation with data persistence
  - Nueva Consignacion page at `/panel/inmobiliaria/portafolio/nuevo`
- **Plan 03-03 COMPLETE**: Detalle Consignacion + Timeline + ActaEntrega
  - ConsignacionHeader with property info, status badges, actions menu
  - Detail sections: Property, Propietario, Agente, Lease, Documents
  - ActaEntregaView with inventory table and condition badges
  - ConsignacionTimeline with auto-generated events from consignacion data
  - Detail page at `/panel/inmobiliaria/portafolio/[id]`
  - Navigation from portafolio cards and table rows

### What's Complete (Inmobiliaria Phase 4) - Agentes (COMPLETE)
- **Plan 04-01 COMPLETE**: AgenteCard + Lista Agentes
  - AgenteCard with avatar, role/status badges, metrics grid, commission split
  - AgenteTable with sortable columns, responsive layout
  - AgenteFilters with search, role, status, sort dropdowns
  - Agentes page at `/panel/inmobiliaria/agentes`
  - Stats row: Total, Activos, Cierres Mes, Comisiones Mes
  - Card/Table view toggle, pagination
- **Plan 04-02 COMPLETE**: AgenteDetail Page
  - AgenteProfile with contact info, commission split visualization
  - AgenteMetrics with 8 KPI cards (2x4 grid)
  - AgentePropertyList with assigned properties
  - AgentePipeline with active leads
  - Detail page at `/panel/inmobiliaria/agentes/[id]`
- **Plan 04-03 COMPLETE**: Leaderboard, Workload y Asignacion
  - AgenteLeaderboard with ranked table, medals, trend indicators
  - AgenteWorkloadChart with CSS horizontal bar chart
  - AsignacionModal for property reassignment
  - Tabs on agentes page: Equipo, Ranking, Carga de Trabajo

## MVP FRONTEND COMPLETE + ENHANCED

All 10 phases executed successfully. The frontend is fully functional with:
- Property catalog with AI-powered search and interactive map
- Application wizard with 6-step form
- Risk score display with conversational AI explanations
- Landlord dashboard with candidate management
- Tenant application tracking
- Contract generation and signing
- Pricing and subscription management with coupon support
- Lease dashboards with payment tracking
- UX polish (accessibility, animations, responsive)
- Mock authentication with protected routes

**Ready for backend integration and production deployment.**

### What's Complete (Inmobiliaria Phase 5) - Pipeline de Arriendos (COMPLETE)
- **Plan 05-01 COMPLETE**: PipelineCard + PipelineColumn
  - PipelineCard with property, candidate, agente info
  - Days in stage with warning for overdue
  - Stage-colored header from PIPELINE_STAGES
  - PipelineColumn with header, count, drop zone
- **Plan 05-02 COMPLETE**: PipelineFilters + PipelineDetail
  - Filters by agente, property, date range
  - PipelineDetail modal with timeline, notes, actions
- **Plan 05-03 COMPLETE**: PipelineBoard + Pipeline Page
  - @dnd-kit drag-and-drop integration
  - Full Kanban board with all 10 stages
  - Pipeline page at `/panel/inmobiliaria/pipeline`
  - Optimistic stage updates with toast feedback

### What's Complete (Inmobiliaria Phase 6) - Cobros (COMPLETE)
- **Plan 06-01 COMPLETE**: CobroCard + CobroTable + CobroFilters
  - CobroCard with status-colored left border, amount breakdown, tenant info
  - CobroTable with sortable columns, summary row, action menu
  - CobroFilters with month selector, status tabs, property/propietario dropdowns
  - Debounced search, active filter indicator
  - Components exported from barrel
- **Plan 06-02 COMPLETE**: RegistrarPagoModal + MoraAlert + CobroResumen
  - RegistrarPagoModal with full/partial payment support, 6 payment methods
  - MoraAlert with severity levels (warning/critical/severe), pulse animations
  - CobroResumen with stats grid, collection rate progress bar, animated counters
  - Compact variants for tables/dashboards
- **Plan 06-03 COMPLETE**: RecordatorioConfig + CobroDetail + Cobros Page
  - RecordatorioConfig with day selectors, channel toggles, template previews
  - CobroDetail sheet with property/tenant/propietario sections
  - Full Cobros page at `/panel/inmobiliaria/cobros`
  - Month selector, status tabs, table/card view toggle
  - Payment registration with optimistic updates

### What's Complete (Inmobiliaria Phase 7) - Dispersiones (COMPLETE)
- **Plan 07-01 COMPLETE**: DispersionCard + DispersionTable + DispersionFilters
  - DispersionCard with status border, propietario info, amount summary
  - DispersionTable with sortable columns, expandable property items
  - DispersionFilters with month navigation, status tabs, propietario dropdown
  - Components exported from barrel
- **Plan 07-02 COMPLETE**: DispersionDetail + Extracto + Summary
  - ComisionDesglose with property-level commission breakdown table
  - DispersionResumen with monthly stats, progress bar, action buttons
  - ExtractoPropietario with printable owner statement view
  - PDF generation utility for extracto (jsPDF)
  - DispersionDetail sheet with propietario info, bank account, status timeline
  - All components exported from barrel
- **Plan 07-03 COMPLETE**: DispersionWizard + Dispersiones Page
  - DispersionWizard with 6 steps: Mes, Cobros, Comisiones, Netos, Aprobar, Confirmar
  - Dispersiones page at `/panel/inmobiliaria/dispersiones` with filters, table/card views
  - Generar page at `/panel/inmobiliaria/dispersiones/generar` for wizard
  - Month-based cobro grouping by propietario with commission calculation
  - Selection-based approval for batch or individual processing

### What's Complete (Inmobiliaria Phase 8) - Reportes (COMPLETE)
- **Plan 08-01 COMPLETE**: Report Base Components
  - Report types: ReportId, ReportFormat, ReportCategory, ReportFrequency, ReportDefinition
  - Mock reports: MOCK_REPORTS array with 7 report definitions
  - Report generators: generateComisionesAgenteReport, generateOcupacionReport, generateVencimientosReport, generateFlujoCajaReport
  - ReporteFilters with period/zone/category/search/favorites filtering
  - ReporteCard with category colors, format badges, actions (generate/preview/download)
  - ReporteViewer Sheet drawer with specialized preview components
  - All components exported from barrel
- **Plan 08-02 COMPLETE**: Report Visualization Components
  - CarteraEdadesTable: Aging receivables with 30/60/90+ buckets, sortable table, action menus
  - OcupacionChart: CSS-only donut chart, zone stacked bars, chart/cards toggle
  - ComisionesTable: Agent commissions ranking with medals, progress bars vs leader
  - VencimientosTable: Contract expirations with urgency buckets, bulk actions
  - FlujoCajaChart: CSS-only grouped bar chart, period selector, table view
  - OcupacionReport, ComisionesAgenteReport, VencimientosReport, FlujoCajaReport types added
  - All visualization components exported from barrel
- **Plan 08-03 COMPLETE**: Reportes Page & Export
  - ExportButton component with PDF/Excel dropdown, size variants, loading/success states
  - Excel/CSV generation utility with UTF-8 BOM for all report types
  - Reportes page at `/panel/inmobiliaria/reportes` with quick stats, filters, grid/list views
  - Favorites system with localStorage persistence
  - CarteraEdades preview integrated in ReporteViewer
  - All components exported from barrel

### What's Planned (Inmobiliaria Phase 9) - Operaciones
- **Plan 09-01**: RenovacionesTable + Renovacion types + mock data
  - Renovacion types with status workflow (pending → completed)
  - Urgency buckets (0-30, 31-60, 61-90, 90+)
  - Table with filters and actions
- **Plan 09-02**: IPCCalculator + RenovacionWorkflow
  - IPC historical data from DANE
  - Rent calculation based on IPC rate
  - 6-step workflow for renewals
- **Plan 09-03**: MantenimientoList + MantenimientoForm
  - Maintenance request list with filters
  - Form for new requests with photo upload
  - Mock maintenance data
- **Plan 09-04**: CotizacionComparator + MantenimientoViewer + Operaciones Page
  - Quote comparison component
  - Detailed maintenance viewer
  - Operaciones page with tabs at `/panel/inmobiliaria/operaciones`
  - Navigation integration

**Wave structure:**
- Wave 1 (parallel): 09-01, 09-02, 09-03 (independent components)
- Wave 2 (sequential): 09-04 (depends on Wave 1)

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 09-01-PLAN.md (RenovacionesTable)
Resume file: None - Continue with 09-02, 09-03, 09-04
Status: Phase 9 Operaciones IN PROGRESS (1/4 plans complete)

## Backend Integration Status

**Documentation Created:**
- `docs/BACKEND-INTEGRATION.md` - Complete API contract with all endpoints
- `docs/FRONTEND-ARCHITECTURE.md` - Frontend structure and components
- `docs/CHANGELOG.md` - All changes organized by phase

**Backend Must Implement:**
1. Authentication API (email magic link/OTP)
2. Properties CRUD + Publishing
3. Applications CRUD + Risk Scoring Engine
4. Candidates management + Decision actions
5. Contract generation + Signing
6. Leases + Payments
7. Subscriptions + Coupons
8. File storage (images, documents)

See `docs/BACKEND-INTEGRATION.md` for complete API specifications.
