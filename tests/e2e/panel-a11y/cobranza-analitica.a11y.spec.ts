/**
 * Cobranza analitica — axe-core a11y gate (Phase 38-08, plan task 38-08-01).
 *
 * Three assertions per D-38-01 + D-38-12. Two-tier gate per Phase 37 D-37-05:
 *   - calls_30d < 5  → page-level EmptyState (gate-empty branch)
 *   - calls_30d ≥ 5 → real widgets render, axe scan on real surface.
 *
 * Mock contract mirrors mvp/tests/e2e/cobranza-analitica.spec.ts (Phase 37):
 * 6 analytics endpoints mocked at once via mockAllAnalyticsEndpoints helper
 * (inlined here).
 *
 * D-38-04 EmptyState CTA: "Ir a deudores" → /panel/inmobiliaria/ai/cobranza/deudores
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/analitica'
const SKELETON_DELAY_MS = 800

const GATE_POPULATED = { populated: true, calls_30d: 50 }
const GATE_EMPTY = { populated: false, calls_30d: 2 }
const STUB = { populated: false, rows: [], reason: 'insufficient' }

async function mockAllAnalyticsEndpoints(
  page: import('@playwright/test').Page,
  gate: typeof GATE_POPULATED | typeof GATE_EMPTY = GATE_POPULATED,
  delay = 0,
): Promise<void> {
  const respond = async (route: import('@playwright/test').Route, body: unknown) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }
  await page.route('**/cobranza/analytics/agency-gate', (route) => respond(route, gate))
  await page.route('**/cobranza/analytics/recovery-rate', (route) => respond(route, STUB))
  await page.route('**/cobranza/analytics/top-objections', (route) => respond(route, { ...STUB, objections: [] }))
  await page.route('**/cobranza/analytics/cadence', (route) =>
    respond(route, { populated: false, channelMix: { populated: false, rows: [] }, heatmap: { populated: false, cells: [] } }),
  )
  await page.route('**/cobranza/analytics/cost-per-peso', (route) =>
    respond(route, { populated: false, cost_per_peso: null, sparkline_90d: [] }),
  )
  await page.route('**/cobranza/analytics/top-scripts', (route) =>
    respond(route, { populated: false, reason: 'schema_pending', rows: [] }),
  )
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza analitica — Phase 38-08 axe a11y', () => {
  test('skeleton or aria-busy visible during initial load', async ({ page }) => {
    await mockAllAnalyticsEndpoints(page, GATE_POPULATED, SKELETON_DELAY_MS)
    await page.goto(ROUTE)

    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')



    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState renders on gate-empty (calls_30d < 5)', async ({ page }) => {
    await mockAllAnalyticsEndpoints(page, GATE_EMPTY, 0)
    await page.goto(ROUTE)

    const empty = page.locator('[role="status"].border-dashed').first()



    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations (critical/serious) on populated analitica', async ({ page }) => {
    await mockAllAnalyticsEndpoints(page, GATE_POPULATED, 0)
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await runAndAssertAxe(page)
  })
})
