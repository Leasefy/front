import { test, expect, type Page } from '@playwright/test'

// Phase 34 plan 34-09 — Playwright spec for the cobranza COMPLIANCE surfaces:
//   - /panel/inmobiliaria/cobros/cobranza/compliance         (overview)
//   - /panel/inmobiliaria/cobros/cobranza/compliance/ley-2300
//   - /panel/inmobiliaria/cobros/cobranza/compliance/opt-out
//   - /panel/inmobiliaria/cobros/cobranza/compliance/audit
//
// Decisions covered (annotated on each test):
//   - D-34-RES-A1 page-level red banner when ANY open habeas-data request <= 15 days
//   - D-34-07    4-tier habeas-data SLA coloring (green/yellow/red/red-pulse)
//   - D-34-08    audit log with 4 combinable filters (actor/action/date/q)
//   - Phase 31 PII invariant — Mask never reveals on the forensic audit page
//                (onReveal undefined + no PIIRevealContext.Provider in subtree)
//   - XR-03       no horizontal scroll + viewport snapshots
//   - XR-05       es + en i18n parity
//   - COBR-UI-10  compliance health surface — overall objective
//
// SSE-mock note: Phase 34 surfaces use SWR 60s polling (D-34-03), NOT
// EventSource — so page.route() mocks intercept fetch reliably. The SSE
// limitation observed in Phase 33-07 does NOT apply here.
//
// v2.1 visual-smoke env workaround (NEVER commit these source tweaks):
//   1. src/app/panel/inmobiliaria/layout.tsx — add 'tenant' to allowedRoles
//   2. src/lib/context/PermissionsContext.tsx — add localhost-bypass in canAccess
//   Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local.
//
// Re-capture procedure: see cobranza-escalaciones.spec.ts header.

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const PERMISSIONS_FULL = {
  modules: {
    cobranza: {
      view: true,
      configure: true,
      'edit-thresholds': true,
    },
  },
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
  await page.route('**/my-permissions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PERMISSIONS_FULL),
    })
  })
}

interface HabeasReq {
  event_id: string
  debtor_id_masked: string
  opened_at: string
  remaining_days: number
  color: 'green' | 'yellow' | 'red' | 'red-pulse'
}

