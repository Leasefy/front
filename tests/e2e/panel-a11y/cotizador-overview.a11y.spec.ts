/**
 * Cotizador overview — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * D-38-04 EmptyState: "Aún no hay cotizaciones" — CTA "Nueva cotización"
 *                      → /panel/inmobiliaria/ai/cotizador/nueva.
 *
 * Reuses the Phase 38-04b mock contract from cotizador-skeletons.spec.ts.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cotizador'
const OVERVIEW_MOCK = '**/cotizador/overview'
const SKELETON_DELAY_MS = 2500

const POPULATED_OVERVIEW = {
  kpis: { quotesToday: 3, approvalRate: 0.85, primaPromedio: 250_000, costPerQuote: 1_200 },
  lastQuotes: [
    {
      id: 'q-1',
      cedula_masked: '12•••78',
      canon: 2_000_000,
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
  ],
  carriers: [
    { carrier: 'sura', status: 'active', approvalRate: 0.85 },
    { carrier: 'mapfre', status: 'active', approvalRate: 0.78 },
  ],
  generatedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador overview — Phase 38-08 axe a11y', () => {
  test('skeleton visible during overview load', async ({ page }) => {
    await page.route(OVERVIEW_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_OVERVIEW),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator(
      '[data-testid="cotizador-overview-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('EmptyState when no quotes (mergedQuotes empty)', async ({ page }) => {
    await page.route(OVERVIEW_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: { quotesToday: 0, approvalRate: 0, primaPromedio: 0, costPerQuote: 0 },
          lastQuotes: [],
          carriers: [],
          generatedAt: new Date().toISOString(),
        }),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated cotizador overview', async ({ page }) => {
    await page.route(OVERVIEW_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_OVERVIEW),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
