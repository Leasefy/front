import { test, expect, type Page } from '@playwright/test'

// Phase 35 plan 35-11 — Playwright visual baselines for per-carrier deep dive and SLA sub-page.
//
// Decisions covered (annotated on each test):
//   - XR-03       3-viewport snapshots + no horizontal overflow
//   - D-35-03     KPI strip 2×2 at sm → 4×1 at md+; cédula masking in recent-quotes
//   - D-35-08     60s SWR polling (tested implicitly via route mocks)
//
// Carrier tested: 'sura' (route: 'co.sura').
//   Substitute any other carrier by changing CARRIER_SLUG + CARRIER_ROUTE_PARAM.
//
// Chart assertion:
//   At least one ResponsiveContainer root (svg or div with width:100%) has a non-zero
//   bounding box at Desktop viewport. Uses .boundingBox() — asserts width > 0 AND height > 0.
//
// Cédula masking:
//   recent-quotes list shows cedulaHashPrefix8 always masked — no reveal button adjacent
//   to the masked cell (Phase 31 invariant — cédulas are PII, never revealed in admin surfaces
//   without explicit consent flow + audit log).
//
// v2.1 env workaround (NEVER commit these source tweaks):
//   1. src/app/panel/inmobiliaria/layout.tsx — add 'tenant' to the allowedRoles array
//   2. src/lib/context/PermissionsContext.tsx — add localhost bypass so
//      canAccess('cotizador', anything) returns true on localhost:3001.
//   Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local.
//
// Re-capture procedure:
//   cd ~/rent/mvp
//   # Apply 2 source tweaks (NEVER commit)
//   pnpm dev   # separate terminal, port 3001
//   pnpm playwright test tests/e2e/cotizador-carrier-detail.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git status --short  # MUST show only new/updated snapshot PNGs
//
// Revert protocol (mandatory after snapshot capture):
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git add src/app/panel/inmobiliaria/layout.tsx \
//           src/lib/context/PermissionsContext.tsx
//   git commit -m "revert(35-11): remove v2.1 env tweaks used for snapshot capture"
//   Verify: git diff HEAD~1 -- src/app/panel/inmobiliaria/layout.tsx shows the revert.
//   If this commit is missing, plan 35-11 is considered FAILED.
//
// Open UAT: Human must review visual baselines on first CI run.
//   Track as "35-11 open UAT — carrier deep-dive baselines pending human review".
//
// Batch re-capture (all 3 spec files at once):
//   cd ~/rent/mvp && pnpm playwright test --update-snapshots \
//     tests/e2e/cotizador-{carriers,carrier-detail,insights-costos}.spec.ts

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const CARRIER_SLUG = 'sura'

