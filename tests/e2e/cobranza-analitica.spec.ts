/**
 * Phase 37 — Cobranza Analytics Structural Specs
 *
 * These specs follow the pattern documented in
 * .planning/phases/36-arco-templates-configuration/36-13-SUMMARY.md —
 * they are STRUCTURAL specs. Data-dependent assertions (specific chart values,
 * table rows, numeric KPIs) are intentionally omitted until the seedAuth +
 * agency-context test infra debt is resolved.
 *
 * See memory `phase_36_patch_13` for the outstanding test-infra debt:
 * seedAuth does not populate agency.id, so data-dependent assertions fail
 * project-wide. This file defers those assertions to a future patch phase.
 *
 * ## Known Test Infra Debt
 * - `seedAuth` does not populate `agency.id` in the test session cookie
 * - `NEXT_PUBLIC_TEST_AGENCY_ID` env-var fallback is not yet implemented
 * - All 4 tests in this file mock the analytics API endpoints directly
 *   via Playwright route interception to bypass the auth+agency-id gap
 * - Data-dependent assertions (actual chart values, table row counts,
 *   specific KPI numbers) are marked test.fixme until the hardening phase
 */

import { test, expect } from '@playwright/test'

// ── Viewport config (XR-03) ───────────────────────────────────────────────────

const VIEWPORTS = [
  { name: 'iPhone-14',    width: 390,  height: 844  },
  { name: 'iPad Mini',    width: 768,  height: 1024 },
  { name: 'Desktop 1440', width: 1440, height: 900  },
] as const

// ── Mock payloads ─────────────────────────────────────────────────────────────

const GATE_POPULATED = { populated: true, calls_30d: 50 }
const GATE_EMPTY     = { populated: false, calls_30d: 2 }

const RECOVERY_STUB  = { populated: false, rows: [], reason: 'insufficient-buckets' }
const OBJECTIONS_STUB = { populated: false, objections: [], reason: 'insufficient-objections' }
const CADENCE_STUB   = {
  populated: false,
  channelMix: { populated: false, rows: [] },
  heatmap:    { populated: false, cells: [] },
}
const COST_STUB      = { populated: false, cost_per_peso: null, sparkline_90d: [], reason: 'insufficient-data' }
const SCRIPTS_STUB   = { populated: false, reason: 'schema_pending', rows: [], pendingPhase: 38 }

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mock all 6 analytics endpoints.
 * agencyGateBody lets callers override the gate response shape per test.
 */
async function mockAllAnalyticsEndpoints(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
  agencyGateBody: typeof GATE_POPULATED | typeof GATE_EMPTY = GATE_POPULATED,
): Promise<void> {
  await page.route('**/api/agency/*/cobranza/analytics/agency-gate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(agencyGateBody),
    })
  })
  await page.route('**/api/agency/*/cobranza/analytics/recovery-rate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(RECOVERY_STUB),
    })
  })
  await page.route('**/api/agency/*/cobranza/analytics/top-objections', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(OBJECTIONS_STUB),
    })
  })
  await page.route('**/api/agency/*/cobranza/analytics/cadence', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CADENCE_STUB),
    })
  })
  await page.route('**/api/agency/*/cobranza/analytics/cost-per-peso', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(COST_STUB),
    })
  })
  await page.route('**/api/agency/*/cobranza/analytics/top-scripts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SCRIPTS_STUB),
    })
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Test 1 — Navigation smoke
 * Gate mocked as populated=true so the full widget grid renders.
 * Asserts page loads and the h1 heading is visible.
 */
test('navigates to analytics page and renders heading', async ({ page }) => {
  await mockAllAnalyticsEndpoints(page, GATE_POPULATED)
  await page.goto('/panel/inmobiliaria/ai/cobranza/analitica')
  // Page renders without crashing — heading visible
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 12_000 })
})

/**
 * Test 2 — Agency-gate full-page state
 * Gate mocked as populated=false, calls_30d=2.
 * Asserts: NoDataYetBadge (reason text) IS visible.
 *          Widget section headings are NOT in the DOM.
 */
test('shows full-page NoDataYetBadge when agency-gate populated=false', async ({ page }) => {
  await mockAllAnalyticsEndpoints(page, GATE_EMPTY)
  await page.goto('/panel/inmobiliaria/ai/cobranza/analitica')

  // NoDataYetBadge reason text is visible (i18n key: inmobiliaria.ai.cobranza.analitica.agencyGate.reason)
  // Using a broad regex so this survives i18n key changes
  const badgeText = page.getByText(/primera llamada|primera llam|enough calls|datos insuficientes|at least/i).first()
  await expect(badgeText).toBeVisible({ timeout: 12_000 })

  // Widget section headings are NOT rendered (gate fired → no widget grid)
  await expect(
    page.getByRole('heading', { name: /tasa de recuperación|recovery rate/i }),
  ).not.toBeVisible()
  await expect(
    page.getByRole('heading', { name: /objeciones|objections/i }),
  ).not.toBeVisible()
})

/**
 * Test 3 — Gate true: all 5 widget sections visible with stub data
 * Gate populated=true; all 6 widget endpoints return populated=false (stub+watermark).
 * Asserts: all 5 widget <h2> headings are visible.
 *          NoDataYetBadge full-page variant NOT rendered.
 */
test('renders all 5 widget headings when agency-gate populated=true', async ({ page }) => {
  await mockAllAnalyticsEndpoints(page, GATE_POPULATED)
  await page.goto('/panel/inmobiliaria/ai/cobranza/analitica')

  // All 5 widget section headings must be visible
  await expect(page.getByRole('heading', { name: /recuperación|recovery/i }).first()).toBeVisible({ timeout: 12_000 })
  await expect(page.getByRole('heading', { name: /objeciones|objections/i }).first()).toBeVisible({ timeout: 12_000 })
  await expect(page.getByRole('heading', { name: /cadencia|cadence/i }).first()).toBeVisible({ timeout: 12_000 })
  await expect(page.getByRole('heading', { name: /costo|cost/i }).first()).toBeVisible({ timeout: 12_000 })
  await expect(page.getByRole('heading', { name: /scripts/i }).first()).toBeVisible({ timeout: 12_000 })

  // NoDataYetBadge full-page variant must NOT be rendered (gate passed)
  await expect(
    page.getByText(/primera llamada|primera llam|enough calls/i),
  ).not.toBeVisible()
})

/**
 * Test 4 — XR-03 responsive: no horizontal scroll at 3 viewports
 * Repeats gate-true grid render at iPhone-14, iPad Mini, Desktop 1440.
 * Asserts scrollWidth <= clientWidth + 2px tolerance at each viewport.
 */
for (const vp of VIEWPORTS) {
  test(`no horizontal scroll at ${vp.name} (${vp.width}×${vp.height}) — XR-03`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await mockAllAnalyticsEndpoints(page, GATE_POPULATED)
    await page.goto('/panel/inmobiliaria/ai/cobranza/analitica')

    // Wait for page to be interactive (heading visible)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 12_000 })

    // No horizontal scroll: scrollWidth must not exceed viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2) // +2px tolerance for sub-pixel rounding

    // Visual snapshot — baseline capture deferred to 37-13 per planning-context constraint
    // Uncomment when baseline capture phase runs:
    // await expect(page).toHaveScreenshot(`analitica-${vp.name}.png`)
  })
}
