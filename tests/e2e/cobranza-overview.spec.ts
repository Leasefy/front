import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

// NOTE: These tests run against a locally running mvp dev server.
// The cobranza overview page requires a logged-in session with cobranza:view.
// For CI: use a fixture user with the cobranza:view permission pre-seeded.
// For local: ensure the dev server is running at http://localhost:3000 and
// a user with cobranza:view is logged in.

const MOCK_OVERVIEW_BODY = JSON.stringify({
  kpis: {
    deudoresActivos: 142,
    pagadoHoyCOP: 5_500_000,
    llamadasHoy: 23,
    escalacionesPendientes: 3,
  },
  stages: [
    { stage: 'S0', count: 45, avgDaysInStage: 3, weeklyDelta: 2 },
    { stage: 'S1', count: 38, avgDaysInStage: 8, weeklyDelta: -1 },
    { stage: 'S2', count: 27, avgDaysInStage: 15, weeklyDelta: 0 },
    { stage: 'S3', count: 18, avgDaysInStage: 22, weeklyDelta: 3 },
    { stage: 'S4', count: 8, avgDaysInStage: 31, weeklyDelta: -2 },
    { stage: 'S5', count: 4, avgDaysInStage: 45, weeklyDelta: 1 },
    { stage: 'SX', count: 2, avgDaysInStage: 60, weeklyDelta: 0 },
  ],
  lastTransitions: [
    {
      id: '1',
      debtorNameRedacted: 'J. García',
      fromStage: 'S1',
      toStage: 'S2',
      reason: 'No payment after 30 days',
      transitionedAt: new Date(Date.now() - 7_200_000).toISOString(),
      actor: 'agent',
    },
    {
      id: '2',
      debtorNameRedacted: 'M. Rodríguez',
      fromStage: 'S0',
      toStage: 'S1',
      reason: 'Overdue > 1 day',
      transitionedAt: new Date(Date.now() - 3_600_000).toISOString(),
      actor: 'agent',
    },
  ],
  nextActions: [
    {
      id: 'a1',
      debtorNameRedacted: 'A. Martínez',
      plannedFor: new Date(Date.now() + 3_600_000).toISOString(),
      channel: 'voice',
      stage: 'S2',
    },
    {
      id: 'a2',
      debtorNameRedacted: 'B. López',
      plannedFor: new Date(Date.now() + 7_200_000).toISOString(),
      channel: 'whatsapp',
      stage: 'S1',
    },
  ],
  generatedAt: new Date().toISOString(),
})

for (const viewport of VIEWPORTS) {
  test(`cobranza overview — ${viewport.name} snapshot`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    // Mock the cartera/overview API so we get deterministic data
    await page.route('**/cartera/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: MOCK_OVERVIEW_BODY,
      })
    })

    await page.goto('/panel/inmobiliaria/ai/cobranza')

    // Wait for the KPI strip to render
    await page.waitForSelector('[data-testid="kpi-strip"], .grid-cols-2', {
      timeout: 10_000,
    })

    // Assert no horizontal overflow (2px tolerance for scrollbars)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 2)

    // Visual snapshot
    await expect(page).toHaveScreenshot(
      `cobranza-overview-${viewport.name.toLowerCase()}.png`,
      {
        fullPage: true,
        animations: 'disabled',
      }
    )
  })
}

test('cobranza overview — stage card click updates URL', async ({ page }) => {
  await page.route('**/cartera/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kpis: { deudoresActivos: 10, pagadoHoyCOP: 0, llamadasHoy: 0, escalacionesPendientes: 0 },
        stages: [{ stage: 'S0', count: 10, avgDaysInStage: 5, weeklyDelta: 0 }],
        lastTransitions: [],
        nextActions: [],
        generatedAt: new Date().toISOString(),
      }),
    })
  })

  await page.goto('/panel/inmobiliaria/ai/cobranza')
  await page.waitForSelector('button[aria-label*="S0"]', { timeout: 10_000 })
  await page.click('button[aria-label*="S0"]')
  await expect(page).toHaveURL(/\?stage=S0/)
})

test('cobranza overview — aria-live region present', async ({ page }) => {
  await page.route('**/cartera/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kpis: { deudoresActivos: 0, pagadoHoyCOP: 0, llamadasHoy: 0, escalacionesPendientes: 0 },
        stages: [],
        lastTransitions: [],
        nextActions: [],
        generatedAt: new Date().toISOString(),
      }),
    })
  })

  await page.goto('/panel/inmobiliaria/ai/cobranza')
  const liveRegion = page.locator('[aria-live="polite"]')
  await expect(liveRegion).toBeAttached()
})
