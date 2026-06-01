/**
 * Cotizador nueva (wizard) — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * Wizard page per D-38-04: no EmptyState (always has form state). Skeleton
 * fires only during re-quote hydration (?from=UUID + parentMetadata.isLoading)
 * per Phase 38-04b key-decision.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cotizador/nueva'
const RE_QUOTE_ROUTE = '/panel/inmobiliaria/ai/cotizador/nueva?from=test-quote-id'
const METADATA_MOCK = '**/cotizador/quote/test-quote-id/metadata'
const CARRIERS_MOCK = '**/cotizador/carriers**'
const SKELETON_DELAY_MS = 800

const QUOTE_METADATA = {
  id: 'test-quote-id',
  cedula_hash: 'abc123',
  inputs: {
    canonMensual: 2_000_000,
    plazoMeses: 12,
    coberturas: ['responsabilidad-civil'],
  },
  codeudores: [],
}

const CARRIERS_LIST = [
  { carrier: 'sura', name: 'Sura', active: true },
  { carrier: 'mapfre', name: 'Mapfre', active: true },
]

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cotizador nueva wizard — Phase 38-08 axe a11y', () => {
  test('skeleton visible during re-quote hydration', async ({ page }) => {
    await page.route(METADATA_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(QUOTE_METADATA),
      })
    })
    await page.route(CARRIERS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CARRIERS_LIST),
      })
    })
    await page.goto(RE_QUOTE_ROUTE)
    const candidates = page.locator(
      '[data-testid="cotizador-wizard-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('zero axe violations on wizard initial form state', async ({ page }) => {
    await page.route(CARRIERS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CARRIERS_LIST),
      })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
