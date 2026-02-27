# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

**Mock Data Throughout Application:**
- Issue: 13+ mock data files provide all application data instead of real API calls
- Files:
  - `src/lib/data/mock-properties.ts` (581 lines)
  - `src/lib/data/mock-candidates.ts` (1086 lines)
  - `src/lib/data/mock-contracts.ts` (510 lines)
  - `src/lib/data/mock-leases.ts` (449 lines)
  - `src/lib/data/mock-subscriptions.ts` (415 lines)
  - `src/lib/data/mock-tenant-applications.ts` (292 lines)
  - `src/lib/data/mock-dashboard.ts` (290 lines)
  - `src/lib/data/mock-activity.ts`
  - `src/lib/data/mock-coupons.ts`
  - `src/lib/data/mock-insurance.ts`
  - `src/lib/data/mock-landlord-data.ts`
  - `src/lib/data/mock-users.ts`
  - `src/lib/data/mock-explanations.ts`
- Impact: All features work only with static data; no persistence across sessions except localStorage
- Fix approach: Create API routes under `src/app/api/` that connect to Prisma/database, replace mock imports with fetch calls or React Query hooks

**Mock Authentication System:**
- Issue: Authentication uses hardcoded users with plaintext passwords stored in mock data
- Files:
  - `src/lib/auth/auth-context.tsx` (187 lines)
  - `src/lib/data/mock-users.ts` (72 lines)
  - `src/lib/auth/types.ts`
- Impact: No real authentication, anyone can "login" as any predefined user; localStorage-based persistence is easily bypassed
- Fix approach: Integrate Clerk authentication per `.env.example` configuration; env vars already defined (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)

**Prisma Stub Instead of Real Database:**
- Issue: Prisma client is stubbed with dummy implementation that logs warnings
- Files:
  - `src/lib/prisma-stub.ts` (60 lines)
  - `src/lib/db.ts`
- Impact: Database operations do nothing; schema exists but is not used
- Fix approach: Run `npx prisma generate` with DATABASE_URL configured, remove prisma-stub.ts, update imports to use `@prisma/client`

**No API Routes:**
- Issue: Zero API routes exist in `src/app/api/`
- Files: N/A (no files found)
- Impact: Frontend cannot communicate with backend; all data is client-side mock
- Fix approach: Create API routes for CRUD operations on properties, applications, contracts, users

**localStorage as Primary Data Store:**
- Issue: All state persistence relies on localStorage
- Files:
  - `src/lib/context/ApplicationContext.tsx` (568 lines)
  - `src/lib/context/DecisionContext.tsx`
  - `src/lib/context/TenantApplicationContext.tsx`
  - `src/lib/context/UserProfileContext.tsx`
  - `src/lib/hooks/useWishlist.ts`
  - `src/lib/utils/storage.ts`
- Impact: Data lost on browser clear; no cross-device sync; limited storage capacity
- Fix approach: Replace localStorage persistence with API calls; use localStorage only for caching

## Known Bugs

**Social Login Returns Static User:**
- Symptoms: Google/Apple login always returns first tenant user regardless of actual account
- Files: `src/lib/auth/auth-context.tsx` (lines 130-166)
- Trigger: Click "Login with Google" or "Login with Apple"
- Workaround: None - behavior is intentional mock

**Registration Doesn't Persist:**
- Symptoms: New user registration works in session but user is lost on page reload
- Files: `src/lib/auth/auth-context.tsx` (lines 90-128)
- Trigger: Register new account, refresh page, attempt login
- Workaround: Use predefined mock users only

## Security Considerations

**Plaintext Passwords in Source Code:**
- Risk: Mock user credentials visible in repository
- Files: `src/lib/data/mock-users.ts` (lines 15, 23, 31, 39)
- Current mitigation: None - passwords are `password123` and `demo2024`
- Recommendations: Remove before production; implement proper authentication with Clerk

**No Input Sanitization for localStorage:**
- Risk: XSS potential if malicious data stored/retrieved from localStorage
- Files: `src/lib/utils/storage.ts`
- Current mitigation: JSON.parse/stringify provides minimal protection
- Recommendations: Add validation layer; sanitize data on retrieval

