# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
mvp/
├── prisma/                    # Database schema (Prisma ORM)
│   └── schema.prisma          # PostgreSQL schema definition
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── aplicar/           # Tenant application wizard
│   │   ├── auth/              # Authentication page
│   │   ├── demo/              # Demo/preview pages
│   │   ├── mi-arriendo/       # Tenant active lease view
│   │   ├── mis-aplicaciones/  # Tenant applications list
│   │   ├── panel/             # Landlord dashboard
│   │   ├── pricing/           # Pricing/plans page
│   │   ├── propiedades/       # Property catalog
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── contract/          # Contract signing components
│   │   ├── demo/              # Demo-specific components
│   │   ├── home/              # Home page sections
│   │   ├── landlord/          # Landlord dashboard components
│   │   ├── layout/            # Navbar, Footer
│   │   ├── lease/             # Lease management components
│   │   ├── map/               # MapLibre/Mapbox components
│   │   ├── pricing/           # Pricing page components
│   │   ├── property/          # Property listing components
│   │   ├── providers/         # Context providers (SmoothScroll)
│   │   ├── score/             # Risk score display components
│   │   ├── skeleton/          # Loading skeleton components
│   │   ├── tenant/            # Tenant-specific components
│   │   ├── ui/                # Shadcn/ui primitives
│   │   └── wizard/            # Application wizard components
│   └── lib/                   # Utilities and shared code
│       ├── auth/              # Authentication context and hooks
│       ├── constants/         # Constants and enums
│       ├── context/           # React contexts
│       ├── data/              # Mock data
│       ├── hooks/             # Custom React hooks
│       ├── scoring/           # Scoring algorithms
│       ├── search/            # Search query parsing
│       ├── types/             # TypeScript type definitions
│       ├── utils/             # Utility functions
│       └── validation/        # Form validation
├── .planning/                 # Planning documentation
│   ├── codebase/              # Codebase analysis docs
│   ├── phases/                # Phase implementation docs
│   └── research/              # Research notes
├── claudedocs/                # Claude-generated docs
└── package.json               # Dependencies
```

## Directory Purposes

**`src/app/` (Pages & Routes):**
- Purpose: Next.js App Router pages and layouts
- Contains: `page.tsx`, `layout.tsx` files, route groups
- Key files: `layout.tsx` (root), `panel/layout.tsx` (landlord shell)
- Routing: File-based with dynamic segments like `[propertyId]`

**`src/components/` (UI Components):**
- Purpose: Reusable React components organized by feature
- Contains: Feature-specific folders and shared UI primitives
- Key files: `ui/button.tsx`, `landlord/CandidateCard.tsx`, `property/PropertyCard.tsx`
- Pattern: Feature-based organization (not atomic design)

**`src/components/ui/` (UI Primitives):**
- Purpose: Base UI components from Shadcn/ui
- Contains: Button, Card, Dialog, Input, Select, etc.
- Key files: `button.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx`
- Pattern: Radix UI primitives with Tailwind styling

**`src/lib/` (Utilities & Logic):**
- Purpose: Non-component code - types, utilities, data, hooks
- Contains: TypeScript types, mock data, custom hooks, contexts
- Key files: `utils.ts`, `design-tokens.ts`, `format.ts`

**`src/lib/types/` (Type Definitions):**
- Purpose: TypeScript interfaces for domain models
- Contains: Property, Candidate, Application, RiskScore, etc.
- Key files: `property.ts`, `candidate.ts`, `application.ts`, `landlord.ts`

**`src/lib/data/` (Mock Data):**
- Purpose: Development mock data (frontend-only MVP)
- Contains: Properties, candidates, users, activities, etc.
- Key files: `mock-properties.ts`, `mock-candidates.ts`, `mock-landlord-data.ts`

**`src/lib/context/` (React Contexts):**
- Purpose: Global state management via React Context
- Contains: DecisionContext, ApplicationContext
- Key files: `DecisionContext.tsx`, `ApplicationContext.tsx`

**`src/lib/auth/` (Authentication):**
- Purpose: Mock authentication system
- Contains: AuthContext, useAuth hook, types
- Key files: `auth-context.tsx`, `use-auth.ts`, `types.ts`

**`src/lib/hooks/` (Custom Hooks):**
- Purpose: Reusable stateful logic
- Contains: Property filters, wishlist, map clustering
- Key files: `usePropertyFilters.ts`, `useWishlist.ts`, `useSupercluster.ts`

**`prisma/` (Database Schema):**
- Purpose: Prisma ORM schema for future backend
- Contains: PostgreSQL schema with User, Property, Application models
- Key files: `schema.prisma`
- Status: Defined but not actively connected in MVP

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with providers
- `src/app/page.tsx`: Home page
- `src/app/panel/layout.tsx`: Landlord dashboard shell

**Configuration:**
- `package.json`: Dependencies and scripts
- `tailwind.config.js`: Tailwind configuration
- `tsconfig.json`: TypeScript configuration
- `prisma/schema.prisma`: Database schema

**Core Logic:**
- `src/lib/context/DecisionContext.tsx`: Landlord decision state
- `src/lib/context/ApplicationContext.tsx`: Wizard form state
- `src/lib/auth/auth-context.tsx`: Authentication state
- `src/lib/design-tokens.ts`: Design system constants

**Testing:**
- No test files present (MVP phase)

## Naming Conventions

**Files:**
- Components: PascalCase (`PropertyCard.tsx`, `CandidateDetail.tsx`)
- Hooks: camelCase with `use` prefix (`usePropertyFilters.ts`, `useAuth.ts`)
- Types: kebab-case (`risk-score.ts`, `tenant-application.ts`)
- Data: kebab-case with `mock-` prefix (`mock-properties.ts`)
- Utilities: kebab-case (`coupon-validation.ts`, `storage.ts`)

**Directories:**
- Feature folders: kebab-case (`landlord/`, `wizard/`)
- App routes: kebab-case Spanish (`propiedades/`, `mis-aplicaciones/`)
- Lib subdirs: kebab-case (`types/`, `hooks/`, `data/`)

**Components:**
- Exported as named exports (not default)
- Props interface: `ComponentNameProps`
- Context hooks: `useContextName()` pattern

## Where to Add New Code

**New Feature:**
- Primary code: `src/components/[feature-name]/`
- Types: `src/lib/types/[feature-name].ts`
- Mock data: `src/lib/data/mock-[feature-name].ts`
- Tests: `src/__tests__/` (when testing is added)

**New Page:**
- Route: `src/app/[route-name]/page.tsx`
- Layout (if needed): `src/app/[route-name]/layout.tsx`
- Dynamic segment: `src/app/[route-name]/[paramId]/page.tsx`

**New Component:**
- Feature component: `src/components/[feature]/ComponentName.tsx`
- UI primitive: `src/components/ui/component-name.tsx`
- Skeleton: `src/components/skeleton/ComponentNameSkeleton.tsx`

**New Hook:**
- Custom hook: `src/lib/hooks/useHookName.ts`
- Export from index if grouped

**New Context:**
- Context file: `src/lib/context/FeatureContext.tsx`
- Contains: Provider, hook, types in same file

**Utilities:**
- Shared helper: `src/lib/utils/[purpose].ts`
- Formatters: `src/lib/format.ts`
- Constants: `src/lib/constants/[domain].ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: Shadcn/ui base components
- Generated: Yes (via shadcn CLI)
- Committed: Yes
- Note: Can be customized after generation

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (via npm install)
- Committed: No (gitignored)

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (via next build/dev)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: Project planning documentation
- Generated: No (human/Claude authored)
- Committed: Yes
- Subfolders: `codebase/`, `phases/`, `research/`

**`public/`:**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes
- Contains: Images, icons, fonts

---

*Structure analysis: 2026-01-28*
