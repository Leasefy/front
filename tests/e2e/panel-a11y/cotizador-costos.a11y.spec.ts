/**
 * Cotizador costos — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * SampleDataWatermark page per D-38-04 + Phase 35 pattern: no page-level
 * EmptyState. Skeleton + axe only.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cotizador/costos'
const COSTOS_MOCK = '**/cotizador/costos/**'
const SKELETON_DELAY_MS = 2500

const COSTOS_STUB = { populated: false, rows: [], reason: 'insufficient' }

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador costos — Phase 38-08 axe a11y', () => {
  test('skeleton visible during costos load', async ({ page }) => {
    await page.route(COSTOS_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COSTOS_STUB),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded costos (incl. watermarks)', async ({ page }) => {
    await page.route(COSTOS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COSTOS_STUB),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