**No CSRF Protection:**
- Risk: Form submissions vulnerable to cross-site request forgery
- Files: All form components in `src/components/wizard/steps/`
- Current mitigation: None (mock backend doesn't process real requests)
- Recommendations: Add CSRF tokens when implementing real API routes

**No Rate Limiting:**
- Risk: Authentication endpoints could be brute-forced
- Files: `src/lib/auth/auth-context.tsx`
- Current mitigation: None (mock system has no real security needs)
- Recommendations: Implement rate limiting on authentication API routes

## Performance Bottlenecks

**Large Mock Data Files:**
- Problem: Mock data files bundled into client JavaScript
- Files:
  - `src/lib/data/mock-candidates.ts` (1086 lines)
  - `src/lib/seed-data.ts` (1388 lines)
  - `src/lib/data/mock-properties.ts` (581 lines)
- Cause: Direct imports in page components include entire mock datasets
- Improvement path: Move data to API routes; implement pagination; lazy load data

**No Data Pagination:**
- Problem: All properties/candidates loaded at once
- Files:
  - `src/app/propiedades/page.tsx` (imports all mockProperties)
  - `src/app/panel/page.tsx` (imports all landlord data)
- Cause: Mock data architecture doesn't support pagination
- Improvement path: Implement cursor-based pagination in API routes

**Simulated Loading States:**
- Problem: Fake loading delays instead of real async operations
- Files: `src/app/propiedades/page.tsx` (lines 31-34)
- Cause: `setTimeout(() => setIsInitialLoading(false), 600)` creates artificial delay
- Improvement path: Remove fake delays; implement real loading states tied to data fetching

## Fragile Areas

**Application Wizard Context:**
- Files: `src/lib/context/ApplicationContext.tsx` (568 lines)
- Why fragile: Manages complex multi-step form state with localStorage sync; any localStorage corruption breaks the entire flow
- Safe modification: Add error boundaries; implement state recovery mechanism
- Test coverage: No tests found

**Decision Context State:**
- Files: `src/lib/context/DecisionContext.tsx`
- Why fragile: Tracks landlord decisions across sessions; merges localStorage with runtime state
- Safe modification: Add state validation; implement conflict resolution for stale data
- Test coverage: No tests found

**Mock Data Interdependencies:**
- Files: `src/lib/data/mock-landlord-data.ts` (imports from mock-properties, mock-candidates)
- Why fragile: Mock files reference each other by ID; changing IDs breaks associations
- Safe modification: Verify all ID references before changing mock data
- Test coverage: No tests found

## Scaling Limits

**localStorage Quota:**
- Current capacity: ~5MB per origin (browser limit)
- Limit: Large applications with many saved states will hit quota
- Scaling path: Move to IndexedDB for client-side; database for persistent storage

**Mock Data Arrays:**
- Current capacity: ~12 candidates, ~15 properties, 3 contracts
- Limit: Performance degrades with hundreds/thousands of records
- Scaling path: Implement database with proper indexing; add pagination APIs

## Dependencies at Risk

**Next.js 14.2.21:**
- Risk: Next.js 15 has breaking changes; version pinned to 14.x
- Impact: Will require migration effort for App Router changes
- Migration plan: Review Next.js 15 migration guide; update when stable

**Prisma 7.2.0:**
- Risk: Not actually in use (stubbed); version may be outdated when implemented
- Impact: Schema and client may need updates
- Migration plan: Run `prisma generate` and test migrations before production

## Missing Critical Features

**Real Backend Integration:**
- Problem: No server-side data processing
- Blocks: Production deployment, real user accounts, data persistence

**Payment Processing:**
- Problem: Checkout flow exists but no payment gateway integration
- Blocks: Subscription monetization

**File Upload Storage:**
- Problem: Document upload in wizard captures files but doesn't persist them
- Files: `src/components/wizard/DocumentUpload.tsx` (line 83: "Mock upload process")
- Blocks: Application document verification

**Email Notifications:**
- Problem: No email service integration
- Blocks: Application status updates, contract signing notifications

**Search/Filter API:**
- Problem: Property filtering is client-side only
- Files: `src/lib/hooks/usePropertyFilters.ts`
- Blocks: Scalable search across large property datasets

## Test Coverage Gaps

**No Test Files Present:**
- What's not tested: Entire application
- Files: No `*.test.ts`, `*.spec.ts`, or `__tests__/` directories found
- Risk: Regressions go unnoticed; refactoring is risky
- Priority: High

**Critical Untested Areas:**
- Application wizard flow (`src/components/wizard/`)
- Authentication context (`src/lib/auth/`)
- Decision management (`src/lib/context/DecisionContext.tsx`)
- Form validation (`src/lib/validation/applicationValidation.ts`)
- Risk: Business logic changes could break core user flows
- Priority: High

**Components Without Unit Tests:**
- What's not tested: All 80+ components
- Files: `src/components/**/*.tsx`
- Risk: UI regressions, accessibility issues
- Priority: Medium

---

*Concerns audit: 2026-01-28*
