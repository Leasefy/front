/**
 * Cobranza cartas detail — axe a11y gate (Phase 38-08, task 38-08-04).
 *
 * Detail/dynamic-route per D-38-04: skeleton + axe only.
 *
 * Skeleton coverage NOTE: per RESEARCH Topic 9 audit, cartas detail was
 * originally in the "PARTIAL or NONE" loading-state group. Phase 38-05a
 * Batch A added a CartaApprovalClient skeleton (auth-hydration loading
 * proxy via useAuth().isLoading). If the skeleton is not present on the
 * page (mock doesn't trigger it), the skeleton assertion fixme-skips and
 * the axe scan proceeds anyway.
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'
import { runAndAssertAxe, waitForPageReady } from './_helpers/axe-helpers'

const CARTA_ID = 'test-carta-id'
const ROUTE = `/panel/inmobiliaria/ai/cobranza/cartas/${CARTA_ID}`
// Cartas may live under "letters" OR "cartas" depending on backend naming.
// Broad mock covers both. The page may also fetch from a debtor detail
// endpoint depending on the embed pattern.
const CARTA_MOCK_A = `**/cartas/${CARTA_ID}**`
const CARTA_MOCK_B = `**/letters/${CARTA_ID}**`
const SKELETON_DELAY_MS = 800

const POPULATED_CARTA = {
  id: CARTA_ID,
  debtorId: 'test-debtor-id',
  debtorNameMasked: 'J•••n P•••a',
  type: 'demanda-extrajudicial',
  status: 'pending_approval',
  generatedAt: new Date().toISOString(),
  content: 'Documento de cobranza extrajudicial...',
  approverComments: [],
}

async function mockCarta(page: import('@playwright/test').Page, delay = 0): Promise<void> {
  const respond = async (route: import('@playwright/test').Route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(POPULATED_CARTA),
    })
  }
  await page.route(CARTA_MOCK_A, respond)
  await page.route(CARTA_MOCK_B, respond)
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza cartas detail — Phase 38-08 axe a11y', () => {
  test('skeleton visible during carta detail load (when implemented)', async ({ page }) => {
    await mockCarta(page, SKELETON_DELAY_MS)
    await page.goto(ROUTE)
    const candidates = page.locator('[aria-busy="true"], [data-slot="skeleton"]')

    await expect(candidates.first()).toBeVisible({ timeout: 3_000 })
  })

  test('zero axe violations on loaded carta detail', async ({ page }) => {
    await mockCarta(page, 0)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await runAndAssertAxe(page)
  })
})
