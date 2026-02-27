# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.x - Application code, components, utilities, types
- JavaScript (ES2017 target) - Build configuration, Next.js config

**Secondary:**
- CSS - Global styles via Tailwind
- SQL - Prisma schema definitions (PostgreSQL dialect)

## Runtime

**Environment:**
- Node.js (managed via project config, no `.nvmrc` specified)
- Next.js 14.2.21 runtime (App Router)

**Package Manager:**
- npm (primary, based on `package-lock.json`)
- pnpm (also available, based on `pnpm-lock.yaml`)
- Lockfiles: Both npm and pnpm lockfiles present

## Frameworks

**Core:**
- Next.js 14.2.21 - React framework with App Router, RSC support
- React 18.2.0 - UI library
- React DOM 18.2.0 - DOM rendering

**UI/Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS
- Radix UI - Headless component primitives
  - `@radix-ui/react-accordion` ^1.2.12
  - `@radix-ui/react-alert-dialog` ^1.1.15
  - `@radix-ui/react-checkbox` ^1.3.3
  - `@radix-ui/react-dialog` ^1.1.15
  - `@radix-ui/react-dropdown-menu` ^2.1.16
  - `@radix-ui/react-label` ^2.1.8
  - `@radix-ui/react-popover` ^1.1.15
  - `@radix-ui/react-select` ^2.2.6
  - `@radix-ui/react-separator` ^1.1.8
  - `@radix-ui/react-slot` ^1.2.4
  - `@radix-ui/react-tabs` ^1.1.13
  - `@radix-ui/react-tooltip` ^1.2.8
- shadcn/ui - Component system (new-york style, configured in `components.json`)
- tailwindcss-animate 1.0.7 - Animation utilities

**Animation:**
- Framer Motion 12.27.1 - React animation library
- Lenis 1.3.17 - Smooth scroll library

**Forms:**
- react-hook-form 7.71.1 - Form state management

**Notifications:**
- Sonner 2.0.7 - Toast notifications

**Mapping:**
- react-map-gl 7.1.7 - React wrapper for MapLibre
- maplibre-gl 4.7.1 - Map rendering (OSS alternative to Mapbox)
- mapbox-gl 3.18.0 - Map SDK (available but MapLibre used primarily)
- Supercluster 8.0.1 - Marker clustering

**Testing:**
- Not configured - No test framework dependencies found

**Build/Dev:**
- ESLint 8.x with eslint-config-next - Linting
- PostCSS 8.4.32 - CSS processing
- Autoprefixer 10.4.16 - CSS vendor prefixes
- tsx 4.21.0 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- `@prisma/client` ^7.2.0 - Database ORM client (stubbed for frontend-only development)
- `prisma` ^7.2.0 - Prisma CLI and schema tools
- `next` 14.2.21 - Core framework
- `react` ^18.2.0 - Core UI library

**UI Infrastructure:**
- `class-variance-authority` ^0.7.1 - Variant styling utility
- `clsx` ^2.1.1 - Class name utility
- `tailwind-merge` ^3.4.0 - Tailwind class deduplication
- `lucide-react` ^0.562.0 - Icon library

**Utility:**
- `dotenv` ^17.2.3 - Environment variable loading

## Configuration

**Environment:**
- Configuration via `.env`, `.env.local`, `.env.example`
- Key environment variables (from `.env.example`):
  - `DATABASE_URL` - Neon PostgreSQL connection string
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth (planned)
  - `CLERK_SECRET_KEY` - Clerk server secret (planned)
  - `UPLOADTHING_SECRET` - File upload service (planned)
  - `INNGEST_EVENT_KEY` - Background jobs (planned)
  - `NEXT_PUBLIC_MAPBOX_TOKEN` - Map token (optional, using free CartoCDN tiles)

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode: enabled
- Path aliases: `@/*` maps to `./src/*`

**Build:**
- `next.config.mjs` - Image remote patterns configured for:
  - utfs.io (UploadThing)
  - uploadthing.com
  - placehold.co
  - images.unsplash.com
  - images.pexels.com

**Tailwind:**
- Config: `tailwind.config.ts`
- Dark mode: class-based
- Custom colors: CSS variable-based design tokens
- Custom risk level colors: `risk-a`, `risk-b`, `risk-c`, `risk-d`
- Font: Inter via CSS variable `--font-inter`

**Prisma:**
- Config: `prisma.config.ts`
- Schema: `prisma/schema.prisma`
- Provider: PostgreSQL

**UI Components:**
- Config: `components.json` (shadcn/ui)
- Style: new-york
- RSC: enabled
- Icon library: lucide

## Platform Requirements

**Development:**
- Node.js (version not pinned)
- npm or pnpm
- No Docker configuration present

**Production:**
- Vercel deployment configured (`vercel.json`)
- Region: iad1 (US East)
- Security headers: X-Content-Type-Options, X-Frame-Options
- Framework: Next.js (auto-detected)

## Data Fetching Patterns

**Current State:**
- **No React Query/SWR** - Data fetching utilities not installed
- **Mock Data** - Application uses extensive mock data in `src/lib/data/`
- **Local State** - React Context + useState for state management
- **localStorage** - Client-side persistence via custom `StorageManager` class

**State Management:**
- `AuthContext` - Mock authentication state
- Component-level state - useState for UI state
- URL state - Not observed (no query param management library)

---

*Stack analysis: 2026-01-28*
