# Stack Research: Arriendo Facil PropTech Marketplace

**Researched:** 2026-01-16
**Domain:** PropTech Rental Marketplace with Real-time AI Scoring
**Confidence:** HIGH (verified against 2025-2026 sources)

## Executive Summary

- **Use Clerk for authentication** (10K free MAUs, best DX for magic link/OTP, pre-built UI components)
- **Keep Prisma as ORM** (faster type-checking, mature tooling, good for rapid MVP development)
- **Use UploadThing for file uploads** (TypeScript-native, built for Next.js, handles documents + images)
- **Use Neon for database hosting** (Vercel-native integration, serverless scaling, better free tier than Vercel Postgres)
- **Use Inngest for scoring pipeline** (serverless background jobs, built for Vercel, no queue infrastructure)
- **PostgreSQL full-text search is sufficient** for MVP (GIN indexes, no external search service needed)

---

## Core Framework

### Next.js 14+ App Router

**Recommendation:** Use Next.js 14/15 App Router with Server Components as default

**Confidence:** HIGH - Official documentation verified

**Key Patterns:**

1. **Server Components by Default**
   - All components are Server Components unless marked with `'use client'`
   - Use for: data fetching, database queries, sensitive operations
   - Benefits: smaller client bundles, direct database access, better SEO

2. **Client Components (`'use client'`)**
   - Use ONLY when you need: state (`useState`), effects (`useEffect`), event handlers (`onClick`), browser APIs
   - Place `'use client'` at the boundary, not in every file
   - Pattern: Create thin client wrapper components that receive server data as props

3. **Server Actions for Mutations**
   - Use Server Actions for form submissions and CRUD operations
   - Benefits: single network roundtrip, automatic revalidation, no separate API routes needed
   - 63% of Next.js developers already using Server Actions in production (Vercel 2025 Survey)

4. **API Routes for External Integrations**
   - Keep API routes (`route.ts`) for: webhooks, external API consumption, non-form mutations
   - Pattern: Server Actions for internal mutations, API Routes for external interfaces

**Project Structure:**
```
src/
├── app/
│   ├── (auth)/                    # Route group for auth pages
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (tenant)/                  # Route group for tenant flows
│   │   ├── catalog/page.tsx
│   │   ├── property/[id]/page.tsx
│   │   └── applications/page.tsx
│   ├── (landlord)/                # Route group for landlord flows
│   │   ├── properties/page.tsx
│   │   └── candidates/page.tsx
│   ├── api/
│   │   └── webhooks/              # External webhook handlers
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   └── features/                  # Feature-specific components
├── lib/
│   ├── db/                        # Prisma client, queries
│   ├── actions/                   # Server Actions
│   └── scoring/                   # Scoring engine modules
└── types/
```

**Caching Strategy for Property Listings:**
```typescript
// Use unstable_cache for database queries (moving to 'use cache' in Next.js 15+)
import { unstable_cache } from 'next/cache'

const getCachedProperties = unstable_cache(
  async (filters) => {
    return await db.property.findMany({ where: filters })
  },
  ['properties'],
  { revalidate: 60, tags: ['properties'] } // Revalidate every 60s
)

// Revalidate on property update via Server Action
import { revalidateTag } from 'next/cache'
export async function updateProperty(id: string, data: PropertyData) {
  await db.property.update({ where: { id }, data })
  revalidateTag('properties')
}
```

**Image Optimization:**
```typescript
// Use next/image with blur placeholder
import Image from 'next/image'

// For remote images, configure remotePatterns in next.config.js
<Image
  src={property.imageUrl}
  width={800}
  height={600}
  alt={property.title}
  placeholder="blur"
  blurDataURL={property.blurDataUrl} // Generate at upload time
  priority={isAboveFold}
/>
```

