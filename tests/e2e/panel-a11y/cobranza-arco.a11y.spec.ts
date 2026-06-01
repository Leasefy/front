/**
 * Cobranza ARCO inbox — axe-core a11y gate (Phase 38-08, task 38-08-02).
 *
 * D-38-04 EmptyState: "Sin solicitudes ARCO" — celebratory, no CTA.
 *
 * Three assertions: skeleton + EmptyState + axe scan on populated inbox.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/arco'
const ARCO_MOCK = '**/arco/requests**'
const SKELETON_DELAY_MS = 800

const POPULATED_ARCO = [
  {
    id: 'arco-1',
    type: 'acceso',
    status: 'pending',
    cedula_hash: 'abc123',
    cedula_masked: '12•••78',
    createdAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    isOverdue: false,
  },
  {
    id: 'arco-2',
    type: 'rectificacion',
    status: 'pending',
    cedula_hash: 'def456',
    cedula_masked: '34•••12',
    createdAt: new Date().toISOString(),
    dueAt: new Date(Date.now() - 1 * 86400_000).toISOString(),
    isOverdue: true,
  },
]

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza ARCO — Phase 38-08 axe a11y', () => {
  test('skeleton visible during ARCO inbox load', async ({ page }) => {
    await page.route(ARCO_MOCK, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_ARCO),
      })
    })

    await page.goto(ROUTE)

    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')



    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('celebratory EmptyState when ARCO inbox is empty', async ({ page }) => {
    await page.route(ARCO_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto(ROUTE)
    const empty = page.locator('[role="status"].border-dashed').first()



    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated ARCO inbox', async ({ page }) => {
    await page.route(ARCO_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_ARCO),
      })
    })

    await page.goto(ROUTE)
    await waitForPageReady(page)

    await runAndAssertAxe(page)
  })
})
