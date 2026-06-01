/**
 * Synthetic auth-state seeder for the Phase 38 panel-a11y suite.
 *
 * BACKGROUND — why this exists
 * ----------------------------
 * Every spec under `tests/e2e/panel-a11y/` mocks the backend at the network
 * layer via `page.route(..., route.fulfill(...))`. Until Phase 38 plan 38-09
 * we believed that calling `page.goto('/panel/inmobiliaria/ai/*')` was being
 * intercepted by a Next.js auth middleware — which is why the previous
 * helper convention (`runAxeOrFixme` in `axe-helpers.ts`) bailed out with
 * `test.fixme(true, 'auth-debt: ...')` whenever no AI-panel surface mounted.
 *
 * Investigation in 2026-06-01 revealed that `src/middleware.ts` is a NO-OP
 * pass-through; the actual gating happens client-side in
 * `src/components/auth/ProtectedRoute.tsx`. That component does two things
 * on mount:
 *
 *   1. Reads `useAuth().user / isAuthenticated` (Supabase-backed context),
 *      AND
 *   2. Reads `localStorage[AUTH_STORAGE_KEY]` as a fallback (lines 49-60).
 *
 * If EITHER of those is populated, `effectiveIsAuthenticated` becomes true
 * and the `<main>` + sidebar mount instead of `router.replace('/auth?...')`.
 *
 * This module exposes `seedAuthState(page)` which uses Playwright's
 * `page.addInitScript(...)` to write the localStorage entries BEFORE the
 * page navigates — so `ProtectedRoute`'s synchronous `useEffect` on line
 * 49 sees the seeded state on first render and never redirects.
 *
 * IMPORTANT — no production code is touched. This is test-infrastructure
 * only. The synthetic user/agency IDs match the constants already used in
 * `axe-helpers.ts` (`AGENCY_ID = 'test-agency-id'`).
 */

import type { Page } from '@playwright/test'

/**
 * The synthetic test user persisted into `localStorage[AUTH_STORAGE_KEY]`.
 *
 * Minimum shape required by `ProtectedRoute.tsx`:
 *   - `role` (line 46) — used by the `allowedRoles` gate at line 126.
 *
 * Extra fields (`id`, `email`, etc.) are included for robustness so any
 * spec that ALSO mocks `/users/me` will keep the same identity across both
 * layers, and any future ProtectedRoute hardening that reads more fields
 * won't silently regress.
 *
 * `role: 'agency'` selects the agency dashboard path (`/panel/inmobiliaria`)
 * — which is the namespace under which every panel-a11y route lives.
 *
 * `onboardingCompleted: true` ensures the tenant-onboarding redirect block
 * (lines 105-117) does not fire. (It only fires for `user` from the
 * context anyway, but defense-in-depth is cheap.)
 */
export const TEST_USER = {
  id: 'test-user-id',
  email: 'test@leasefy.test',
  name: 'Test Agency User',
  firstName: 'Test',
  lastName: 'User',
  role: 'agency' as const,
  backendRole: 'AGENT' as const,
  onboardingCompleted: true,
} as const

/**
 * The agency ID re-exported here so callers don't have to import two
 * helper files for the same identifier. Mirror of `axe-helpers.ts:30`.
 */
export const AGENCY_ID = 'test-agency-id'

/**
 * The localStorage key ProtectedRoute reads (line 8). Locked here so the
 * test suite documents the contract — if production changes the key, this
 * test will fail loudly instead of silently regressing back to auth-debt.
 */
const AUTH_STORAGE_KEY = 'arriendo-facil-auth'

/**
 * Optional second key the route reads on line 95 of ProtectedRoute. Only
 * relevant for `role: 'tenant'` users — agency users skip that branch via
 * `isAgencyUser` (line 105). Setting it anyway is a no-op for agency
 * specs but lets us drop the helper into tenant-facing specs later
 * without rework.
 */
const TENANT_ONBOARDING_KEY = 'plan_onboarding_tenant'

/**
 * Seed Playwright's localStorage so the next `page.goto(...)` lands inside
 * the protected `/panel/inmobiliaria/ai/*` surface instead of redirecting
 * to `/auth?returnUrl=...`.
 *
 * MUST be awaited BEFORE `page.goto(...)`. `addInitScript` runs on every
 * navigation in the same browser context, so a single call covers reloads
 * and same-spec sub-navigations.
 *
 * Typical usage (per-spec):
 *
 *   test.beforeEach(async ({ page }) => {
 *     await seedAuthState(page)
 *   })
 *
 *   test('cobranza overview — populated', async ({ page }) => {
 *     await page.route(OVERVIEW_MOCK, ...)
 *     await page.goto('/panel/inmobiliaria/ai/cobranza')
 *     await expect(page.locator('main')).toBeVisible()
 *   })
 *
 * Inline usage (single test):
 *
 *   await seedAuthState(page)
 *   await page.goto('/panel/inmobiliaria/ai/cobranza')
 */
export async function seedAuthState(page: Page): Promise<void> {
  const payload = JSON.stringify(TEST_USER)
  const tenantPayload = JSON.stringify({ isComplete: true })

  await page.addInitScript(
    ({ authKey, authPayload, tenantKey, tenantPayloadJson }) => {
      try {
        window.localStorage.setItem(authKey, authPayload)
        window.localStorage.setItem(tenantKey, tenantPayloadJson)
      } catch {
        // Cross-origin or storage-disabled context — best-effort.
      }
    },
    {
      authKey: AUTH_STORAGE_KEY,
      authPayload: payload,
      tenantKey: TENANT_ONBOARDING_KEY,
      tenantPayloadJson: tenantPayload,
    },
  )
}

/**
 * Convenience wrapper that seeds + navigates in one call.
 *
 * Equivalent to:
 *
 *   await seedAuthState(page)
 *   await page.goto(url)
 *
 * Returns the same value as `page.goto(...)` for type compatibility with
 * existing call sites that chain `.then(...)`.
 */
export async function gotoAuthenticated(
  page: Page,
  url: string,
): Promise<ReturnType<Page['goto']>> {
  await seedAuthState(page)
  return page.goto(url)
}
