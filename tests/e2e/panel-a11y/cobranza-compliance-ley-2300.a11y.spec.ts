/**
 * Cobranza compliance/ley-2300 — axe a11y gate (Phase 38-08, task 38-08-03).
 * D-38-04 EmptyState: "Sin infracciones Ley 2300 detectadas" — no CTA.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/compliance/ley-2300'
const LEY_MOCK = '**/compliance/ley-2300**'
const SKELETON_DELAY_MS = 2500

const POPULATED_LEY_2300 = {
  summary: { contactsLast7d: 14, violationsLast7d: 1 },
  violations: [
    {
      id: 'v-1',
      debtorId: 'test-debtor-id',
      kind: 'frequency-limit',
      detectedAt: new Date().toISOString(),
    },
  ],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza compliance/ley-2300 — Phase 38-08 axe a11y', () => {
  test('skeleton visible during Ley 2300 load', async ({ page }) => {
    await page.route(LEY_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_LEY_2300),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('EmptyState when Ley 2300 has no violations', async ({ page }) => {
    await page.route(LEY_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: { violationsLast7d: 0 }, violations: [] }),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated Ley 2300', async ({ page }) => {
    await page.route(LEY_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_LEY_2300),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
