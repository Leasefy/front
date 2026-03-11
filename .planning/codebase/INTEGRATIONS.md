# External Integrations

**Analysis Date:** 2026-01-28

## Current Integration Status

**IMPORTANT:** This is a frontend-only MVP. Most integrations are planned but not yet implemented. The application uses mock data and stub implementations.

## APIs & External Services

### Authentication (Planned - Phase 2)

**Clerk:**
- Status: **Planned, not implemented**
- Environment vars defined but empty:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SECRET`
- Current implementation: Mock auth via `src/lib/auth/auth-context.tsx`
- Mock users defined in `src/lib/data/mock-users.ts`
- Auth stored in localStorage under key `arriendo-facil-auth`

**Mock Auth Credentials:**
```
landlord@example.com / password123
tenant@example.com / password123
propietario@arriendo.co / demo2024
inquilino@arriendo.co / demo2024
```

### File Upload (Planned - Phase 4)

**UploadThing:**
- Status: **Planned, not implemented**
- Environment vars:
  - `UPLOADTHING_SECRET`
  - `UPLOADTHING_APP_ID`
- Image domains configured in `next.config.mjs`:
  - `utfs.io`
  - `uploadthing.com`
- Current: Property images use Unsplash URLs (mock data)

### Background Jobs (Planned - Phase 6)

**Inngest:**
- Status: **Planned, not implemented**
- Environment vars:
  - `INNGEST_EVENT_KEY`
  - `INNGEST_SIGNING_KEY`
- Purpose: Background job processing for AI scoring, notifications

### Maps (Partially Implemented - Phase 9)

**MapLibre GL (Primary):**
- Status: **Implemented with free tiles**
- Package: `maplibre-gl` ^4.7.1
- Wrapper: `react-map-gl/maplibre` ^7.1.7
- No API key required
- Tile provider: CartoCDN (free, no token)
  - Light: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
  - Dark: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
  - Voyager: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`
- Component: `src/components/map/PropertyMap.tsx`
- Clustering: Supercluster 8.0.1

**Mapbox (Available but unused):**
- Package: `mapbox-gl` ^3.18.0 (installed)
- Environment var: `NEXT_PUBLIC_MAPBOX_TOKEN` (empty)
- Status: Available for premium features if needed

## Data Storage

### Database (Planned)

**Neon PostgreSQL:**
- Status: **Schema defined, not connected**
- Connection: `DATABASE_URL` environment variable
- Schema: `prisma/schema.prisma`
- ORM: Prisma ^7.2.0

**Current Implementation:**
- Prisma client stubbed in `src/lib/prisma-stub.ts`
- Enums exported from stub for type compatibility
- All data comes from mock files in `src/lib/data/`

**Database Schema Models:**
- `User` - Syncs with Clerk, has clerkId
- `Property` - Rental listings
- `PropertyImage` - Property photos
- `Application` - Tenant applications (6-step wizard data)
- `RiskScoreResult` - AI scoring output with explainability
- `ApplicationEvent` - State machine audit trail
- `CandidateNote` - Landlord private notes

### File Storage

**Current:** No file storage implemented
**Planned:** UploadThing for document uploads (ID, income proof, etc.)

### Caching

**Current:** None
**Local Storage:**
- Auth state: `arriendo-facil-auth`
- Generic storage utility: `src/lib/utils/storage.ts`

## Authentication & Identity

**Current Mock Implementation:**
```typescript
// src/lib/auth/auth-context.tsx
- React Context-based auth
- localStorage persistence
- Mock credential validation
- Social login stubs (Google, Apple)
```

**User Roles:**
- `tenant` - Property searchers
- `landlord` - Property owners

**Auth Flow:**
1. User submits credentials
2. Validated against `mockUsers` array
3. User object stored in localStorage
4. Auth state available via `useAuth()` hook

## Monitoring & Observability

**Error Tracking:**
- Status: **Not implemented**
- No Sentry, LogRocket, or similar configured

**Logging:**
- Custom logger: `src/lib/utils/logger.ts`
- Console-based, development only
- Specialized loggers: `authLogger` for auth operations

**Analytics:**
- Status: **Not implemented**
- No Google Analytics, Mixpanel, etc.

## CI/CD & Deployment

**Hosting:**
- Vercel (configured)
- Region: iad1 (US East)

**Configuration (`vercel.json`):**
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

**CI Pipeline:**
- Status: **Not configured**
- No GitHub Actions, CircleCI, etc. detected

## Webhooks & Callbacks

**Incoming:**
- `CLERK_WEBHOOK_SECRET` defined (for Clerk user sync - not implemented)
- No webhook endpoints exist in codebase (no `/api` routes found)

**Outgoing:**
- None configured

## API Routes

**Status:** No API routes implemented

The application has no `src/app/api/` directory. All data is served from:
- Mock data files (`src/lib/data/mock-*.ts`)
- Client-side state management

## Environment Configuration

**Required env vars (for full functionality):**
```bash
# Database - Required for backend
DATABASE_URL="postgresql://..."

# Auth - Required for real authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# File Upload - Required for document handling
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""
```

**Optional env vars:**
```bash
# Background Jobs
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# Maps (using free CartoCDN, Mapbox optional)
NEXT_PUBLIC_MAPBOX_TOKEN=""

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Secrets Location:**
- `.env` - Base configuration (committed, no secrets)
- `.env.local` - Local development secrets (gitignored)
- `.env.example` - Template for required variables

## External Image Sources

**Configured in `next.config.mjs`:**
- `utfs.io` - UploadThing storage
- `uploadthing.com` - UploadThing direct
- `placehold.co` - Placeholder images
- `images.unsplash.com` - Mock property photos
- `images.pexels.com` - Additional stock photos

## Integration Readiness Summary

| Integration | Status | Blocking |
|-------------|--------|----------|
| Clerk Auth | Planned | Phase 2 |
| Neon PostgreSQL | Schema ready | Backend dev |
| UploadThing | Planned | Phase 4 |
| Inngest Jobs | Planned | Phase 6 |
| MapLibre | Working | None |
| Mapbox Premium | Available | Token needed |
| Error Tracking | Missing | Recommended |
| Analytics | Missing | Nice to have |

---

*Integration audit: 2026-01-28*
