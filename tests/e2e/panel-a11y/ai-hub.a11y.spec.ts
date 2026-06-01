/**
 * AI hub landing — axe a11y gate (Phase 38-08, task 38-08-05).
 *
 * Per Phase 37 D-37-03a: AI hub uses per-card NoDataYetBadge, NOT a
 * page-level EmptyState. Skeleton + axe only.
 *
 * The hub fetches two cards' worth of agent metrics: cobranza + cotizador.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai'
const HUB_LANDING_MOCK = '**/ai-hub/landing**'
const AGENT_METRICS_MOCK = '**/ai-hub/metrics**'
const SKELETON_DELAY_MS = 2500

const POPULATED_LANDING = {
  cobranzaCard: {
    heroKpi: { populated: true, value: 0.85, label: 'PKR 30d' },
    secondary: { populated: true, value: 12, label: 'Llamadas hoy' },
    lastActivity: new Date().toISOString(),
    escalationsPending: 2,
  },
  cotizadorCard: {
    heroKpi: { populated: true, value: 0.92, label: 'Aprobación' },
    secondary: { populated: true, value: 5, label: 'Cotizaciones hoy' },
    lastActivity: new Date().toISOString(),
  },
  generatedAt: new Date().toISOString(),
}

const POPULATED_METRICS = {
  cobranza: { populated: true, heroKpi: 0.85 },
  cotizador: { populated: true, heroKpi: 0.92 },
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('AI hub landing — Phase 38-08 axe a11y', () => {
  test('skeleton visible during hub landing load', async ({ page }) => {
    await page.route(HUB_LANDING_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_LANDING),
      })
    })
    await page.route(AGENT_METRICS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_METRICS),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded AI hub (cobranza + cotizador cards)', async ({ page }) => {
    await page.route(HUB_LANDING_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_LANDING),
      })
    })
    await page.route(AGENT_METRICS_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_METRICS),
      })
    })
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
