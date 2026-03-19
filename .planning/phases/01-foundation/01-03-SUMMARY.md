---
phase: 01-foundation
plan: 03
subsystem: database
tags: [prisma, postgresql, neon, orm, schema, typescript]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Next.js project with TypeScript
provides:
  - Complete PostgreSQL schema with 7 models
  - Prisma client singleton for database access
  - Type-safe database layer ready for all phases
affects:
  - 01-04 (seed data needs schema)
  - 02-auth (User model syncs with Clerk)
  - 06-scoring (RiskScoreResult model)
  - 09-state-machine (ApplicationEvent model)

# Tech tracking
tech-stack:
  added:
    - prisma@7.2.0
    - "@prisma/client@7.2.0"
    - dotenv (for prisma.config.ts)
  patterns:
    - Prisma client singleton pattern for Next.js
    - COP (Colombian Pesos) as integers for monetary values
    - JSON fields for flexible explainability data
    - Comprehensive indexes for query performance

key-files:
  created:
    - prisma/schema.prisma
    - prisma.config.ts
    - src/lib/db.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use Prisma 7.x with new config format (prisma.config.ts)"
  - "Store all monetary values in COP as integers"
  - "JSON fields for score explainability (subscoresJson, driversJson, flagsJson, conditionsJson)"
  - "Single Application model with all wizard data (not normalized for MVP simplicity)"
  - "Complete schema upfront - supports all 10 phases without modification"

patterns-established:
  - "db.ts singleton: Import as `import { db } from '@/lib/db'`"
  - "Enum exports: Export from db.ts for type-safe usage"
  - "Indexes: Composite index on (city, neighborhood) for property search"

# Metrics
duration: 12min
completed: 2026-01-18
---

# Phase 1 Plan 3: Prisma ORM Initialization Summary

**Complete PostgreSQL schema with 7 models covering all MVP phases, ready for Neon connection**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-18
- **Completed:** 2026-01-18
- **Tasks:** 3/3 completed
- **Files created:** 3
- **Files modified:** 2

## Accomplishments

- Installed Prisma 7.2.0 with PostgreSQL provider
- Created complete schema with 7 models: User, Property, PropertyImage, Application, RiskScoreResult, ApplicationEvent, CandidateNote
- Configured 4 enums: UserRole, PropertyStatus, ApplicationStatus, RiskLevel
- Added performance indexes for common queries
- Created hot-reload-safe Prisma client singleton
- Verified TypeScript recognizes all model types

## Schema Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| User | Syncs with Clerk | clerkId, email, role (TENANT/LANDLORD/BOTH) |
| Property | Listings | priceMonthly (COP), city, neighborhood, status |
| PropertyImage | Photos | url, blurDataUrl, order |
| Application | Tenant applications | 6-step wizard data for scoring |
| RiskScoreResult | AI scoring output | totalScore, level (A/B/C/D), explainability JSON |
| ApplicationEvent | State machine audit | type, fromStatus, toStatus, metadata |
| CandidateNote | Landlord notes | Private notes on applicants |

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Initialize Prisma + Define Schema** - `79b5112`
   - Install prisma and @prisma/client v7.2.0
   - Create complete schema with all 7 models
   - Configure prisma.config.ts for Neon connection
   - Add performance indexes

2. **Task 3: Prisma Client Singleton** - `237d9f8`
   - Create src/lib/db.ts with singleton pattern
   - Export enums for type-safe usage
   - Development logging configuration

## Files Created/Modified

- `prisma/schema.prisma` - Complete database schema (273 lines)
- `prisma.config.ts` - Prisma configuration for Neon connection
- `src/lib/db.ts` - Prisma client singleton with exports
- `package.json` - Added prisma, @prisma/client, dotenv

## Risk Score Explainability Schema

The RiskScoreResult model stores explainability data as JSON:

```typescript
{
  subscoresJson: { financial: 85, stability: 72, employment: 90, references: 65 },
  driversJson: [{ text: "Ingreso estable", impact: "positive", weight: 0.3 }],
  flagsJson: [{ type: "warning", text: "Deuda mensual elevada" }],
  conditionsJson: [{ type: "cosigner", text: "Se recomienda codeudor" }]
}
```

## Decisions Made

1. **Prisma 7.x config format**: Used new `prisma.config.ts` instead of URL in schema (required by Prisma 7.x)
2. **Monetary values as integers**: All COP values stored as Int, not Float (avoids floating point issues)
3. **JSON for flexibility**: Explainability fields use JSON for easy iteration without migrations
4. **Complete schema upfront**: All models defined now, Phase 6 scoring plugs directly in

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7.x config format change**
- **Found during:** Task 1
- **Issue:** Prisma 7.x no longer supports `url = env("DATABASE_URL")` in schema.prisma
- **Fix:** Removed URL from schema, connection handled via prisma.config.ts
- **Files modified:** prisma/schema.prisma
- **Verification:** `npx prisma format` and `npx prisma generate` succeed

## Verification Results

- [x] `npx prisma format` passes (schema valid)
- [x] `npx prisma generate` creates client types
- [ ] `npx prisma db push` - Skipped (DATABASE_URL not configured yet)
- [x] TypeScript recognizes all model types
- [x] Schema includes all required models

## Next Steps

1. User configures DATABASE_URL in .env.local with Neon connection string
2. Run `npx prisma db push` to create tables
3. Plan 04 will create seed data with realistic Colombian test data

## Usage Example

```typescript
import { db, UserRole, PropertyStatus } from '@/lib/db'

// Query properties
const properties = await db.property.findMany({
  where: { status: PropertyStatus.ACTIVE, city: 'Bogota' },
  include: { images: true, owner: true }
})

// Create application
const application = await db.application.create({
  data: {
    applicantId: user.id,
    propertyId: property.id,
    status: 'DRAFT'
  }
})
```
