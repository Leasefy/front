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
  // PermissionsContext.readAgencyIdFromStorage() reads `agencyId` (or
  // `agency.id`) from the localStorage entry so the agent /my-permissions
  // fetch fires even when the Supabase session has not hydrated. Both keys
  // are populated for forward-compatibility with either lookup path.
  agencyId: 'test-agency-id',
  agency: { id: 'test-agency-id', name: 'Test Agency' },
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
 * Wide-open permissions object that grants the synthetic test user every
 * action on every module the panel checks. Mirror of the two backend
 * endpoints `PermissionsContext` consumes:
 *
 *   1. `apiClient.get('/inmobiliaria/agency/my-permissions')`
 *      → returns `MemberPermissionsResponse`. We grant `isAdmin: true` and
 *        `effectivePermissions: 'FULL_ACCESS'` which makes `canAccess`
 *        short-circuit to true for every non-(cobranza|cotizador) module.
 *
 *   2. `fetch(${NEXT_PUBLIC_AGENT_URL}/api/agency/${agencyId}/my-permissions)`
 *      → returns `{ cobranza: string[], cotizador: string[] }`. We grant
 *        every action the panel calls (view/edit/export/manage/…) so the
 *        layout's `canAccess('cobranza', 'view')` gate (and equivalents
 *        on cotizador) all return true.
 *
 * Both endpoints are mocked by `seedAuthState`. Specs do not need to
 * mock them again — but route order is preserved (a per-spec
 * `page.route(...)` registered AFTER `seedAuthState` still takes
 * precedence, so individual specs can override with edge-case responses
 * like 403 / empty lists).
 */
const FULL_AGENCY_PERMISSIONS = {
  isAdmin: true,
  effectivePermissions: 'FULL_ACCESS',
  role: 'ADMIN',
}

const FULL_AGENT_PERMISSIONS = {
  cobranza: ['view', 'edit', 'export', 'manage', 'reveal_pii', 'admin'],
  cotizador: ['view', 'edit', 'export', 'manage', 'admin'],
}

/**
 * Seed Playwright's localStorage AND register route handlers for the two
 * permissions endpoints, so the next `page.goto(...)` lands inside the
 * protected `/panel/inmobiliaria/ai/*` surface AND the per-module
 * `PermissionsContext.canAccess(...)` gate returns true.
 *
 * Without the permissions mocks, the `cobranza/layout.tsx` (and the
 * equivalent cotizador layout) renders a "No tienes acceso" placeholder
 * instead of the page content — so the spec's skeleton/EmptyState/axe
 * locators all return `count === 0`.
 *
 * MUST be awaited BEFORE `page.goto(...)`. `addInitScript` runs on every
 * navigation in the same browser context, and `page.route` is also
 * permanent for the page — so a single call covers reloads and same-spec
 * sub-navigations.
 *
 * Specs that need to override the default permissions response can
 * register `page.route(...)` AFTER `seedAuthState(page)`; Playwright's
 * last-registered-handler-wins semantics apply.
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

  // Mock the legacy backend permissions endpoint (NestJS `apiClient.get`).
  // Globs cover both relative (`/api/inmobiliaria/...`) and absolute
  // (`https://backend.example.com/inmobiliaria/...`) shapes.
  await page.route('**/inmobiliaria/agency/my-permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FULL_AGENCY_PERMISSIONS),
    })
  })

  // Mock the agent-side permissions endpoint that the cobranza/cotizador
  // layouts gate on. The wildcard `agency/*/my-permissions` shape matches
  // both the legacy URL (which we already routed above — Playwright picks
  // the most-specific handler) and the agent_url path.
  await page.route(
    '**/api/agency/*/my-permissions',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_AGENT_PERMISSIONS),
      })
    },
  )

  // Mock the canonical /users/me endpoint so the AuthProvider's INITIAL_SESSION
  // path resolves with a real user even if there's no Supabase session. This
  // gives the auth-context `user` non-null which together with the
  // localStorage fallback makes `effectiveIsAuthenticated` solidly true
  // and lets PermissionsContext hydrate before the layout's isLoading gate
  // resolves. We also include the agency reference so any caller relying
  // on `useAuth().agency.id` works.
  await page.route('**/users/me', async (route) => {
    // Only mock GET. Allow PATCH/PUT/etc. to be re-routed by individual specs.
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: TEST_USER.id,
        email: TEST_USER.email,
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
        role: TEST_USER.backendRole, // backend uses uppercase
        agency: { id: AGENCY_ID, name: 'Test Agency' },
        preferences: { panel_tour_dismissed_v1: true },
      }),
    })
  })

  // Mock the agency-fetch endpoint hit by AuthProvider's `fetchAgency` for
  // agency/agent roles. Without this the agency context is null → some
  // permissions paths still resolve false.
  await page.route('**/inmobiliaria/agency', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: AGENCY_ID,
        name: 'Test Agency',
        memberRole: 'ADMIN',
        memberStatus: 'ACTIVE',
      }),
    })
  })
}

/**
 * Convenience wrapper that seeds + navigates in one call.
 *
 * `waitUntil: 'domcontentloaded'` (not the Playwright default `'load'`)
 * is critical for the panel-a11y suite: every panel page kicks off
 * several agent-backend fetches on mount (cartera, analytics, calls,
 * preferences). When `NEXT_PUBLIC_AGENT_URL` resolves to a host that
 * isn't running or isn't mocked, those requests hang indefinitely and
 * the `'load'` event never fires — so `page.goto(...)` times out at 30s
 * even though the DOM has fully rendered.
 *
 * `'domcontentloaded'` returns as soon as the parser is done, which is
 * after React has hydrated enough for `<EmptyState>` / `<PageSkeleton>`
 * to be visible. Per-spec mocks registered via `page.route(...)` still
 * take effect because they are installed BEFORE this navigation.
 */
export async function gotoAuthenticated(
  page: Page,
  url: string,
): Promise<ReturnType<Page['goto']>> {
  await seedAuthState(page)
  return page.goto(url, { waitUntil: 'domcontentloaded' })
}
