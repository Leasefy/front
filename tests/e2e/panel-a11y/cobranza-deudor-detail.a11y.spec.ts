/**
 * Cobranza deudor detail — axe-core a11y gate (Phase 38-08, task 38-08-02).
 *
 * Detail/dynamic-route page per D-38-04: no page-level EmptyState (entity
 * always exists when route loads). Skeleton + axe only.
 *
 * Mock target: cobranza/debtors/test-debtor-id (and any nested sub-resource
 * the page hydrates — calls, timeline, ARCO requests).
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const DEBTOR_ID = 'test-debtor-id'
const ROUTE = `/panel/inmobiliaria/ai/cobranza/deudores/${DEBTOR_ID}`
const DETAIL_MOCK = `**/cobranza/debtors/${DEBTOR_ID}**`
const SKELETON_DELAY_MS = 800

const POPULATED_DEBTOR = {
  id: DEBTOR_ID,
  nombre: 'Juan Prueba',
  cedula_hash: 'abc123',
  cedula_masked: '12•••78',
  email_masked: 'j•••a@example.co',
  phone_masked: '+57 3•••5678',
  stage: 'S1',
  totalDeuda: 1_500_000,
  diasMora: 12,
  ultimoContacto: new Date().toISOString(),
  calls: [],
  payments: [],
  stateLog: [],
  arcoRequests: [],
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza deudor detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during debtor detail load', async ({ page }) => {
    await page.route(DETAIL_MOCK, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_DEBTOR),
      })
    })

    await page.goto(ROUTE)

    const candidates = page.locator(
      '[data-testid="cobranza-deudor-detail-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )



    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('zero axe violations on populated debtor detail', async ({ page }) => {
    await page.route(DETAIL_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_DEBTOR),
      })
    })

    await page.goto(ROUTE)
    await waitForPageReady(page)

    await runAndAssertAxe(page)
  })
})
