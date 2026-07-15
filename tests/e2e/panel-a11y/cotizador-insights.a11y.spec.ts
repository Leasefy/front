/**
 * Cotizador insights — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * SampleDataWatermark page per D-38-04 + Phase 35 pattern: no page-level
 * EmptyState (per-widget watermark handles "data exists but below threshold").
 * Skeleton + axe only.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cotizador/insights'
const INSIGHTS_MOCK = '**/cotizador/insights/**'
const SKELETON_DELAY_MS = 2500

const INSIGHTS_STUB = { populated: false, rows: [], reason: 'insufficient' }

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador insights — Phase 38-08 axe a11y', () => {
  test('skeleton visible during insights load', async ({ page }) => {
    await page.route(INSIGHTS_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(INSIGHTS_STUB),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded insights (incl. watermarks)', async ({ page }) => {
    await page.route(INSIGHTS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(INSIGHTS_STUB),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
