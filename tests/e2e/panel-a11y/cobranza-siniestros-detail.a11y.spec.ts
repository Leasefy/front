/**
 * Cobranza siniestros detail — axe a11y gate (Phase 38-08, task 38-08-04).
 *
 * Detail/dynamic-route per D-38-04: skeleton + axe only.
 *
 * Skeleton coverage NOTE: per RESEARCH Topic 9 audit, siniestros detail was
 * in the "PARTIAL or NONE" loading group; Phase 38-05a Batch D added a
 * SiniestroApprovalClient skeleton via auth-hydration loading proxy.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const SINIESTRO_ID = 'test-siniestro-id'
const ROUTE = `/panel/inmobiliaria/ai/cobranza/siniestros/${SINIESTRO_ID}`
const SINIESTRO_MOCK_A = `**/siniestros/${SINIESTRO_ID}**`
const SINIESTRO_MOCK_B = `**/cobranza/claims/${SINIESTRO_ID}**`
const SKELETON_DELAY_MS = 2500

const POPULATED_SINIESTRO = {
  id: SINIESTRO_ID,
  debtorId: 'test-debtor-id',
  debtorNameMasked: 'J•••n P•••a',
  carrier: 'sura',
  policyNumber: 'POL-12345',
  status: 'pending_filing',
  totalAmount: 5_000_000,
  filedAt: null,
  events: [],
}

async function mockSiniestro(page: import('@playwright/test').Page, delay = 0): Promise<void> {
  const respond = async (route: import('@playwright/test').Route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(POPULATED_SINIESTRO),
    })
  }
  await page.route(SINIESTRO_MOCK_A, respond)
  await page.route(SINIESTRO_MOCK_B, respond)
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza siniestros detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during siniestro detail load (when implemented)', async ({ page }) => {
    await mockSiniestro(page, SKELETON_DELAY_MS)
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 6_000 })
  })

  test('zero axe violations on loaded siniestro detail', async ({ page }) => {
    await mockSiniestro(page, 0)
    await page.goto(ROUTE, { waitUntil: 'domcontentloaded' })
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
