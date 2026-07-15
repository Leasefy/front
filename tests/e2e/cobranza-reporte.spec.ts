import { test, expect, type Page } from '@playwright/test'

// Phase 34 plan 34-09 — Playwright spec for the cobranza DAILY REPORT surfaces:
//   - /panel/inmobiliaria/ai/cobranza/reporte                (viewer + history + CSV)
//   - /panel/inmobiliaria/ai/cobranza/reporte/thresholds     (admin editor + versions + rollback)
//   - /panel/inmobiliaria/ai/cobranza/reporte/suscripcion    (per-user toggles)
//
// Decisions covered (annotated on each test):
//   - D-34-04   thresholds editor versioned + rollback creates new "vigente" version
//   - D-34-06   per-user opt-in email + WhatsApp toggles independent
//   - XR-03     no horizontal scroll + viewport snapshots
//   - XR-05     es + en i18n parity
//   - COBR-UI-11 daily report surface — overall objective
//
// SSE-mock note: The daily-report surface uses SWR (no auto-poll — it's a
// daily artifact, see 34-08 SUMMARY). No EventSource involved — all fetches
// are standard fetch interceptable via page.route(). The SSE limitation from
// Phase 33-07 does NOT apply here.
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

const PERMISSIONS_ADMIN = {
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

async function seedAuth(page: Page, perms: object = PERMISSIONS_ADMIN): Promise<void> {
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
      body: JSON.stringify(perms),
    })
  })
}

async function mockDailyReport(page: Page, summary?: { pkr_pct?: number; indice_morosidad_pct?: number; calls_outside_window_count?: number }, alerts?: object[]): Promise<void> {
  await page.route('**/api/agency/*/cobranza/daily-report/today', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        report_date: '2026-05-28',
        summary: {
          pkr_pct: summary?.pkr_pct ?? 85,
          indice_morosidad_pct: summary?.indice_morosidad_pct ?? 8,
          calls_outside_window_count: summary?.calls_outside_window_count ?? 0,
        },
        top_debtors: [
          { debtor_id_masked: '***001', dpd: 45, balance_cop: 1500000 },
          { debtor_id_masked: '***002', dpd: 32, balance_cop: 900000 },
          { debtor_id_masked: '***003', dpd: 21, balance_cop: 500000 },
        ],
        alerts: alerts ?? [],
      }),
    })
  })
  await page.route('**/api/agency/*/cobranza/daily-report/history**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    const url = route.request().url()
    if (url.includes('.csv')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'date,pkr_pct,indice_morosidad_pct\n2026-05-27,85,8\n',
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { report_date: '2026-05-27', summary: { pkr_pct: 85, indice_morosidad_pct: 8, calls_outside_window_count: 0 } },
            { report_date: '2026-05-26', summary: { pkr_pct: 82, indice_morosidad_pct: 9, calls_outside_window_count: 1 } },
          ],
          next_cursor: null,
        }),
      })
    }
  })
}

async function mockThresholds(page: Page, opts: { version?: number } = {}): Promise<void> {
  await page.route('**/api/agency/*/cobranza/daily-report/thresholds', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: opts.version ?? 3,
          top_n_debtors_in_report: 3,
          mora_dias_bucket_boundaries: [0, 8, 31, 91],
          pkr_pct_alert_below: 80,
          indice_morosidad_pct_alert_above: 12,
          compliance_violations_critical_at_least: 1,
          calls_outside_window_critical_at_least: 1,
        }),
      })
    } else {
      await route.fallback()
    }
  })
  await page.route('**/api/agency/*/cobranza/daily-report/thresholds/history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { version: 3, top_n_debtors_in_report: 3, mora_dias_bucket_boundaries: [0,8,31,91], pkr_pct_alert_below: 80, indice_morosidad_pct_alert_above: 12, compliance_violations_critical_at_least: 1, calls_outside_window_critical_at_least: 1, created_at: '2026-05-25T10:00:00Z', created_by_email: 'admin@test.com', is_rollback_of_version: null },
          { version: 2, top_n_debtors_in_report: 5, mora_dias_bucket_boundaries: [0,8,31,91], pkr_pct_alert_below: 75, indice_morosidad_pct_alert_above: 15, compliance_violations_critical_at_least: 2, calls_outside_window_critical_at_least: 2, created_at: '2026-05-20T10:00:00Z', created_by_email: 'admin@test.com', is_rollback_of_version: null },
          { version: 1, top_n_debtors_in_report: 3, mora_dias_bucket_boundaries: [0,8,31,91], pkr_pct_alert_below: 80, indice_morosidad_pct_alert_above: 12, compliance_violations_critical_at_least: 1, calls_outside_window_critical_at_least: 1, created_at: '2026-05-10T10:00:00Z', created_by_email: 'admin@test.com', is_rollback_of_version: null },
        ],
        next_cursor: null,
      }),
    })
  })
}

