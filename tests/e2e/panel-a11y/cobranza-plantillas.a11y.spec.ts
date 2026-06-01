/**
 * Cobranza plantillas (script templates) list — axe a11y gate
 * (Phase 38-08, task 38-08-03).
 *
 * D-38-04 EmptyState: "Estás usando plantillas por defecto" — CTA
 *                      "Crear plantilla".
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/plantillas'
const TEMPLATES_MOCK = '**/script-templates**'
const SKELETON_DELAY_MS = 800

const POPULATED_TEMPLATES = [
  {
    id: 'tpl-s0',
    name: 'Script S0 — primer contacto',
    stage: 'S0',
    channel: 'phone',
    status: 'published',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-s1',
    name: 'Script S1 — seguimiento',
    stage: 'S1',
    channel: 'phone',
    status: 'draft',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza plantillas — Phase 38-08 axe a11y', () => {
  test('skeleton visible during plantillas list load', async ({ page }) => {
    await page.route(TEMPLATES_MOCK, async (route) => {
      // Skip detail GETs that share the same root.
      if (/script-templates\/[^/]+$/.test(route.request().url())) {
        return route.continue()
      }
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_TEMPLATES),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState when plantillas list is empty', async ({ page }) => {
    await page.route(TEMPLATES_MOCK, async (route) => {
      if (/script-templates\/[^/]+$/.test(route.request().url())) return route.continue()
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

  test('zero axe violations on populated plantillas list', async ({ page }) => {
    await page.route(TEMPLATES_MOCK, async (route) => {
      if (/script-templates\/[^/]+$/.test(route.request().url())) return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_TEMPLATES),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
