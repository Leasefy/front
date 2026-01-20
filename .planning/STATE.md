# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-16)
See: .planning/FRONTEND-VISION.md (created 2026-01-18)

**Core value:** Propietarios toman decisiones informadas sobre inquilinos en minutos con explicabilidad conversacional del scoring AI.
**Current focus:** Phase 9 - Interactive Map

## Current Position

Phase: 9 (Interactive Map) - In Progress
Plan: 1 of 4 complete (Map Foundation)
Status: Plan 01 complete, continuing to Plan 02
Last activity: 2026-01-20 - Completed 09-01-PLAN (Map Foundation)

Progress: ████████████████▒▒▒▒ 87%

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
9. Interactive Map (IN PROGRESS) - Airbnb-style map with price markers and clustering

## Performance Metrics

**Velocity:**
- Total plans completed: 28
- Average duration: 6.1 min
- Total execution time: 2.9 hours

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
| 09-interactive-map | 1/4 | 8min | 8min |

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

### MVP Frontend Complete!

All 8 phases executed successfully. The frontend is fully functional with:
- Property catalog with AI-powered search
- Application wizard with 6-step form
- Risk score display with conversational AI explanations
- Landlord dashboard with candidate management
- Tenant application tracking
- UX polish (accessibility, animations, responsive)
- Mock authentication with protected routes

### What's Complete (Phase 9) - IN PROGRESS

**Plan 1 - Map Foundation:**
- **Property coordinates** - latitude/longitude fields added to Property type
- **Mock data coordinates** - All 16 properties have realistic Colombian coordinates
- **Mapbox dependencies** - react-map-gl 8.1.0, mapbox-gl 3.18.0 installed
- **PropertyMap component** - Basic map with Colombia bounds and fallback
- **Map constants** - Bounds, city coordinates, zoom levels, cluster config

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 09-01-PLAN (Map Foundation)
Resume file: None
Next action: Execute 09-02-PLAN (Price Markers & Clustering)