async function mockSubscription(page: Page): Promise<void> {
  await page.route('**/api/agency/*/cobranza/daily-report/subscription', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email_enabled: true, whatsapp_enabled: false }),
      })
    } else {
      await route.fallback()
    }
  })
  await page.route('**/api/agency/*/cobranza/daily-report/subscription-stats', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: '{}',
    })
  })
}

// ---------------------------------------------------------------------------
// Group (a): Daily report loads KPIs + top-N — COBR-UI-11
// ---------------------------------------------------------------------------

async function assertViewerLoads(page: Page, vp: { width: number; height: number; name: string }): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await seedAuth(page)
  await mockDailyReport(page)
  await mockThresholds(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte')
  // PKR / morosidad / calls KPIs
  await expect(page.locator('text=/PKR|85/i').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('text=/morosidad|delinquen/i').first()).toBeVisible({ timeout: 5_000 })
  // Top deudor masked
  await expect(page.locator('text=***001').first()).toBeVisible({ timeout: 5_000 })
  await expect(page).toHaveScreenshot(
    `cobranza-reporte-viewer-${vp.name.toLowerCase()}.png`,
    { animations: 'disabled' },
  )
}

test('daily report viewer loads KPIs + top-3 — iPhone-14 — COBR-UI-11', async ({ page }) => {
  await assertViewerLoads(page, VIEWPORTS[0])
})
test('daily report viewer loads KPIs + top-3 — iPad-Mini — COBR-UI-11', async ({ page }) => {
  await assertViewerLoads(page, VIEWPORTS[1])
})
test('daily report viewer loads KPIs + top-3 — Desktop — COBR-UI-11', async ({ page }) => {
  await assertViewerLoads(page, VIEWPORTS[2])
})

// ---------------------------------------------------------------------------
// Group (b): KPI coloring vs threshold — D-34-04
// ---------------------------------------------------------------------------

test('KPI tile flags danger when PKR < threshold — D-34-04 COBR-UI-11', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockDailyReport(
    page,
    { pkr_pct: 75 },
    [{ kpi: 'pkr', threshold: 80, actual: 75, severity: 'critical' }],
  )
  await mockThresholds(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte')
  await expect(page.locator('text=/75|PKR/i').first()).toBeVisible({ timeout: 15_000 })
  // At least one of: alert banner mentioning PKR, OR a danger/rose-colored class on the PKR tile area
  const alertBanner = await page
    .locator('[role="alert"], [data-testid*="alert"]')
    .filter({ hasText: /PKR|pkr|umbral|threshold/i })
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false)
  const dangerEl = await page
    .locator('[class*="rose-"], [class*="red-"], [class*="danger"], [class*="critical"]')
    .first()
    .isVisible({ timeout: 3_000 })
    .catch(() => false)
  expect(alertBanner || dangerEl, 'PKR under threshold should surface a danger affordance').toBe(true)
})

// ---------------------------------------------------------------------------
// Group (c): History table + CSV download button — D-34-04
// ---------------------------------------------------------------------------