async function mockComplianceOverview(
  page: Page,
  opts: { outsideCount?: number; habeasRequests?: HabeasReq[] } = {},
): Promise<void> {
  const habeas = opts.habeasRequests ?? [
    { event_id: 'hd-01', debtor_id_masked: '***111', opened_at: '2026-05-13T10:00:00Z', remaining_days: 1, color: 'red-pulse' },
    { event_id: 'hd-02', debtor_id_masked: '***222', opened_at: '2026-05-18T10:00:00Z', remaining_days: 10, color: 'yellow' },
    { event_id: 'hd-03', debtor_id_masked: '***333', opened_at: '2026-05-01T10:00:00Z', remaining_days: 27, color: 'green' },
  ]
  await page.route('**/api/agency/*/cobranza/compliance/overview', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ley_2300: { weekly_outside_hours_count: opts.outsideCount ?? 0, target: 0 },
        habeas_data: { open_requests: habeas },
        retention: { compliance_pct: 94, target: 100 },
        sparkline: {
          daily_buckets_30d: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-04-${String(29 - (i % 29)).padStart(2, '0')}`,
            flag_rate_pct: (i % 5),
          })),
        },
      }),
    })
  })
}

async function mockAuditLog(page: Page): Promise<void> {
  await page.route('**/api/agency/*/cobranza/compliance/audit-log*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'a1',
            actor_email: 'agente@test.com',
            action: 'escalation_resolve',
            cedula_hash_prefix8: 'abcd1234',
            entity_id: 'esc-01',
            recorded_at: '2026-05-27T09:00:00Z',
          },
          {
            id: 'a2',
            actor_email: 'admin@test.com',
            action: 'threshold_edit',
            cedula_hash_prefix8: null,
            entity_id: 'thr-01',
            recorded_at: '2026-05-26T14:00:00Z',
          },
        ],
        next_cursor: null,
      }),
    })
  })
  // Members endpoint for the actor dropdown
  await page.route('**/agency/members**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 'u1', email: 'agente@test.com', name: 'Agente Uno', role: 'agente', status: 'active' },
          { id: 'u2', email: 'admin@test.com', name: 'Admin Uno', role: 'admin', status: 'active' },
        ],
      }),
    })
  })
}

// ---------------------------------------------------------------------------
// Group (a): Overview red banner when remaining_days <= 15 — D-34-RES-A1 D-34-07
// ---------------------------------------------------------------------------

async function assertOverviewBanner(page: Page, vp: { width: number; height: number; name: string }): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await seedAuth(page)
  await mockComplianceOverview(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance')
  const banner = page
    .locator('[role="alert"], [data-testid*="habeas-banner"], [data-testid*="alert-banner"]')
    .filter({ hasText: /.+/ })
    .first()
  await expect(banner).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveScreenshot(
    `cobranza-compliance-overview-banner-${vp.name.toLowerCase()}.png`,
    { animations: 'disabled' },
  )
}

test('compliance overview red banner @ remaining_days=1 — iPhone-14 — D-34-RES-A1 D-34-07 COBR-UI-10', async ({ page }) => {
  await assertOverviewBanner(page, VIEWPORTS[0])
})
test('compliance overview red banner @ remaining_days=1 — iPad-Mini — D-34-RES-A1 D-34-07 COBR-UI-10', async ({ page }) => {
  await assertOverviewBanner(page, VIEWPORTS[1])
})
test('compliance overview red banner @ remaining_days=1 — Desktop — D-34-RES-A1 D-34-07 COBR-UI-10', async ({ page }) => {
  await assertOverviewBanner(page, VIEWPORTS[2])
})

test('compliance overview NO banner when all remaining_days > 15 — D-34-RES-A1', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockComplianceOverview(page, {
    habeasRequests: [
      { event_id: 'hd-safe', debtor_id_masked: '***999', opened_at: '2026-05-01T10:00:00Z', remaining_days: 20, color: 'green' },
    ],
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  const alertCount = await page
    .locator('[role="alert"]')
    .filter({ hasText: /habeas|15.*día|deadline/i })
    .count()
  expect(alertCount).toBe(0)
})

// ---------------------------------------------------------------------------
// Group (b): Habeas Data 4-tier coloring — D-34-07
// ---------------------------------------------------------------------------

test('habeas data progress bars match 4-tier color scheme — D-34-07', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockComplianceOverview(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance')
  // red-pulse — Tailwind animate-pulse on the bar or border (per 34-07 SUMMARY)
  await expect(page.locator('.animate-pulse').first()).toBeVisible({ timeout: 15_000 })
  // amber/yellow tier (Tailwind bg-amber-500 per 34-07 mapping)
  await expect(
    page.locator('[class*="amber-"], [data-color="yellow"]').first(),
  ).toBeVisible({ timeout: 5_000 })
  // emerald/green tier (Tailwind bg-emerald-500 per 34-07 mapping)
  await expect(
    page.locator('[class*="emerald-"], [data-color="green"]').first(),
  ).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// Group (c): Sparkline + retention % render — COBR-UI-10
// ---------------------------------------------------------------------------

test('sparkline + retention % render on overview — COBR-UI-10', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockComplianceOverview(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance')
  await expect(
    page.locator('text=/94|94 ?%|retención/i').first(),
  ).toBeVisible({ timeout: 15_000 })
  const chart = page
    .locator('svg, canvas, [data-testid*="sparkline"], [data-testid*="chart"]')
    .first()
  await expect(chart).toBeVisible({ timeout: 8_000 })
})

// ---------------------------------------------------------------------------
// Group (d): Audit-log 4 filters + PII invariant (Mask never reveals) — D-34-08
// Threat T-34-09-02 mitigation: no "Revelar" button adjacent to masked cedula
// ---------------------------------------------------------------------------

test('audit-log 4 filters present; no Revelar button adjacent to masked cedula — D-34-08 Phase 31 PII invariant', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockAuditLog(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance/audit')
  await page.waitForLoadState('domcontentloaded')
  // Table renders
  await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 15_000 })
  // 4 combinable filters
  const actorFilter = page
    .locator(
      'select[name*="actor"], [data-testid*="filter-actor"], select:near(:text("Actor"))',
    )
    .first()
  await expect(actorFilter).toBeVisible({ timeout: 5_000 })
  const actionFilter = page
    .locator('select[name*="action"], [data-testid*="filter-action"]')
    .first()
  await expect(actionFilter).toBeVisible({ timeout: 5_000 })
  await expect(
    page.locator('input[type="date"]').first(),
  ).toBeVisible({ timeout: 5_000 })
  await expect(
    page.locator('input[type="text"], input[type="search"]').first(),
  ).toBeVisible({ timeout: 5_000 })
  // PII invariant — cedula cell visible, but NO Revelar/Reveal button anywhere on page
  await expect(page.locator('text=/abcd1234/i').first()).toBeVisible({ timeout: 5_000 })
  const revealCount = await page
    .locator('button')
    .filter({ hasText: /Revelar|Reveal/i })
    .count()
  expect(revealCount, 'PII Mask must NOT have a Revelar/Reveal trigger on audit page').toBe(0)
})

test('audit-log search filter sends q param to backend — D-34-08', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  const auditRequests: string[] = []
  await page.route('**/api/agency/*/cobranza/compliance/audit-log*', async (route) => {
    auditRequests.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], next_cursor: null }),
    })
  })
  await page.route('**/agency/members**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance/audit')
  await page.waitForLoadState('domcontentloaded')
  const searchInput = page
    .locator('input[type="text"], input[type="search"]')
    .first()
  await expect(searchInput).toBeVisible({ timeout: 15_000 })
  await searchInput.fill('abcd1234')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const hasQ = auditRequests.some((u) => u.includes('q=abcd'))
  expect(hasQ, 'audit-log request should include q=abcd... after filter').toBe(true)
})

test('audit-log date-range filter sends from/to params — D-34-08', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  const auditRequests: string[] = []
  await page.route('**/api/agency/*/cobranza/compliance/audit-log*', async (route) => {
    auditRequests.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], next_cursor: null }),
    })
  })
  await page.route('**/agency/members**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance/audit')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
  // Default `from`/`to` (last 7d) should be in the initial query
  const hasFromOrTo = auditRequests.some((u) => /from=\d{4}-/.test(u) || /to=\d{4}-/.test(u))
  expect(hasFromOrTo, 'audit-log initial fetch should include from/to query params').toBe(true)
})

// ---------------------------------------------------------------------------
// Group (e): Ley 2300 sub-page renders attempt table — COBR-UI-10
// ---------------------------------------------------------------------------

test('ley-2300 sub-page renders attempt table — COBR-UI-10', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await page.route('**/api/agency/*/cobranza/compliance/ley-2300/attempts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            event_id: 'evt-01',
            debtor_id_masked: '***100',
            channel: 'phone',
            timestamp: '2026-05-27T22:00:00Z',
            direction: 'outbound',
          },
        ],
        next_cursor: null,
      }),
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance/ley-2300')
  await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('text=***100').first()).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// Group (f): Opt-out registry + Marcar acuse — COBR-UI-10
// ---------------------------------------------------------------------------

test('opt-out registry shows pending items + acknowledge button — COBR-UI-10', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await page.route('**/api/agency/*/cobranza/compliance/opt-out*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            event_id: 'oo-01',
            debtor_id_masked: '***200',
            opened_at: '2026-05-20T10:00:00Z',
            source: 'inbound',
            acknowledged_at: null,
          },
        ],
        next_cursor: null,
      }),
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance/opt-out')
  await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('text=/Pendiente|Marcar.?acuse|Acknowledge/i').first(),
  ).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// Group (g): i18n parity es + en — XR-05
// ---------------------------------------------------------------------------

test('compliance i18n parity — es — XR-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockComplianceOverview(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance')
  await expect(
    page.locator('text=/Retención|Habeas Data|Ley 2300/i').first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('compliance i18n parity — en — XR-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
  ])
  await seedAuth(page)
  await mockComplianceOverview(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/compliance')
  await expect(
    page.locator('text=/Retention|Habeas Data|Law 2300|Compliance/i').first(),
  ).toBeVisible({ timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// Group (h): No horizontal scroll at any viewport — XR-03
// ---------------------------------------------------------------------------

async function assertNoScroll(page: Page, vp: { width: number; height: number; name: string }, path: string): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await seedAuth(page)
  await mockComplianceOverview(page)
  await mockAuditLog(page)
  await page.goto(path)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
}

test('compliance overview no horizontal scroll — iPhone-14 — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[0], '/panel/inmobiliaria/cobros/cobranza/compliance')
})
test('compliance overview no horizontal scroll — iPad-Mini — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[1], '/panel/inmobiliaria/cobros/cobranza/compliance')
})
test('compliance overview no horizontal scroll — Desktop — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[2], '/panel/inmobiliaria/cobros/cobranza/compliance')
})
test('compliance audit no horizontal scroll — iPhone-14 — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[0], '/panel/inmobiliaria/cobros/cobranza/compliance/audit')
})
test('compliance audit no horizontal scroll — Desktop — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[2], '/panel/inmobiliaria/cobros/cobranza/compliance/audit')
})
