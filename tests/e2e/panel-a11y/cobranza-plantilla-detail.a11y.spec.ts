/**
 * Cobranza plantilla detail — axe a11y gate (Phase 38-08, task 38-08-03).
 * Detail/dynamic-route page per D-38-04: no page-level EmptyState. Skeleton +
 * axe only.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const TPL_ID = 'test-tpl-id'
const ROUTE = `/panel/inmobiliaria/ai/cobranza/plantillas/${TPL_ID}`
const DETAIL_MOCK = `**/script-templates/${TPL_ID}**`
const SKELETON_DELAY_MS = 2500

const POPULATED_TPL_DETAIL = {
  id: TPL_ID,
  name: 'Script de prueba',
  stage: 'S1',
  channel: 'phone',
  status: 'draft',
  isDefault: false,
  systemPrompt: 'Eres Andrea de Lísfai...',
  variables: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza plantilla detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during plantilla detail load', async ({ page }) => {
    await page.route(DETAIL_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_TPL_DETAIL),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded plantilla detail', async ({ page }) => {
    await page.route(DETAIL_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_TPL_DETAIL),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