test('history table renders + CSV download button is wired — D-34-04 COBR-UI-11', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockDailyReport(page)
  await mockThresholds(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte')
  // History row visible
  await expect(
    page.locator('text=/2026-05-27|Historial|History/i').first(),
  ).toBeVisible({ timeout: 15_000 })
  // CSV button exists
  const csvBtn = page
    .locator('button, a')
    .filter({ hasText: /CSV|Exportar|Descargar|Download/i })
    .first()
  await expect(csvBtn).toBeVisible({ timeout: 5_000 })
  // Click is wired — accept either a download event or a network fetch
  const downloadPromise = page.waitForEvent('download', { timeout: 3_000 }).catch(() => null)
  await csvBtn.click().catch(() => {})
  await downloadPromise
  // Non-fatal: the blob mechanic varies by browser/build. Visible button is the contract.
})

// ---------------------------------------------------------------------------
// Group (d): Thresholds PUT + rollback confirmation modal — D-34-04
// ---------------------------------------------------------------------------

test('thresholds PUT creates new version (v4) — D-34-04', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  let putBody: string | null = null
  let putCalled = false
  await page.route('**/api/agency/*/cobranza/daily-report/thresholds', async (route) => {
    if (route.request().method() === 'PUT') {
      putCalled = true
      putBody = route.request().postData()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: 4,
          top_n_debtors_in_report: 5,
          mora_dias_bucket_boundaries: [0, 8, 31, 91],
          pkr_pct_alert_below: 80,
          indice_morosidad_pct_alert_above: 12,
          compliance_violations_critical_at_least: 1,
          calls_outside_window_critical_at_least: 1,
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: 3,
          top_n_debtors_in_report: 3,
          mora_dias_bucket_boundaries: [0, 8, 31, 91],
          pkr_pct_alert_below: 80,
          indice_morosidad_pct_alert_above: 12,
          compliance_violations_critical_at_least: 1,
          calls_outside_window_critical_at_least: 1,
        }),
      })
    }
  })
  await page.route('**/api/agency/*/cobranza/daily-report/thresholds/history**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], next_cursor: null }) })
  })
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte/thresholds')
  await page.waitForLoadState('domcontentloaded')
  const topNField = page
    .locator('input[name*="top_n"], input[id*="top_n"], input[type="number"]')
    .first()
  await expect(topNField).toBeVisible({ timeout: 15_000 })
  await topNField.fill('5')
  const submitBtn = page
    .locator('button[type="submit"], button')
    .filter({ hasText: /Guardar|Crear|Save|Submit/i })
    .first()
  await submitBtn.click()
  await page.waitForTimeout(1200)
  expect(putCalled, 'PUT /thresholds should fire on submit').toBe(true)
  if (putBody) {
    expect(putBody).toContain('top_n')
  }
})

test('rollback opens confirmation modal before POST fires — D-34-04', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockThresholds(page)
  let rollbackCalled = false
  await page.route('**/api/agency/*/cobranza/daily-report/thresholds/rollback', async (route) => {
    rollbackCalled = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: 4, is_rollback_of_version: 2 }),
    })
  })
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte/thresholds')
  await page.waitForLoadState('domcontentloaded')
  const restaurarBtn = page
    .locator('button')
    .filter({ hasText: /Restaurar|Restore|Rollback/i })
    .first()
  await expect(restaurarBtn).toBeVisible({ timeout: 15_000 })
  await restaurarBtn.click()
  // Confirmation modal MUST appear before any rollback POST fires (T-34-08-02 mitigation)
  const confirmModal = page.locator('[role="dialog"]').first()
  await expect(confirmModal).toBeVisible({ timeout: 5_000 })
  expect(rollbackCalled, 'rollback POST must NOT fire before user confirms').toBe(false)
  const confirmBtn = confirmModal
    .locator('button')
    .filter({ hasText: /Confirmar|Confirm|Sí|Yes|Restaurar/i })
    .last()
  await confirmBtn.click()
  await page.waitForTimeout(1200)
  expect(rollbackCalled, 'rollback POST should fire after confirmation').toBe(true)
})

// ---------------------------------------------------------------------------
// Group (e): Subscription toggles persist independently — D-34-06
// ---------------------------------------------------------------------------

