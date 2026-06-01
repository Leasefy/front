/**
 * Cotizador carrier detail — axe a11y gate (Phase 38-08, task 38-08-05).
 * Detail/dynamic-route per D-38-04: skeleton + axe only.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const CARRIER = 'sura'
const ROUTE = `/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER}`
const CARRIER_MOCK = `**/aseguradoras/registry/${CARRIER}**`
const SKELETON_DELAY_MS = 800

const POPULATED_CARRIER = {
  carrier: CARRIER,
  name: 'Sura',
  active: true,
  approvalRate: 0.85,
  avgPrima: 250_000,
  quotes30d: 42,
  approved30d: 35,
  rejected30d: 5,
  pending30d: 2,
  productMatrix: [],
  policies: [],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador carrier detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during carrier detail load', async ({ page }) => {
    await page.route(CARRIER_MOCK, async (route) => {
      // Skip the SLA sub-resource.
      if (route.request().url().includes('/sla')) return route.continue()
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CARRIER),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('zero axe violations on loaded carrier detail', async ({ page }) => {
    await page.route(CARRIER_MOCK, async (route) => {
      if (route.request().url().includes('/sla')) return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CARRIER),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
