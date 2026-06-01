/**
 * Cobranza pagos list — axe a11y gate (Phase 38-08, task 38-08-04).
 *
 * D-38-04 EmptyState: "Aún no hay pagos procesados" — CTA "Ver deudores"
 *                      → /panel/inmobiliaria/ai/cobranza/deudores.
 *
 * The pagos list page (PagosFunnelClient, Phase 38-05a) has a hasActiveFilters
 * discriminator: page-level EmptyState fires when zero rows AND no filters.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/pagos'
const PAGOS_MOCK = '**/cobranza/payments**'
const SKELETON_DELAY_MS = 800

const POPULATED_PAGOS = {
  items: [
    {
      id: 'pay-1',
      debtorId: 'test-debtor-id',
      debtorNameMasked: 'J•••n P•••a',
      amount: 1_500_000,
      currency: 'COP',
      provider: 'wompi',
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
  ],
  nextCursor: null,
  generatedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza pagos — Phase 38-08 axe a11y', () => {
  test('skeleton visible during pagos list load', async ({ page }) => {
    await page.route(PAGOS_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_PAGOS),
      })
    })
    await page.goto(ROUTE)
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState when pagos list is empty + no filters', async ({ page }) => {
    await page.route(PAGOS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], nextCursor: null, generatedAt: new Date().toISOString() }),
      })
    })
    await page.goto(ROUTE)
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated pagos list', async ({ page }) => {
    await page.route(PAGOS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_PAGOS),
      })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
