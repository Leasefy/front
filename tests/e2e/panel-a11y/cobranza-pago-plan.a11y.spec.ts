/**
 * Cobranza pago plan (payment plan approval) — axe a11y gate
 * (Phase 38-08, task 38-08-04).
 * Detail/dynamic-route per D-38-04: skeleton + axe only.
 *
 * Phase 38-05a preserved data-testid=plan-skeleton wrapper.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const PLAN_ID = 'test-plan-id'
const ROUTE = `/panel/inmobiliaria/cobros/cobranza/pagos/planes/${PLAN_ID}`
const PLAN_MOCK = `**/cobranza/payment-plans/${PLAN_ID}**`
const SKELETON_DELAY_MS = 2500

const POPULATED_PLAN = {
  id: PLAN_ID,
  debtorId: 'test-debtor-id',
  debtorNameMasked: 'J•••n P•••a',
  installments: 3,
  installmentAmount: 500_000,
  totalAmount: 1_500_000,
  status: 'pending',
  startDate: new Date().toISOString(),
  proposedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza pago plan — Phase 38-08 axe a11y', () => {
  test('skeleton visible during plan detail load', async ({ page }) => {
    await page.route(PLAN_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_PLAN),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator(
      '[data-testid="plan-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded plan detail', async ({ page }) => {
    await page.route(PLAN_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_PLAN),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
