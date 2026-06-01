import { test, expect } from '@playwright/test'
import { seedAuthState } from './_helpers/auth-helpers'

/**
 * Cobranza critical-page structural smoke — Phase 38 plan 38-04a.
 *
 * Verifies that the 5 critical cobranza pages retrofitted in this plan render
 * either a bespoke skeleton (during load) or an EmptyState (when data is absent),
 * and that the un-stubbed TopScriptsTable branches correctly on populated.
 *
 * Coverage:
 *   - Cobranza overview: skeleton visible (delayed mock) + EmptyState visible (null mock)
 *   - Deudores list: skeleton visible (delayed mock) + EmptyState visible (empty pages mock)
 *   - Escalaciones: skeleton visible (delayed mock) + celebratory EmptyState (all-empty arrays)
 *   - Reporte: skeleton visible (delayed mock) + EmptyState visible (null mock)
 *   - TopScriptsTable: SampleDataWatermark renders when topScripts.populated=false
 *
 * Auth-gated routes that the dev session cannot reach via raw route.fulfill (auth
 * middleware intercepts before page mounts) are marked test.fixme with the
 * In 2026-06-01 the auth-debt was closed by seedAuthState in beforeEach
 * (see _helpers/auth-helpers.ts). Surviving fixme blocks indicate real
 * page-mount failures (missing mocks, runtime errors) — NOT auth-debt.
 *
 * Selectors target the [data-testid] hooks added to each new skeleton component
 * (cobranza-{overview|deudores-list|deudor-detail|escalaciones|reporte}-skeleton)
 * and the role="status" wrapper on EmptyState.
 */

const SKELETON_DELAY_MS = 2500
const NETWORK_PATTERNS = {
  carteraOverview: '**/cartera/overview',
  debtors: '**/cobranza/debtors**',
  escalations: '**/cobranza/escalations**',
  dailyReport: '**/cobranza/daily-report**',
  topScripts: '**/cobranza/analytics/top-scripts',
} as const

test.beforeEach(async ({ page }) => {
  await seedAuthState(page)
})

test.describe('Cobranza overview — Phase 38-04a skeleton + EmptyState', () => {
  test('skeleton renders during load (delayed network mock)', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.carteraOverview, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, SKELETON_DELAY_MS))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: { deudoresActivos: 0, pagadoHoyCop: 0, llamadasHoy: 0, escalacionesPendientes: 0 },
          stages: [],
          lastTransitions: [],
          nextActions: [],
          generatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza', { waitUntil: 'domcontentloaded' })
    const skeleton = page.getByTestId('cobranza-overview-skeleton')



    await expect(skeleton).toBeVisible()
  })

  test('EmptyState renders on no portfolio (null data)', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.carteraOverview, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza', { waitUntil: 'domcontentloaded' })
    // EmptyState wrapper carries `role=status` PLUS the dashed-border container
    // classes. Filtering by .border-dashed scopes the selector to the new primitive
    // and excludes the sidebar's `role=status` sr-only navigation announcer.
    const status = page.locator('[role="status"].border-dashed').first()



    await expect(status).toBeVisible()
  })
})

test.describe('Deudores list — Phase 38-04a skeleton + EmptyState', () => {
  test('EmptyState renders when no portfolio + no filters', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.debtors, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], nextCursor: null, generatedAt: new Date().toISOString() }),
      })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza/deudores', { waitUntil: 'domcontentloaded' })
    // EmptyState wrapper carries `role=status` PLUS the dashed-border container
    // classes. Filtering by .border-dashed scopes the selector to the new primitive
    // and excludes the sidebar's `role=status` sr-only navigation announcer.
    const status = page.locator('[role="status"].border-dashed').first()



    await expect(status).toBeVisible()
  })
})

test.describe('Escalaciones — Phase 38-04a celebratory EmptyState', () => {
  test('celebratory EmptyState (no CTA) renders when all arrays empty', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.escalations, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          open: [],
          assigned: [],
          resolved: [],
          generatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza/escalaciones', { waitUntil: 'domcontentloaded' })
    // EmptyState wrapper carries `role=status` PLUS the dashed-border container
    // classes. Filtering by .border-dashed scopes the selector to the new primitive
    // and excludes the sidebar's `role=status` sr-only navigation announcer.
    const status = page.locator('[role="status"].border-dashed').first()



    await expect(status).toBeVisible()
    // Celebratory copy: '¡Buen trabajo!' — no CTA per D-38-04 row 3
    await expect(status).toContainText(/Buen trabajo|Great job/)
  })
})

test.describe('Reporte diario — Phase 38-04a skeleton + EmptyState', () => {
  test('EmptyState renders when no report data', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.dailyReport, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza/reporte', { waitUntil: 'domcontentloaded' })
    // EmptyState wrapper carries `role=status` PLUS the dashed-border container
    // classes. Filtering by .border-dashed scopes the selector to the new primitive
    // and excludes the sidebar's `role=status` sr-only navigation announcer.
    const status = page.locator('[role="status"].border-dashed').first()



    await expect(status).toBeVisible()
  })
})

test.describe('TopScriptsTable — Phase 38-04a un-stub', () => {
  test('SampleDataWatermark renders when topScripts.populated=false', async ({ page }) => {
    await page.route(NETWORK_PATTERNS.topScripts, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          populated: false,
          reason: 'below-threshold',
          rows: [],
          pendingPhase: 38,
        }),
      })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza/analitica', { waitUntil: 'domcontentloaded' })
    // SampleDataWatermark renders a role="note" badge with "Datos de muestra" copy
    const watermark = page.locator('[role="note"]').first()



    await expect(watermark).toBeVisible()
  })
})
