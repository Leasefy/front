/**
 * Cobranza reporte — axe a11y gate (Phase 38-08, task 38-08-03).
 * D-38-04 EmptyState: "Aún no hay datos para el reporte diario" — CTA
 *                      "Configurar suscripción" → /reporte/suscripcion.
 *
 * Bespoke skeleton: CobranzaReporteSkeleton (Phase 38-04a).
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/reporte'
const REPORTE_MOCK = '**/cobranza/daily-report**'
const SKELETON_DELAY_MS = 800

const POPULATED_REPORTE = {
  date: new Date().toISOString().split('T')[0],
  kpis: { pkr: 0.45, morosidad: 0.23, outsideHours: 0 },
  topDebtors: [
    {
      debtorId: 'test-debtor-id',
      cedula_masked: '12•••78',
      totalDeuda: 1_500_000,
      diasMora: 12,
    },
  ],
  history: [],
  alerts: [],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza reporte — Phase 38-08 axe a11y', () => {
  test('skeleton visible during daily report load', async ({ page }) => {
    await page.route(REPORTE_MOCK, async (route) => {
      await new Promise((r) => setTimeout(r, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_REPORTE),
      })
    })
    await page.goto(ROUTE)
    const candidates = page.locator(
      '[data-testid="cobranza-reporte-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('EmptyState when daily report has no data', async ({ page }) => {
    await page.route(REPORTE_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      })
    })
    await page.goto(ROUTE)
    const empty = page.locator('[role="status"].border-dashed').first()

    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated reporte', async ({ page }) => {
    await page.route(REPORTE_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_REPORTE),
      })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
