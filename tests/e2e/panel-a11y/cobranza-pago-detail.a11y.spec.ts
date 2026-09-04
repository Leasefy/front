/**
 * Cobranza pago detail — axe a11y gate (Phase 38-08, task 38-08-04).
 * Detail/dynamic-route per D-38-04: skeleton + axe only.
 *
 * Phase 38-05a wrapped this page in a Suspense boundary with
 * <PageSkeleton variant="detail"/> fallback.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const PAYMENT_ID = 'test-payment-id'
const ROUTE = `/panel/inmobiliaria/cobros/cobranza/pagos/${PAYMENT_ID}`
const DETAIL_MOCK = `**/cobranza/payments/${PAYMENT_ID}**`
const SKELETON_DELAY_MS = 2500

const POPULATED_PAGO = {
  id: PAYMENT_ID,
  debtorId: 'test-debtor-id',
  debtorNameMasked: 'J•••n P•••a',
  amount: 1_500_000,
  currency: 'COP',
  provider: 'wompi',
  status: 'completed',
  reference: 'WO-12345',
  receiptUrl: null,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  events: [],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza pago detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during pago detail load', async ({ page }) => {
    await page.route(DETAIL_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_PAGO),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded pago detail', async ({ page }) => {
    await page.route(DETAIL_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_PAGO),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
