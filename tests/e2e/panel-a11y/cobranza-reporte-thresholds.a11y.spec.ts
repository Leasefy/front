/**
 * Cobranza reporte/thresholds — axe a11y gate (Phase 38-08, task 38-08-03).
 *
 * Per Phase 38-05a discovery: thresholds always render (defaults seeded
 * server-side on first agency access — Phase 34 D-34-RES). Skeleton + axe
 * only — no EmptyState (38-05a key-decisions §6).
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/cobros/cobranza/reporte/thresholds'
const THRESHOLDS_MOCK = '**/cobranza/daily-report/thresholds**'
const SKELETON_DELAY_MS = 2500

const POPULATED_THRESHOLDS = {
  pkr: { warn: 0.4, alert: 0.3 },
  morosidad: { warn: 0.25, alert: 0.35 },
  outsideHours: { warn: 1, alert: 3 },
  updatedAt: new Date().toISOString(),
  versionId: 'v-1',
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza reporte/thresholds — Phase 38-08 axe a11y', () => {
  test('skeleton visible during thresholds form load', async ({ page }) => {
    await page.route(THRESHOLDS_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_THRESHOLDS),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded thresholds form', async ({ page }) => {
    await page.route(THRESHOLDS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_THRESHOLDS),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
