/**
 * Cotizador aseguradoras list — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * D-38-04 EmptyState: "Aún no hay aseguradoras activas" — CTA
 *                      "Contactar soporte" → mailto or /configuracion.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cotizador/aseguradoras'
const ASEGURADORAS_MOCK = '**/aseguradoras/registry**'
const SKELETON_DELAY_MS = 2500

const POPULATED_CARRIERS = [
  {
    carrier: 'sura',
    name: 'Sura',
    active: true,
    approvalRate: 0.85,
    avgPrima: 250_000,
    quotes30d: 42,
  },
  {
    carrier: 'mapfre',
    name: 'Mapfre',
    active: true,
    approvalRate: 0.78,
    avgPrima: 240_000,
    quotes30d: 31,
  },
]

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador aseguradoras — Phase 38-08 axe a11y', () => {
  test('skeleton visible during aseguradoras list load', async ({ page }) => {
    await page.route(ASEGURADORAS_MOCK, async (route) => {
      // Skip detail routes that share the registry root.
      if (/aseguradoras\/registry\/[^/]+/.test(route.request().url())) {
        return route.continue()
      }
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CARRIERS),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('EmptyState when aseguradoras list is empty', async ({ page }) => {
    await page.route(ASEGURADORAS_MOCK, async (route) => {
      if (/aseguradoras\/registry\/[^/]+/.test(route.request().url())) return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated aseguradoras list', async ({ page }) => {
    await page.route(ASEGURADORAS_MOCK, async (route) => {
      if (/aseguradoras\/registry\/[^/]+/.test(route.request().url())) return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_CARRIERS),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