**Sources:**
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Caching Guide](https://nextjs.org/docs/app/guides/caching)
- [Server Actions vs API Routes Analysis](https://medium.com/@devFemzy/day-13-api-routes-vs-route-handlers-vs-server-actions-14ad2d61af2c)

---

## Authentication

### Recommendation: Clerk

**Confidence:** HIGH - Multiple 2025 sources verified

**Why Clerk over NextAuth/Supabase Auth:**

| Factor | Clerk | NextAuth.js | Supabase Auth |
|--------|-------|-------------|---------------|
| **Setup Time** | 1-3 days | 2-5 days | 2-4 days |
| **Magic Link/OTP** | Built-in (OTP on paid) | Magic link only, custom OTP | Both built-in |
| **Pre-built UI** | Yes, customizable | Build your own | Limited |
| **Free Tier** | 10,000 MAUs | Unlimited (self-hosted) | 50,000 MAUs |
| **Multi-role Support** | Organizations, roles | Custom implementation | RLS-based |
| **Compliance** | SOC 2 Type II, HIPAA optional | Self-managed | SOC 2 on Team |

**Key Decision Factors:**

1. **Developer Experience:** Clerk's SDK is purpose-built for Next.js App Router with React Server Components support
2. **Pre-built Components:** `<SignIn />`, `<SignUp />`, `<UserButton />` save weeks of UI development
3. **OTP Support:** Magic link free, OTP on paid plans (you'll likely need paid anyway for production)
4. **Role Management:** Built-in organizations and roles for tenant/landlord distinction

**Implementation Pattern:**
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/applications(.*)',
  '/properties/manage(.*)',
  '/candidates(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

// Server Component
import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const user = await currentUser()
  // user.publicMetadata.role for tenant/landlord distinction
}
```

**Webhook Sync Pattern:**
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const payload = await req.json()
  const headerPayload = await headers()

  // Verify webhook
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  const evt = wh.verify(JSON.stringify(payload), {
    'svix-id': headerPayload.get('svix-id')!,
    'svix-timestamp': headerPayload.get('svix-timestamp')!,
    'svix-signature': headerPayload.get('svix-signature')!,
  }) as WebhookEvent

  // Sync to database
  if (evt.type === 'user.created') {
    await db.user.create({
      data: {
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        name: `${evt.data.first_name} ${evt.data.last_name}`,
      }
    })
  }
}
```

**Alternatives Considered:**
- **NextAuth.js:** Better for full control/self-hosting, but requires building all UI and custom OTP implementation
- **Supabase Auth:** Good if you commit to full Supabase stack, but you're using Prisma + separate DB

**Sources:**
- [Clerk vs Supabase Auth vs NextAuth Production Reality](https://medium.com/better-dev-nextjs-react/clerk-vs-supabase-auth-vs-nextauth-js-the-production-reality-nobody-tells-you-a4b8f0993e1b)
- [Clerk Complete Authentication Guide for Next.js](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)
- [Authentication in Next.js Ultimate Guide](https://medium.com/@annasaaddev/authentication-in-next-js-the-ultimate-2024-guide-nextauth-vs-clerk-vs-supabase-415ff7d841c5)

---

## Database & ORM

### Recommendation: Keep Prisma + PostgreSQL (with Neon hosting)

**Confidence:** HIGH - Benchmarks and ecosystem analysis verified

**Why Prisma over Drizzle for this MVP:**

| Factor | Prisma | Drizzle |
|--------|--------|---------|
| **Type-check Speed** | 72% faster (code generation) | Slower (runtime inference) |
| **Learning Curve** | Lower (schema-first) | Higher (code-first, SQL knowledge) |
| **Tooling** | Prisma Studio, Accelerate, Migrate | Drizzle Studio, Kit |
| **IDE Performance** | Better with many models | Can lag with 100+ tables |
| **Serverless** | Good (with Accelerate) | Excellent (lighter weight) |

**Key Decision Factors:**

1. **MVP Speed:** Prisma's schema-first approach with generated types accelerates development
2. **Team Familiarity:** PROJECT.md already specifies Prisma
3. **Studio:** Prisma Studio for quick data inspection during development
4. **Migration Path:** Can migrate to Drizzle later if performance becomes critical

**Schema Patterns for Property Search:**
```prisma
// schema.prisma
model Property {
  id            String   @id @default(cuid())
  title         String
  description   String
  city          String
  neighborhood  String
  priceMonthly  Int

  // Full-text search
  searchVector  Unsupported("tsvector")?

  @@index([city, neighborhood])
  @@index([priceMonthly])
}

// For PostgreSQL full-text search, add raw SQL migration:
// ALTER TABLE "Property" ADD COLUMN "searchVector" tsvector
//   GENERATED ALWAYS AS (
//     setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
//     setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
//     setweight(to_tsvector('spanish', coalesce(neighborhood, '')), 'C')
//   ) STORED;
// CREATE INDEX property_search_idx ON "Property" USING GIN ("searchVector");
```

**Full-Text Search Query:**
```typescript
// lib/db/queries/properties.ts
export async function searchProperties(query: string, filters: PropertyFilters) {
  return await prisma.$queryRaw`
    SELECT * FROM "Property"
    WHERE "searchVector" @@ plainto_tsquery('spanish', ${query})
    AND "city" = ${filters.city}
    AND "priceMonthly" BETWEEN ${filters.minPrice} AND ${filters.maxPrice}
    ORDER BY ts_rank("searchVector", plainto_tsquery('spanish', ${query})) DESC
    LIMIT 20
  `
}
```

**Why PostgreSQL Full-Text Search is Sufficient:**
- GIN indexes provide 4ms query performance (down from 200ms without index)
- No external service needed for MVP
- Data immediately searchable on commit
- Upgrade path: Add Meilisearch when UX becomes growth lever

**Sources:**
- [Drizzle vs Prisma 2025 Comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Prisma ORM Type-Checking Performance](https://www.prisma.io/blog/why-prisma-orm-checks-types-faster-than-drizzle)
- [PostgreSQL Full-Text Search vs Elasticsearch](https://neon.com/blog/postgres-full-text-search-vs-elasticsearch)

---

## Database Hosting

### Recommendation: Neon

**Confidence:** HIGH - Vercel integration and pricing verified

**Why Neon over Vercel Postgres/Supabase:**

| Factor | Neon | Vercel Postgres | Supabase |
|--------|------|-----------------|----------|
| **Reality** | Native product | Powered by Neon | Different product |
| **Free Tier** | 0.5GB storage, 190 hours compute | Same (it IS Neon) | 500MB, always-on |
| **Serverless** | True scale-to-zero | True scale-to-zero | Always-on compute |
| **Cold Starts** | 500ms-3s | Same | None (always on) |
| **Branching** | Yes (instant) | No | No |
| **Prisma Support** | Native | Native | Native |

**Key Decision Factors:**

1. **Vercel Integration:** Neon is what Vercel uses internally for Vercel Postgres
2. **Database Branching:** Create instant database copies for preview deployments
3. **Scale to Zero:** Perfect for MVP with variable traffic
4. **Prisma Accelerate:** Use for connection pooling if cold starts become an issue

**Configuration:**
```typescript
// lib/db/index.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

```env
# .env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Connection Pooling (if needed):**
```env
# Use Prisma Accelerate or Neon's pooler for high concurrency
DATABASE_URL="postgresql://user:pass@ep-xxx.pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Sources:**
- [Neon vs Supabase Comparison](https://www.bytebase.com/blog/neon-vs-supabase/)
- [Vercel Database Comparison](https://hrekov.com/blog/vercel-vs-supabase-database-comparison)
- [Prisma Deploy to Vercel Edge](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-vercel)

---

## File Upload & Storage

### Recommendation: UploadThing

**Confidence:** HIGH - Documentation and DX verified

**Why UploadThing over Cloudinary/S3:**

| Factor | UploadThing | Cloudinary | S3 |
|--------|-------------|------------|-----|
| **TypeScript DX** | Native, type-safe | SDK available | SDK available |
| **Setup Time** | Minutes | Hours | Hours |
| **Next.js Integration** | Purpose-built | Good | Manual |
| **Document Upload** | Yes | Media-focused | Yes |
| **Image Processing** | Basic | Excellent | None |
| **Free Tier** | 2GB, 200 uploads | 25 credits | Pay-as-you-go |

**Key Decision Factors:**

1. **TypeScript Native:** Full type safety from route definition to client hooks
2. **Document + Image Support:** Handles both tenant documents (PDF, images) and property photos
3. **Server Authorization:** Route handlers on your server, not client-side
4. **No S3 Configuration:** Managed storage, no bucket policies or CORS

**Implementation Pattern:**
```typescript
// lib/uploadthing.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { currentUser } from '@clerk/nextjs/server'

const f = createUploadthing()

export const uploadRouter = {
  // Property images (landlord)
  propertyImage: f({ image: { maxFileSize: '4MB', maxFileCount: 10 } })
    .middleware(async () => {
      const user = await currentUser()
      if (!user) throw new Error('Unauthorized')
      return { userId: user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Generate blur placeholder for next/image
      const blurDataUrl = await generateBlurDataUrl(file.url)
      return { url: file.url, blurDataUrl }
    }),

  // Tenant documents
  tenantDocument: f({
    pdf: { maxFileSize: '8MB' },
    image: { maxFileSize: '4MB' }
  })
    .middleware(async () => {
      const user = await currentUser()
      if (!user) throw new Error('Unauthorized')
      return { userId: user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, type: file.type }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter
```

```typescript
// components/PropertyImageUpload.tsx
'use client'
import { UploadButton } from '@uploadthing/react'
import type { OurFileRouter } from '@/lib/uploadthing'

export function PropertyImageUpload({ onUpload }: { onUpload: (urls: string[]) => void }) {
  return (
    <UploadButton<OurFileRouter, 'propertyImage'>
      endpoint="propertyImage"
      onClientUploadComplete={(res) => {
        onUpload(res.map(r => r.url))
      }}
    />
  )
}
```

**Migration Path to S3:**
If you outgrow UploadThing's free tier, you can:
1. Use UploadThing's S3 backend option (they support custom S3 buckets)
2. Migrate to direct S3 with the same file structure

**Sources:**
- [UploadThing Documentation](https://docs.uploadthing.com/)
- [UploadThing vs S3 Analysis](https://medium.com/@abdullah_95/uploadthing-exploring-an-alternative-to-the-aws-s3-bucket-37f35260933a)
- [Next.js File Upload Comparison](https://github.com/imvinojanv/nextjs-s3-file-upload)

---

## UI Components & Forms

### Recommendation: shadcn/ui + React Hook Form + TanStack Table

**Confidence:** HIGH - Official documentation verified

**Component Strategy:**

| Use Case | Solution |
|----------|----------|
| **Base UI** | shadcn/ui (Tailwind-based, accessible) |
| **Forms** | React Hook Form + Zod + shadcn Form |
| **Multi-step Wizard** | Custom with Zustand persist |
| **Data Tables** | TanStack Table + shadcn Table |
| **Property Cards** | Custom shadcn Card variants |

**Multi-Step Application Wizard Pattern:**
```typescript
// store/application-form.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ApplicationFormState {
  step: number
  data: {
    identity: IdentityData | null
    employment: EmploymentData | null
    finances: FinancesData | null
    references: ReferencesData | null
  }
  setStep: (step: number) => void
  updateData: <K extends keyof ApplicationFormState['data']>(
    key: K,
    value: ApplicationFormState['data'][K]
  ) => void
  reset: () => void
}

export const useApplicationForm = create<ApplicationFormState>()(
  persist(
    (set) => ({
      step: 0,
      data: { identity: null, employment: null, finances: null, references: null },
      setStep: (step) => set({ step }),
      updateData: (key, value) => set((state) => ({
        data: { ...state.data, [key]: value }
      })),
      reset: () => set({ step: 0, data: { identity: null, employment: null, finances: null, references: null } }),
    }),
    { name: 'application-form' } // localStorage key
  )
)
```

```typescript
// components/application/IdentityStep.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField } from '@/components/ui/form'
import { identitySchema, IdentityData } from '@/lib/schemas/application'
import { useApplicationForm } from '@/store/application-form'

export function IdentityStep() {
  const { data, updateData, setStep } = useApplicationForm()

  const form = useForm<IdentityData>({
    resolver: zodResolver(identitySchema),
    defaultValues: data.identity ?? undefined,
  })

  const onSubmit = (values: IdentityData) => {
    updateData('identity', values)
    setStep(1) // Move to next step
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
        <Button type="submit">Continuar</Button>
      </form>
    </Form>
  )
}
```

**Candidate Ranking Table Pattern:**
```typescript
// components/candidates/CandidatesTable.tsx
'use client'
import { ColumnDef, useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const columns: ColumnDef<CandidateWithScore>[] = [
  {
    accessorKey: 'applicant.name',
    header: 'Candidato',
  },
  {
    accessorKey: 'riskScore.level',
    header: 'Nivel',
    cell: ({ row }) => {
      const level = row.getValue('riskScore.level') as string
      const variants = { A: 'success', B: 'success', C: 'warning', D: 'destructive' }
      return <Badge variant={variants[level]}>{level}</Badge>
    },
  },
  {
    accessorKey: 'riskScore.totalScore',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => `${row.getValue('riskScore.totalScore')}/100`,
  },
  {
    accessorKey: 'rentToIncomeRatio',
    header: 'Canon/Ingreso',
    cell: ({ row }) => `${(row.getValue('rentToIncomeRatio') * 100).toFixed(0)}%`,
  },
]
```

**Sources:**
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)
- [React Hook Form Multi-Step Tutorial](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps)
- [shadcn Form Documentation](https://ui.shadcn.com/docs/components/form)

---

## Scoring Pipeline Architecture

### Recommendation: Inngest for Background Jobs

**Confidence:** HIGH - Vercel integration verified

**Why Inngest over alternatives:**

| Factor | Inngest | Trigger.dev | BullMQ |
|--------|---------|-------------|--------|
| **Serverless Native** | Yes | Yes | No (needs Redis) |
| **Vercel Integration** | First-class | Good | Manual |
| **Setup Complexity** | Minimal | Moderate | High |
| **Queue Management** | Automatic | Automatic | Manual |
| **Free Tier** | 5,000 events/month | 1,000 tasks/month | Self-hosted |

**Key Decision Factors:**

1. **No Infrastructure:** No Redis, no queue management, no workers to deploy
2. **Vercel Native:** Runs on your existing Vercel functions
3. **Automatic Retries:** Built-in retry logic with dead letter queue
4. **Event-Driven:** Perfect for "application submitted" triggers scoring

**Scoring Pipeline Architecture:**
```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'arriendo-facil' })
```

```typescript
// lib/inngest/functions/score-application.ts
import { inngest } from '../client'
import { featureBuilder } from '@/lib/scoring/feature-builder'
import { integrityEngine } from '@/lib/scoring/integrity-engine'
import { financialModel } from '@/lib/scoring/financial-model'
import { stabilityModel } from '@/lib/scoring/stability-model'
import { historyModel } from '@/lib/scoring/history-model'
import { aggregator } from '@/lib/scoring/aggregator'

export const scoreApplication = inngest.createFunction(
  { id: 'score-application', retries: 3 },
  { event: 'application/submitted' },
  async ({ event, step }) => {
    const { applicationId } = event.data

    // Step 1: Extract features
    const features = await step.run('extract-features', async () => {
      const application = await getApplicationWithProfile(applicationId)
      return featureBuilder.extract(application)
    })

    // Step 2: Run scoring models in parallel
    const [integrityScore, financialScore, stabilityScore, historyScore] = await Promise.all([
      step.run('integrity-check', () => integrityEngine.score(features)),
      step.run('financial-analysis', () => financialModel.score(features)),
      step.run('stability-analysis', () => stabilityModel.score(features)),
      step.run('history-analysis', () => historyModel.score(features)),
    ])

    // Step 3: Aggregate scores
    const result = await step.run('aggregate-scores', () => {
      return aggregator.calculate({
        integrity: integrityScore,     // 25%
        financial: financialScore,     // 35%
        stability: stabilityScore,     // 25%
        history: historyScore,         // 15%
      })
    })

    // Step 4: Persist result
    await step.run('persist-result', async () => {
      await db.riskScoreResult.create({
        data: {
          applicationId,
          totalScore: result.totalScore,
          level: result.level,
          recommendation: result.recommendation,
          subscoresJson: result.subscores,
          driversJson: result.drivers,
          flagsJson: result.flags,
          conditionsJson: result.suggestedConditions,
        }
      })

      // Update application status
      await db.application.update({
        where: { id: applicationId },
        data: { status: 'UNDER_REVIEW' }
      })
    })

    return { success: true, applicationId, level: result.level }
  }
)
```

```typescript
// lib/actions/applications.ts
'use server'
import { inngest } from '@/lib/inngest/client'
import { revalidateTag } from 'next/cache'

export async function submitApplication(applicationId: string) {
  // Update to SUBMITTED
  await db.application.update({
    where: { id: applicationId },
    data: { status: 'SUBMITTED', submittedAt: new Date() }
  })

  // Trigger scoring pipeline
  await inngest.send({
    name: 'application/submitted',
    data: { applicationId }
  })

  revalidateTag('applications')
  return { success: true }
}
```

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { scoreApplication } from '@/lib/inngest/functions/score-application'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scoreApplication],
})
```

**Alternative for Synchronous Scoring:**
If scoring is fast enough (<10 seconds), you can run it synchronously in Server Action:
```typescript
export async function submitAndScore(applicationId: string) {
  const result = await runScoringPipeline(applicationId)
  return result
}
```

**Sources:**
- [Inngest Background Jobs Documentation](https://www.inngest.com/docs/guides/background-jobs)
- [Inngest with Next.js on Vercel](https://www.inngest.com/blog/run-nextjs-functions-in-the-background)
- [Background Jobs with Real-time Updates](https://www.inngest.com/blog/background-jobs-realtime-nextjs)

---

## Deployment & Infrastructure

### Vercel Configuration

**Confidence:** HIGH - Official documentation verified

**Deployment Strategy:**

1. **Production:** Main branch auto-deploys
2. **Preview:** PR branches get preview URLs with database branches (Neon)
3. **Edge Functions:** Use for geolocation (Colombian cities), auth checks

**Edge vs Serverless Functions:**

| Use Case | Runtime | Why |
|----------|---------|-----|
| **Middleware Auth** | Edge | Fast auth checks globally |
| **Property API** | Serverless | Database queries need Node.js |
| **Scoring Pipeline** | Serverless | Heavy computation, Prisma |
| **Geolocation** | Edge | Access to geo headers |

**Middleware Configuration:**
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/applications(.*)', '/candidates(.*)'])
const isLandlordRoute = createRouteMatcher(['/properties/manage(.*)', '/candidates(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Protect routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // Add geo data for analytics
  const geo = req.geo
  const response = NextResponse.next()
  if (geo?.city) {
    response.headers.set('x-user-city', geo.city)
  }
  return response
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

**Environment Variables:**
```env
# Database (Neon)
DATABASE_URL="postgresql://..."

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# File Upload (UploadThing)
UPLOADTHING_SECRET="sk_..."
UPLOADTHING_APP_ID="..."

# Background Jobs (Inngest)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
```

**Vercel Limitations to Know:**
- Edge Runtime: 4MB bundle limit, no native Node.js APIs
- Serverless: 50MB unzipped, 10s default timeout (configurable)
- Middleware: Runs before cache, keep lightweight

**Sources:**
- [Vercel Edge Functions](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- [Vercel Edge Explained](https://upstash.com/blog/vercel-edge)

---

## What NOT to Use

### Technologies to Avoid and Why

| Technology | Why Avoid | Use Instead |
|------------|-----------|-------------|
| **Drizzle ORM** | Slower type-checking, steeper learning curve for MVP pace | Prisma (reconsider at scale) |
| **Supabase Auth** | Overkill unless using full Supabase stack | Clerk |
| **NextAuth.js v4** | Legacy, requires custom UI, no OTP | Clerk or Auth.js v5 |
| **Elasticsearch** | Infrastructure overhead, overkill for MVP | PostgreSQL FTS |
| **BullMQ** | Requires Redis, operational complexity | Inngest |
| **Cloudinary** | Expensive at scale, media-focused | UploadThing (or Cloudinary for heavy image processing later) |
| **Vercel Postgres** | Same as Neon but less flexible | Neon directly |
| **tRPC** | Adds complexity for internal-only API | Server Actions |
| **Redux** | Overkill for this app's state needs | Zustand + React Query |

### Anti-Patterns to Avoid

1. **Don't use `'use client'` everywhere**
   - Start with Server Components, add `'use client'` only where needed
   - Wrong: Every page marked as client component
   - Right: Thin client wrappers receiving server data as props

2. **Don't create API routes for everything**
   - Use Server Actions for mutations
   - API routes only for webhooks and external integrations

3. **Don't cache everything**
   - Property listings: Cache with 60s revalidation
   - User-specific data: Don't cache (or very short TTL)
   - Scoring results: Cache per application

4. **Don't run scoring synchronously if it's slow**
   - If scoring takes >3s, use Inngest background job
   - Show "Processing" state to user, update via polling or webhooks

---

## Integration Patterns

### How Components Work Together

```
User Flow: Tenant Application Submission

1. [Clerk Auth] User logs in via magic link
2. [Next.js] Server Component loads property details from cache
3. [shadcn/ui] Multi-step form wizard with Zustand persistence
4. [UploadThing] Documents uploaded, URLs stored
5. [Server Action] Form submitted, triggers Inngest event
6. [Inngest] Background job runs scoring pipeline
7. [Prisma/Neon] Results persisted
8. [Next.js] Cache invalidated, UI updates
```

```
User Flow: Landlord Viewing Candidates

1. [Clerk Auth] Landlord logs in, role verified
2. [Next.js] Server Component fetches candidates with scores
3. [Prisma] Query with risk score join, sorted by fit
4. [TanStack Table] Renders sortable, filterable table
5. [Server Action] Landlord takes action (approve/reject)
6. [Inngest] Notification event triggered
```

**Data Flow Diagram:**
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Clerk     │ ───▶ │  Next.js    │ ───▶ │   Prisma    │
│   Auth      │      │  App Router │      │   + Neon    │
└─────────────┘      └─────────────┘      └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Inngest    │
                    │  Scoring    │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ UploadThing │
                    │   Storage   │
                    └─────────────┘
```

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| **Next.js Patterns** | HIGH | Official docs + 2025 community consensus |
| **Clerk Auth** | HIGH | Multiple 2025 comparisons, clear winner for DX |
| **Prisma ORM** | HIGH | Type-checking benchmarks, mature ecosystem |
| **Neon Database** | HIGH | Vercel integration, pricing verified |
| **UploadThing** | HIGH | TypeScript-native, Next.js purpose-built |
| **Inngest** | HIGH | Serverless-native, Vercel documentation |
| **PostgreSQL FTS** | MEDIUM | Good for MVP, may need Meilisearch at scale |
| **shadcn/ui Patterns** | HIGH | Official docs, active community |
| **Vercel Edge** | MEDIUM | Recent changes (June 2025), verify current docs |

---

## Sources

### Primary (HIGH Confidence)
- [Next.js Official Documentation](https://nextjs.org/docs)
- [Clerk Authentication Guide](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)
- [Prisma vs Drizzle Benchmarks](https://www.prisma.io/blog/why-prisma-orm-checks-types-faster-than-drizzle)
- [UploadThing Documentation](https://docs.uploadthing.com/)
- [Inngest Documentation](https://www.inngest.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### Secondary (MEDIUM Confidence)
- [Neon vs Supabase Comparison](https://www.bytebase.com/blog/neon-vs-supabase/)
- [PostgreSQL Full-Text Search Analysis](https://neon.com/blog/postgres-full-text-search-vs-elasticsearch)
- [Server Actions vs API Routes](https://medium.com/@devFemzy/day-13-api-routes-vs-route-handlers-vs-server-actions-14ad2d61af2c)
- [Vercel Edge Functions Update](https://upstash.com/blog/vercel-edge)

### Tertiary (LOW Confidence - Validate)
- Medium articles without official verification
- Community discussions on GitHub

---

## Open Questions

1. **Clerk Pricing:** Verify 10K MAU free tier is sufficient for MVP validation phase
2. **Inngest Free Tier:** 5,000 events/month - estimate if sufficient based on expected applications
3. **Neon Cold Starts:** Test cold start latency in production; consider Prisma Accelerate if problematic
4. **UploadThing Limits:** 2GB storage - monitor during MVP, plan S3 migration path

---

*Research valid until: 2026-02-16 (30 days - stack moves fast)*
