/**
 * Cotizador carrier SLA — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * D-38-04 EmptyState: "Aún no hay datos de SLA" — no CTA.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const CARRIER = 'sura'
const ROUTE = `/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER}/sla`
const SLA_MOCK = `**/aseguradoras/registry/${CARRIER}/sla**`
const SKELETON_DELAY_MS = 800

const POPULATED_SLA = {
  carrier: CARRIER,
  rangeDays: 30,
  metrics: {
    p50ResponseHours: 4,
    p95ResponseHours: 24,
    approvalAvgHours: 18,
    rejectAvgHours: 36,
  },
  series: [
    { date: '2026-05-01', responseHours: 5, approvalRate: 0.86 },
    { date: '2026-05-02', responseHours: 3, approvalRate: 0.91 },
  ],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador carrier SLA — Phase 38-08 axe a11y', () => {
  test('skeleton visible during SLA load', async ({ page }) => {
    await page.route(SLA_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_SLA),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState when SLA has no data', async ({ page }) => {
    await page.route(SLA_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          carrier: CARRIER,
          rangeDays: 30,
          metrics: null,
          series: [],
        }),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated SLA', async ({ page }) => {
    await page.route(SLA_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_SLA),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
