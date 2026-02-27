# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Feature-Based Architecture with Context-Driven State Management

**Key Characteristics:**
- Next.js 14 App Router with file-based routing
- Feature-based component organization (landlord, tenant, property, wizard, etc.)
- React Context for cross-cutting state (Auth, Decisions, Application)
- Mock data layer with localStorage persistence (frontend-only MVP)
- Design token system for consistent UI styling
- Prisma schema defined but not actively connected (prepared for backend)

## Layers

**Presentation Layer:**
- Purpose: UI rendering and user interaction
- Location: `src/components/`
- Contains: Feature components, UI primitives, layout components
- Depends on: Contexts, hooks, types, utilities
- Used by: Page components in `src/app/`

**Page Layer (Routes):**
- Purpose: Route handling and page composition
- Location: `src/app/`
- Contains: Page components, layouts, route handlers
- Depends on: Components, contexts, data layer
- Used by: Next.js routing system

**State Management Layer:**
- Purpose: Global and feature-specific state
- Location: `src/lib/context/`
- Contains: React Context providers (AuthContext, DecisionContext, ApplicationContext)
- Depends on: Types, utilities, storage
- Used by: Components via hooks (useAuth, useDecisions, useApplication)

**Data Layer:**
- Purpose: Mock data and data access functions
- Location: `src/lib/data/`
- Contains: Mock data arrays, getter functions
- Depends on: Types
- Used by: Pages, components

**Type Definitions:**
- Purpose: TypeScript interfaces and types
- Location: `src/lib/types/`
- Contains: Domain models (Property, Candidate, Application, etc.)
- Depends on: Nothing
- Used by: All other layers

**Utilities:**
- Purpose: Shared helper functions
- Location: `src/lib/utils/`, `src/lib/hooks/`
- Contains: Storage manager, logger, formatters, custom hooks
- Depends on: Types
- Used by: Components, contexts

## Data Flow

**Property Browse Flow:**

1. User navigates to `/propiedades`
2. Page loads `mockProperties` from `src/lib/data/mock-properties.ts`
3. `usePropertyFilters` hook manages filter state
4. `FilterBar` component updates filter state
5. `PropertyGrid` receives filtered properties via props
6. `PropertyCard` renders individual property with link to detail

**Application Wizard Flow:**

1. User navigates to `/aplicar/[propertyId]`
2. `ApplicationProvider` context wraps wizard content
3. `ApplicationContext` loads/saves state to localStorage
4. Step components (`StepPersonal`, `StepEmployment`, etc.) read/write via `useApplication()`
5. `WizardShell` handles navigation and validation
6. On submit, application status changes to 'submitted'

**Landlord Decision Flow:**

1. Landlord navigates to `/panel/[propertyId]`
2. Page loads property and candidates from mock data
3. `DecisionProvider` context wraps dashboard content (via `src/app/panel/layout.tsx`)
4. `CandidateCard` displays candidate with decision buttons
5. Decisions stored in `DecisionContext` and persisted to localStorage
6. Status badges update reactively across all candidate views

**State Management:**
- **AuthContext**: User authentication state, login/logout methods
- **DecisionContext**: Landlord decisions on candidates (approve/reject/pre-approve)
- **ApplicationContext**: Tenant application wizard state with step-by-step persistence

## Key Abstractions

**Property:**
- Purpose: Rental property listing
- Examples: `src/lib/types/property.ts`, `src/lib/data/mock-properties.ts`
- Pattern: TypeScript interface with mock data implementation

**Candidate:**
- Purpose: Tenant applicant with risk score
- Examples: `src/lib/types/candidate.ts`, `src/lib/types/landlord.ts`
- Pattern: Dual types - detailed `Candidate` and landlord-view `LandlordCandidate`

**Application:**
- Purpose: Tenant's application to rent a property
- Examples: `src/lib/types/application.ts`, `src/lib/context/ApplicationContext.tsx`
- Pattern: Multi-step wizard with section-based data structure

**RiskScore:**
- Purpose: AI-generated tenant qualification score
- Examples: `src/lib/types/risk-score.ts`, `src/components/score/`
- Pattern: Score levels (A/B/C/D) with explainability (drivers, flags, conditions)

**StorageManager:**
- Purpose: Type-safe localStorage abstraction
- Examples: `src/lib/utils/storage.ts`
- Pattern: Generic class with error handling and callbacks

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page load
- Responsibilities: HTML structure, fonts, AuthProvider, SmoothScroll

**Panel Layout (Landlord Dashboard):**
- Location: `src/app/panel/layout.tsx`
- Triggers: All `/panel/*` routes
- Responsibilities: ProtectedRoute wrapper, DecisionProvider, sidebar, toast notifications

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: Root URL `/`
- Responsibilities: Marketing landing page composition

**Properties Page:**
- Location: `src/app/propiedades/page.tsx`
- Triggers: `/propiedades` route
- Responsibilities: Property listing with filters and map

**Application Wizard:**
- Location: `src/app/aplicar/[propertyId]/page.tsx`
- Triggers: `/aplicar/[propertyId]` route
- Responsibilities: Multi-step application form with ApplicationProvider

**Landlord Dashboard:**
- Location: `src/app/panel/page.tsx`
- Triggers: `/panel` route
- Responsibilities: Property overview, KPIs, activity feed

## Error Handling

**Strategy:** Graceful degradation with user-friendly messages

**Patterns:**
- Context providers catch localStorage errors silently, log to console
- Pages check for missing data and render "not found" states
- Form validation shows inline errors with missing field lists
- Protected routes redirect unauthenticated users to `/auth`

## Cross-Cutting Concerns

**Logging:**
- `src/lib/utils/logger.ts` provides `authLogger`, `contextLogger`
- Console-based with context prefixes
- Environment-aware (can be silenced in production)

**Validation:**
- `src/lib/validation/applicationValidation.ts` for wizard steps
- Step-by-step validation with field-specific error messages
- Validation triggered on "Next" button click (not real-time)

**Authentication:**
- `src/lib/auth/auth-context.tsx` provides mock authentication
- `ProtectedRoute` component guards landlord pages
- Role-based access (tenant vs landlord)
- localStorage persistence of auth state

**Design Consistency:**
- `src/lib/design-tokens.ts` defines borders, shadows, spacing, transitions
- Components import tokens for consistent styling
- Tailwind CSS with custom theme values

---

*Architecture analysis: 2026-01-28*
