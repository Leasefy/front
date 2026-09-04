/**
 * Cobranza compliance overview — axe a11y gate (Phase 38-08, task 38-08-03).
 * D-38-04 EmptyState: "Sin alertas de compliance" — no CTA.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/cobros/cobranza/compliance'
const COMPLIANCE_MOCK = '**/cobranza/compliance**'
const SKELETON_DELAY_MS = 2500

const POPULATED_COMPLIANCE = {
  summary: { activeAlerts: 2, t323Adherence: 0.97, ley2300Violations: 0 },
  alerts: [
    {
      id: 'alert-1',
      kind: 'after-hours-call',
      severity: 'medium',
      debtorId: 'test-debtor-id',
      createdAt: new Date().toISOString(),
    },
  ],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza compliance — Phase 38-08 axe a11y', () => {
  test('skeleton visible during compliance overview load', async ({ page }) => {
    await page.route(COMPLIANCE_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_COMPLIANCE),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('EmptyState when compliance has no alerts', async ({ page }) => {
    await page.route(COMPLIANCE_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: { activeAlerts: 0 }, alerts: [] }),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated compliance overview', async ({ page }) => {
    await page.route(COMPLIANCE_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_COMPLIANCE),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