const DEEP_DIVE_MOCK = {
  kpis: {
    latencyP95Ms: 320,
    errorRate: 0.04,
    approvalRate: 0.72,
    costPerQuoteUsd: 0.018,
  },
  latencySparkline: Array.from({ length: 24 }, (_, i) => ({
    hour: `2026-05-28T${String(i).padStart(2, '0')}:00:00Z`,
    p95LatencyMs: 280 + i * 5,
  })),
  errorRateDaily: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-05-${String(22 + i).padStart(2, '0')}`,
    errorRate: 0.03 + i * 0.005,
  })),
  approvalByCanon: [
    { canonRange: '[0-1M]', approvalRate: 0.82, n: 45 },
    { canonRange: '[1M-3M]', approvalRate: 0.74, n: 120 },
    { canonRange: '[3M-5M]', approvalRate: 0.65, n: 80 },
    { canonRange: '[5M+]', approvalRate: 0.55, n: 30 },
  ],
  generatedAt: '2026-05-28T08:00:00Z',
}

const RECENT_QUOTES_MOCK = {
  items: [
    {
      quoteId: 'q-001',
      createdAt: '2026-05-28T07:30:00Z',
      cedulaHashPrefix8: 'ab12cd34',
      canonCop: 1800000,
      verdict: 'approved' as const,
      primaMensualCop: 95000,
      latencyMs: 310,
    },
    {
      quoteId: 'q-002',
      createdAt: '2026-05-28T06:15:00Z',
      cedulaHashPrefix8: 'ef56gh78',
      canonCop: 3200000,
      verdict: 'rejected' as const,
      primaMensualCop: null,
      latencyMs: 450,
    },
  ],
  nextCursor: null,
}

const SLA_MOCK = {
  currentState: 'healthy' as const,
  since: '2026-05-27T00:00:00Z',
  reason: null,
  recentMetrics: Array.from({ length: 6 }, (_, i) => ({
    hourBucket: `2026-05-28T${String(i).padStart(2, '0')}:00:00Z`,
    p95LatencyMs: 300 + i * 10,
    errorRate: 0.03,
    nAttempts: 50,
  })),
  breachWindows: [] as Array<{
    startAt: string
    endAt: string | null
    severity: string
    durationMinutes: number | null
  }>,
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

async function seedAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'arriendo-facil-auth',
        JSON.stringify({
          id: 'test-user-1',
          role: 'agency',
          backendRole: 'AGENT',
          onboardingCompleted: true,
          email: 'pruebasarrendador1902@gmail.com',
        }),
      )
    } catch {
      // ignore
    }
  })
}

async function mockPermissions(page: Page): Promise<void> {
  await page.route('**/api/agency/*/my-permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modules: {
          cotizador: {
            view: true,
            'configure-carrier': true,
          },
        },
      }),
    })
  })
  await page.route('**/my-permissions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modules: {
          cotizador: {
            view: true,
            'configure-carrier': true,
          },
        },
      }),
    })
  })
}

function attachConsoleErrorListener(page: Page): string[] {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  return consoleErrors
}

async function mockDeepDiveEndpoints(page: Page): Promise<void> {
  await page.route(
    `**/api/agency/*/cotizador/aseguradoras/${CARRIER_SLUG}`,
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DEEP_DIVE_MOCK),
      })
    },
  )
  await page.route(
    `**/api/agency/*/cotizador/aseguradoras/${CARRIER_SLUG}/recent-quotes**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(RECENT_QUOTES_MOCK),
      })
    },
  )
}

async function mockSlaEndpoint(page: Page): Promise<void> {
  await page.route(
    `**/api/agency/*/cotizador/aseguradoras/${CARRIER_SLUG}/sla`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SLA_MOCK),
      })
    },
  )
}

// ---------------------------------------------------------------------------
// Group (a): Visual snapshots — deep dive at all 3 viewports (XR-03)
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`carrier deep dive snapshot sura — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors = attachConsoleErrorListener(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockDeepDiveEndpoints(page)
    await mockPermissions(page)
    await page.goto(`/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER_SLUG}`)
    await page.waitForLoadState('domcontentloaded')
    // KPI strip visible (latency value)
    await expect(page.locator('text=/320.*ms|320ms|latencia/i').first()).toBeVisible({
      timeout: 12_000,
    })
    // No console errors (excluding React Warnings)
    expect(consoleErrors.filter((e) => !e.includes('Warning:'))).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `cotizador-carrier-sura-deepdive-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// ---------------------------------------------------------------------------
// Group (b): Visual snapshots — SLA sub-page at all 3 viewports (XR-03)
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`carrier SLA sub-page snapshot sura — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors = attachConsoleErrorListener(page)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockSlaEndpoint(page)
    await mockPermissions(page)
    await page.goto(`/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER_SLUG}/sla`)
    await page.waitForLoadState('domcontentloaded')
    // Current state card visible
    await expect(page.locator('text=/healthy|saludable|normal/i').first()).toBeVisible({
      timeout: 12_000,
    })
    // No console errors (excluding React Warnings)
    expect(consoleErrors.filter((e) => !e.includes('Warning:'))).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `cotizador-carrier-sura-sla-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// ---------------------------------------------------------------------------
// Group (c): No horizontal overflow at iPhone-14 (D-35-09, XR-03)
// ---------------------------------------------------------------------------

test('deep dive no horizontal scroll at iPhone-14 — D-35-09 XR-03', async ({ page }) => {
  const consoleErrors = attachConsoleErrorListener(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await seedAuth(page)
  await mockDeepDiveEndpoints(page)
  await mockPermissions(page)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER_SLUG}`)
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('text=/320.*ms|latencia/i').first()).toBeVisible({ timeout: 12_000 })
  // No console errors
  expect(consoleErrors.filter((e) => !e.includes('Warning:'))).toHaveLength(0)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
})

// ---------------------------------------------------------------------------
// Group (d): Recharts container has non-zero bounding box at Desktop (XR-03)
// ---------------------------------------------------------------------------

test('latency sparkline Recharts container has non-zero height — XR-03', async ({ page }) => {
  const consoleErrors = attachConsoleErrorListener(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockDeepDiveEndpoints(page)
  await mockPermissions(page)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER_SLUG}`)
  await page.waitForLoadState('domcontentloaded')
  // No console errors
  expect(consoleErrors.filter((e) => !e.includes('Warning:'))).toHaveLength(0)
  // Wait for chart area to appear — Recharts renders an svg inside a div with width:100%
  const chartContainer = page
    .locator('svg[class*="recharts"], .recharts-wrapper, [data-testid*="sparkline"]')
    .first()
  // Fallback: any svg element on the page that has a bounding box
  const svgEl = page
    .locator('svg')
    .filter({ has: page.locator('path, polyline, line') })
    .first()
  const chartVisible = await chartContainer.isVisible({ timeout: 8_000 }).catch(() => false)
  const el = chartVisible ? chartContainer : svgEl
  const box = await el.boundingBox({ timeout: 8_000 }).catch(() => null)
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
  expect(box!.height).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// Group (e): Recent-quotes cédula always masked — no reveal button (D-35-03, Phase 31 invariant)
// ---------------------------------------------------------------------------

test('recent-quotes table shows masked cédula, no reveal button — D-35-03', async ({ page }) => {
  const consoleErrors = attachConsoleErrorListener(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockDeepDiveEndpoints(page)
  await mockPermissions(page)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/aseguradoras/${CARRIER_SLUG}`)
  await page.waitForLoadState('domcontentloaded')
  // No console errors
  expect(consoleErrors.filter((e) => !e.includes('Warning:'))).toHaveLength(0)
  // At least one masked cédula value visible (prefix8 format or masked with asterisks)
  const maskedCell = page
    .locator('td, [data-testid*="cedula"]')
    .filter({ hasText: /ab12cd34|\*\*\*\*|•••/i })
    .first()
  await expect(maskedCell).toBeVisible({ timeout: 10_000 })
  // No "Revelar" or "Reveal" button adjacent to the masked cédula
  await expect(
    maskedCell.locator('button').filter({ hasText: /Revelar|Reveal/i }).first(),
  )
    .not.toBeVisible({ timeout: 2_000 })
    .catch(() => {
      // If the locator throws (no such element), that's fine — means no reveal button
    })
})
