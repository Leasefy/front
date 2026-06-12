/**
 * Cobranza escalaciones — axe-core a11y gate (Phase 38-08, plan task 38-08-01).
 *
 * Three assertions per D-38-01 + D-38-12:
 *   1. Skeleton visible during load.
 *   2. Celebratory EmptyState when all three arrays (open/assigned/resolved) are empty
 *      — per D-38-04 "¡Buen trabajo!" no-CTA state.
 *   3. Zero axe-core violations on the populated kanban.
 *
 * Hook shape (verified in 38-04a SUMMARY Deviation §1): the hook returns
 * `{ data: { open, assigned, resolved } }` — NOT `inProgress`.
 *
 * D-38-04 EmptyState: celebratory, no CTA.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza/escalaciones'
const ESCALACIONES_MOCK = '**/cobranza/escalations**'
const SKELETON_DELAY_MS = 2500

const POPULATED_ESCALACIONES = {
  open: [
    {
      id: 'esc-1',
      debtorId: 'test-debtor-id-1',
      debtorName: 'Juan Prueba',
      reason: 'no-contact-7d',
      assignedTo: null,
      createdAt: new Date().toISOString(),
      status: 'open',
    },
  ],
  assigned: [
    {
      id: 'esc-2',
      debtorId: 'test-debtor-id-2',
      debtorName: 'Maria Demo',
      reason: 'dispute',
      assignedTo: 'agent-1',
      createdAt: new Date().toISOString(),
      status: 'assigned',
    },
  ],
  resolved: [],
}

const EMPTY_ESCALACIONES = { open: [], assigned: [], resolved: [] }

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza escalaciones — Phase 38-08 axe a11y', () => {
  test('skeleton visible during escalaciones load', async ({ page }) => {
    await page.route(ESCALACIONES_MOCK, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_ESCALACIONES),
      })
    })

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })

    const candidates = page.locator(
      '[data-testid="cobranza-escalaciones-skeleton"], [aria-busy="true"], [data-slot="skeleton"]',
    )



    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('celebratory EmptyState when all three arrays are empty', async ({ page }) => {
    await page.route(ESCALACIONES_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_ESCALACIONES),
      })
    })

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const empty = page.locator('[role="status"].border-dashed').first()



    await expect(empty).toBeVisible({ timeout: 5_000 })
  })

  test('zero axe violations on populated escalaciones kanban', async ({ page }) => {
    await page.route(ESCALACIONES_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_ESCALACIONES),
      })
    })

    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)

    await runAndAssertAxe(page)
  })
})
