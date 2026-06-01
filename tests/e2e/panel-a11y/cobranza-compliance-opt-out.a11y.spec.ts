/**
 * Cobranza compliance/opt-out — axe a11y gate (Phase 38-08, task 38-08-03).
 * D-38-04 EmptyState: "Sin deudores en opt-out" — no CTA.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/compliance/opt-out'
const OPT_OUT_MOCK = '**/compliance/opt-out**'
const SKELETON_DELAY_MS = 800

const POPULATED_OPT_OUT = {
  items: [
    {
      id: 'opt-1',
      debtorId: 'test-debtor-id',
      cedula_masked: '12•••78',
      requestedAt: new Date().toISOString(),
      channel: 'whatsapp',
    },
  ],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza compliance/opt-out — Phase 38-08 axe a11y', () => {
  test('skeleton visible during opt-out list load', async ({ page }) => {
    await page.route(OPT_OUT_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_OPT_OUT),
      })
    })
    await page.goto(ROUTE)
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState when opt-out list is empty', async ({ page }) => {
    await page.route(OPT_OUT_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    })
    await page.goto(ROUTE)
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated opt-out list', async ({ page }) => {
    await page.route(OPT_OUT_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_OPT_OUT),
      })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
