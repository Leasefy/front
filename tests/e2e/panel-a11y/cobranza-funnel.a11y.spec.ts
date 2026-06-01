/**
 * Cobranza stage funnel — dedicated roving-tabindex spec (Phase 38-08, task 38-08-06).
 *
 * Verifies the WCAG 2.1 AA composite-widget contract added in 38-04c
 * (D-38-13): the 7 stage cards on /panel/inmobiliaria/ai/cobranza act as a
 * single ARIA tablist with roving tabindex. Tab enters the tablist once,
 * ArrowLeft/Right moves focus between cards, Enter activates the focused
 * stage (drills into the stage filter via stage=<id> query param).
 *
 * This spec is BEHAVIORAL only — the axe-core scan for the cobranza overview
 * page lives in cobranza-overview.a11y.spec.ts. We do not re-run axe here.
 *
 * 38-04c provides:
 *   - role="tablist" on the section wrapper (cobranza/page.tsx)
 *   - role="tab" + aria-selected + id + aria-controls on each CobranzaStageCard
 *   - role="tabpanel" id="stage-panel" on the chart/transitions/error wrapper
 *   - tabIndex={focusedStage === stage ? 0 : -1} roving formula
 *   - ArrowLeft / ArrowRight / Home / End / Enter / Space handlers
 *
 * Per the established Batch 1-4 + 38-04a/b/c conventions, the spec
 * test.fixme's out cleanly when route.fulfill cannot bypass the Next.js
 * seedAuthState in beforeEach unblocks the page mount (2026-06-01).
 */

import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'

const ROUTE = '/panel/inmobiliaria/ai/cobranza'
const OVERVIEW_MOCK = '**/cartera/overview'

const POPULATED_OVERVIEW = {
  kpis: {
    deudoresActivos: 12,
    pagadoHoyCop: 4_500_000,
    llamadasHoy: 8,
    escalacionesPendientes: 2,
  },
  stages: [
    { stage: 'S0', count: 5, deudores: [] },
    { stage: 'S1', count: 3, deudores: [] },
    { stage: 'S2', count: 2, deudores: [] },
    { stage: 'S3', count: 1, deudores: [] },
    { stage: 'S4', count: 0, deudores: [] },
    { stage: 'S5', count: 0, deudores: [] },
    { stage: 'SX', count: 1, deudores: [] },
  ],
  lastTransitions: [],
  nextActions: [],
  generatedAt: new Date().toISOString(),
}

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza stage funnel — roving-tabindex (D-38-13)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(OVERVIEW_MOCK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POPULATED_OVERVIEW),
      })
    })
  })

  test('tablist + 7 tabs + tabpanel structure present', async ({ page }) => {
    await page.goto(ROUTE)

    const tablist = page.locator('[role="tablist"]')

    // Auth-debt guard: if the cobranza page didn't mount (auth middleware
    // redirect or dev server offline), bail with fixme.


    await expect(tablist.first()).toBeVisible({ timeout: 10_000 })

    // 7 stage cards = 7 role=tab children (S0 / S1 / S2 / S3 / S4 / S5 / SX).
    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(7)

    // Required sibling per ARIA spec when role=tab + aria-controls is present.
    const tabpanel = page.locator('[role="tabpanel"]')
    await expect(tabpanel.first()).toBeAttached()
  })

  test('initially-focused stage has tabIndex=0 and aria-selected=true', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    const tablist = page.locator('[role="tablist"]')



    await expect(tablist.first()).toBeVisible({ timeout: 10_000 })

    const tabs = page.locator('[role="tab"]')

    // Exactly one tab should have tabIndex=0 (the roving formula). The
    // remaining six should have tabIndex=-1.
    const selectedCount = await tabs.evaluateAll(
      (els) => els.filter((el) => (el as HTMLElement).tabIndex === 0).length,
    )
    expect(selectedCount).toBe(1)

    // The same tab should have aria-selected="true".
    const ariaSelectedCount = await tabs.evaluateAll(
      (els) =>
        els.filter((el) => el.getAttribute('aria-selected') === 'true').length,
    )
    expect(ariaSelectedCount).toBe(1)
  })

  test('ArrowRight moves focus to next tab; ArrowLeft moves back', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    const tablist = page.locator('[role="tablist"]')



    await expect(tablist.first()).toBeVisible({ timeout: 10_000 })

    const tabs = page.locator('[role="tab"]')

    // Focus the first tab programmatically (Tab traversal from the page
    // body is undeterministic across browsers/builds).
    await tabs.nth(0).focus()
    await expect(tabs.nth(0)).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1)).toBeFocused()

    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(2)).toBeFocused()

    await page.keyboard.press('ArrowLeft')
    await expect(tabs.nth(1)).toBeFocused()
  })

  test('Enter on focused tab activates stage (URL contains stage=)', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    const tablist = page.locator('[role="tablist"]')



    await expect(tablist.first()).toBeVisible({ timeout: 10_000 })

    const tabs = page.locator('[role="tab"]')
    await tabs.nth(1).focus()
    await page.keyboard.press('Enter')

    // 38-04c handler invokes handleStageClick which sets the stage filter.
    // Stage filter pattern: either a query param (?stage=S1) or in-page
    // state — accept both shapes by polling the URL.
    await expect
      .poll(() => page.url(), { timeout: 3_000 })
      .toMatch(/[?&]stage=|#stage=/)
  })
})