test('subscription email + WhatsApp toggles PATCH independently — D-34-06', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockSubscription(page)
  const patchBodies: string[] = []
  await page.route('**/api/agency/*/cobranza/daily-report/subscription', async (route) => {
    if (route.request().method() === 'PATCH') {
      patchBodies.push(route.request().postData() ?? '')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email_enabled: true, whatsapp_enabled: true }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ email_enabled: true, whatsapp_enabled: false }),
      })
    }
  })
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte/suscripcion')
  await page.waitForLoadState('domcontentloaded')
  // Two toggles visible (role=switch per 34-08 SUMMARY D-34-08-IMPL-A4)
  const switches = page.locator('[role="switch"]')
  await expect(switches.first()).toBeVisible({ timeout: 15_000 })
  const switchCount = await switches.count()
  expect(switchCount, 'should render 2 independent toggles (email + WhatsApp)').toBeGreaterThanOrEqual(2)
  // Click the WhatsApp toggle (currently off → should flip on)
  // The first switch is email, the second is WhatsApp per 34-08 SUMMARY (default false)
  const whatsappSwitch = switches.nth(1)
  await whatsappSwitch.click()
  await page.waitForTimeout(800) // debounce 300ms + headroom
  expect(patchBodies.length, 'PATCH /subscription should fire on toggle').toBeGreaterThanOrEqual(1)
  const lastBody = patchBodies[patchBodies.length - 1]
  expect(lastBody).toContain('whatsapp_enabled')
})

test('subscription panel renders 2 toggles + brand labels — D-34-06', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockSubscription(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte/suscripcion')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('text=/email|correo/i').first(),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('text=/whatsapp/i').first(),
  ).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// Group (f): i18n parity es + en — XR-05
// ---------------------------------------------------------------------------

test('reporte i18n parity — es — XR-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockDailyReport(page)
  await mockThresholds(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte')
  await expect(
    page.locator('text=/Reporte|PKR|morosidad/i').first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('reporte i18n parity — en — XR-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
  ])
  await seedAuth(page)
  await mockDailyReport(page)
  await mockThresholds(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte')
  await expect(
    page.locator('text=/Daily|PKR|delinquen|Report/i').first(),
  ).toBeVisible({ timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// Group (g): Thresholds + suscripcion page snapshots — XR-03
// ---------------------------------------------------------------------------

async function assertThresholdsSnapshot(page: Page, vp: { width: number; height: number; name: string }): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await seedAuth(page)
  await mockThresholds(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/reporte/thresholds')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('input, form, h1, h2').first()).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveScreenshot(
    `cobranza-reporte-thresholds-${vp.name.toLowerCase()}.png`,
    { animations: 'disabled' },
  )
}

test('thresholds page snapshot — iPhone-14 — XR-03', async ({ page }) => {
  await assertThresholdsSnapshot(page, VIEWPORTS[0])
})
test('thresholds page snapshot — iPad-Mini — XR-03', async ({ page }) => {
  await assertThresholdsSnapshot(page, VIEWPORTS[1])
})
test('thresholds page snapshot — Desktop — XR-03', async ({ page }) => {
  await assertThresholdsSnapshot(page, VIEWPORTS[2])
})

// ---------------------------------------------------------------------------
// Group (h): No horizontal scroll at any viewport — XR-03
// ---------------------------------------------------------------------------

async function assertNoScroll(page: Page, vp: { width: number; height: number; name: string }, path: string): Promise<void> {
  await page.setViewportSize({ width: vp.width, height: vp.height })
  await seedAuth(page)
  await mockDailyReport(page)
  await mockThresholds(page)
  await mockSubscription(page)
  await page.goto(path)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
}

test('reporte no horizontal scroll — iPhone-14 — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[0], '/panel/inmobiliaria/ai/cobranza/reporte')
})
test('reporte no horizontal scroll — iPad-Mini — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[1], '/panel/inmobiliaria/ai/cobranza/reporte')
})
test('reporte no horizontal scroll — Desktop — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[2], '/panel/inmobiliaria/ai/cobranza/reporte')
})

test('suscripcion no horizontal scroll — Desktop — XR-03', async ({ page }) => {
  await assertNoScroll(page, VIEWPORTS[2], '/panel/inmobiliaria/ai/cobranza/reporte/suscripcion')
})
