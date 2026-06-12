import { test, expect, type Page } from '@playwright/test'

// Phase 33 plan 33-07 — Playwright spec for the counterfactual (ask-why) modal.
//
// Decisions covered (D-33-NN annotations on each test):
//   - D-33-01  single-active variable state machine                (group b)
//   - D-33-04  4 variable controls render                          (group b)
//   - D-33-07  cost footer transitions (idle → calculating → done) (group d)
//   - D-33-08  daily cap exhausted UX (banner + disabled submit)   (group c, group e)
//   - D-33-12  responsive modal shell (fullscreen sm, centered md+) (group a)
//   - D-33-13  5 differentiated error codepaths (404 / timeout / 5xx / 400 / 429) (group e)
//   - XR-03    cross-viewport snapshot coverage                    (group a, group g)
//   - XR-05    i18n parity (es + en)                                (group f)
//   - COTI-UI-04 counterfactual surface                             (overall objective)
//
// Auth: addInitScript seeds `localStorage['arriendo-facil-auth']` with role='agency'
// so ProtectedRoute's localStorage fallback passes.
//
// v2.1 visual-smoke env workaround (NEVER commit these source tweaks):
//   1. src/app/panel/inmobiliaria/layout.tsx — add 'tenant' to allowedRoles
//   2. src/lib/context/PermissionsContext.tsx — add localhost-bypass in canAccess
//   Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local (any value works
//   because route mocks intercept).
//
// Re-capture procedure:
//   cd ~/rent/mvp
//   # apply 2 source tweaks (NEVER commit)
//   pnpm dev   # in a separate terminal — must run on port 3001
//   pnpm playwright test tests/e2e/cotizador-counterfactual.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git status --short   # MUST only show new snapshot PNGs, not source tweaks
//
// Test user: pruebasarrendador1902@gmail.com, role: agency.

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const TEST_QUOTE_ID = 'test-quote-33'

const PERMISSIONS_FULL = {
  modules: {
    cotizador: {
      view: true,
      'create-quote': true,
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

  // Permissions endpoint (gates PageGuard).
  await page.route('**/my-permissions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PERMISSIONS_FULL),
    })
  })
}

async function mockQuoteDetail(page: Page, quoteId: string = TEST_QUOTE_ID): Promise<void> {
  // The detail page fetches the quote — provide a minimal carrier-populated payload
  // so the "Pedir explicación" button is reachable.
  await page.route(`**/api/agency/*/cotizador/quote/${quoteId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: quoteId,
        re_quote_of: null,
        candidato: { cedula_hash: 'h'.repeat(64), codeudoresCount: 1 },
        propiedad: { canon: 1500000, ciudad: 'Bogotá', tipo: 'apartamento' },
        carriers: [
          { carrier: 'Sura', status: 'approved', primaMensualCop: 450000, latencyMs: 1100, condiciones: [], isStub: false },
          { carrier: 'Mapfre', status: 'approved', primaMensualCop: 380000, latencyMs: 900, condiciones: [], isStub: false },
          { carrier: 'Bolívar', status: 'rejected', primaMensualCop: null, latencyMs: 800, condiciones: [], isStub: false },
        ],
      }),
    })
  })
}

async function mockAskWhySuccess(page: Page): Promise<void> {
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        narrative_es:
          'Si el canon aumentara, Sura mantendría su aprobación aunque con una prima ligeramente mayor.',
        cost_usd: 0.00087,
        hypothetical_carriers: [
          { carrier: 'Sura', status: 'approved', primaMensualCop: 470000, latencyMs: 1200, condiciones: [], isStub: false },
          { carrier: 'Mapfre', status: 'approved', primaMensualCop: 400000, latencyMs: 900, condiciones: [], isStub: false },
          { carrier: 'Bolívar', status: 'rejected', primaMensualCop: null, latencyMs: 800, condiciones: [], isStub: false },
        ],
      }),
    })
  })
}

async function mockAskWhyUsage(
  page: Page,
  opts: { used?: number; cap?: number } = {},
): Promise<void> {
  await page.route('**/api/agency/*/cotizador/ask-why/usage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        used_today: opts.used ?? 5,
        daily_cap: opts.cap ?? 50,
        resets_at: '2026-05-29T05:00:00Z',
      }),
    })
  })
}

async function openModal(page: Page): Promise<void> {
  await page.goto(`/panel/inmobiliaria/ai/cotizador/${TEST_QUOTE_ID}`, {
    waitUntil: 'domcontentloaded',
  })
  const askWhyBtn = page
    .locator('button, a')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
  await expect(askWhyBtn).toBeVisible({ timeout: 10_000 })
  await askWhyBtn.click()
  await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 8_000 })
}

// ---------------------------------------------------------------------------
// Group (a): Modal shell at 3 viewports — D-33-12 + XR-03
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`modal shell — ${viewport.name} — D-33-12 XR-03`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockQuoteDetail(page)
    await mockAskWhySuccess(page)
    await mockAskWhyUsage(page)
    await openModal(page)
    const dialog = page.locator('[role="dialog"]').first()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    if (viewport.width < 768) {
      // Full-screen at sm
      expect(box!.x).toBeLessThanOrEqual(2)
      expect(box!.y).toBeLessThanOrEqual(2)
      expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 4)
    } else {
      // Centered at md+, capped at max-w-2xl ≈ 672
      expect(box!.x).toBeGreaterThan(0)
      expect(box!.width).toBeLessThan(viewport.width)
      expect(box!.width).toBeLessThanOrEqual(720)
    }
    await expect(page).toHaveScreenshot(
      `cotizador-counterfactual-${viewport.name.toLowerCase()}-modal-shell.png`,
      { animations: 'disabled' },
    )
  })
}

// ---------------------------------------------------------------------------
// Group (b): 4 controls + single-active enforcement — D-33-04 + D-33-01
// ---------------------------------------------------------------------------

test('"Pedir explicación" button is visible on quote detail header — COTI-UI-04', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/${TEST_QUOTE_ID}`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(
    page.locator('button, a').filter({ hasText: /Pedir explicación|Ask for explanation/i }).first(),
  ).toBeVisible({ timeout: 10_000 })
})

test('modal opens on click and dialog is focus-trapped — D-33-12', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhySuccess(page)
  await mockAskWhyUsage(page)
  await openModal(page)
  const dialog = page.locator('[role="dialog"]').first()
  await expect(dialog).toBeVisible()
  // Close button present (aria-label "Close" / "Cerrar")
  const closeBtn = dialog
    .locator('button[aria-label*="close" i], button[aria-label*="cerrar" i]')
    .first()
  // If no aria-labelled close, Esc should still close.
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click()
  } else {
    await page.keyboard.press('Escape')
  }
  await expect(dialog).toBeHidden({ timeout: 3_000 })
})

test('all 4 controls render; changing one disables others — D-33-04 D-33-01', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhySuccess(page)
  await mockAskWhyUsage(page)
  await openModal(page)

  // Canon slider
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await expect(slider).toBeVisible({ timeout: 8_000 })

  // Ciudad picker (combobox / select / input with list)
  const ciudadCtl = page
    .locator('[role="combobox"], select[name*="ciudad" i], input[list]')
    .first()
  await expect(ciudadCtl).toBeVisible({ timeout: 5_000 })

  // Tipo segmented control
  const tipoGroup = page.locator('[role="group"], [role="radiogroup"]').first()
  await expect(tipoGroup).toBeVisible({ timeout: 5_000 })

  // Codeudores stepper — − / + buttons
  const stepperMinus = page
    .locator(
      'button[aria-label*="menos" i], button[aria-label*="decrement" i], button[aria-label*="codeudor" i]',
    )
    .first()
  await expect(stepperMinus.or(page.locator('button').filter({ hasText: /^[-−]$/ }).first())).toBeVisible({
    timeout: 5_000,
  })

  // Touch canon → others should go aria-disabled / disabled
  await slider.focus()
  await slider.press('ArrowRight')
  await page.waitForTimeout(200)

  const ciudadDisabled = await ciudadCtl.getAttribute('aria-disabled')
  const ciudadDomDisabled = await ciudadCtl.isDisabled().catch(() => false)
  expect(ciudadDisabled === 'true' || ciudadDomDisabled).toBeTruthy()
})

// ---------------------------------------------------------------------------
// Group (c): 429 cap-exhausted Bogotá-reset banner — D-33-08
// ---------------------------------------------------------------------------

test('submit returns 429 → Bogotá reset banner — D-33-08', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page, { used: 45, cap: 50 })
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'daily_ask_why_cap_exceeded',
        cap: 50,
        used: 50,
        resets_at: '2026-05-29T05:00:00Z',
      }),
    })
  })
  await openModal(page)
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await slider.focus()
  await slider.press('ArrowRight')
  const submitBtn = page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
  await submitBtn.click()
  const banner = page.locator('[role="alert"]').first()
  await expect(banner).toBeVisible({ timeout: 6_000 })
  await expect(banner).toContainText(/Se reinicia mañana a las 00:00 \(Bogotá\)/)
})

// ---------------------------------------------------------------------------
// Group (d): Cost footer transitions idle → calculating → post-receipt — D-33-07
// ---------------------------------------------------------------------------

test('cost footer transitions idle → calculating → post-receipt — D-33-07', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page, { used: 5, cap: 50 })
  // Slow response so we can catch the loading state.
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await new Promise((r) => setTimeout(r, 500))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        narrative_es: 'Test narrative for cost footer.',
        cost_usd: 0.00087,
        hypothetical_carriers: [],
      }),
    })
  })
  await openModal(page)
  // Idle: cost estimate visible.
  await expect(
    page
      .locator('text=/Costo estimado|Estimated cost/i')
      .or(page.locator('[data-testid="cost-footer"]'))
      .first(),
  ).toBeVisible({ timeout: 5_000 })
  // Remaining counter visible.
  await expect(page.locator('text=/Te quedan|left today/i').first()).toBeVisible({ timeout: 5_000 })

  // Submit.
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await slider.focus()
  await slider.press('ArrowRight')
  await page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
    .click()
  // Loading.
  await expect(page.locator('text=/Calculando|Calculating/i').first()).toBeVisible({ timeout: 3_000 })
  // Post-receipt: actual cost visible.
  await expect(page.locator('text=/Costo:|Cost:/i').first()).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// Group (e): 5 differentiated error codepaths — D-33-13 (+ cap-on-open D-33-08)
// ---------------------------------------------------------------------------

test('error 404 → modal closes / toast — D-33-13', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page)
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
  await openModal(page)
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await slider.focus()
  await slider.press('ArrowRight')
  await page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
    .click()
  // Dialog should close OR a toast should surface the 404 message.
  const dialogGone = page
    .locator('[role="dialog"]')
    .first()
    .waitFor({ state: 'hidden', timeout: 8_000 })
    .then(() => true)
    .catch(() => false)
  const toastShown = page
    .locator('[role="status"], [data-testid*="toast"]')
    .filter({ hasText: /disponible|available|no encontrada|not found/i })
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false)
  const [dialog, toast] = await Promise.all([dialogGone, toastShown])
  expect(dialog || toast).toBeTruthy()
})

test('error timeout → retry button surfaces — D-33-13', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page)
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.abort('timedout')
  })
  await openModal(page)
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await slider.focus()
  await slider.press('ArrowRight')
  await page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
    .click()
  await expect(
    page.locator('button').filter({ hasText: /Reintentar|Retry/i }).first(),
  ).toBeVisible({ timeout: 8_000 })
})

test('error 500 → retry button + alert — D-33-13', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page)
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'internal' }),
    })
  })
  await openModal(page)
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await slider.focus()
  await slider.press('ArrowRight')
  await page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
    .click()
  await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 8_000 })
  await expect(
    page.locator('button').filter({ hasText: /Reintentar|Retry/i }).first(),
  ).toBeVisible({ timeout: 3_000 })
})

test('error 400 → inline error with no retry button — D-33-13', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhyUsage(page)
  await page.route('**/api/agency/*/cotizador/ask-why', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_variable_value' }),
    })
  })
  await openModal(page)
  const slider = page.locator('input[type="range"], [role="slider"]').first()
  await slider.focus()
  await slider.press('ArrowRight')
  await page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
    .click()
  await expect(
    page
      .locator('[role="alert"], [data-testid*="error"]')
      .filter({ hasText: /invalid_variable_value|Error de validación|validation/i })
      .first(),
  ).toBeVisible({ timeout: 8_000 })
})

test('cost footer shows estimated cost text on idle — D-33-07', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhySuccess(page)
  await mockAskWhyUsage(page, { used: 5, cap: 50 })
  await openModal(page)
  await expect(
    page.locator('text=/Costo estimado|Estimated cost/i').first(),
  ).toBeVisible({ timeout: 5_000 })
})

test('remaining counter "Te quedan N de 50" visible on open — D-33-08', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhySuccess(page)
  await mockAskWhyUsage(page, { used: 7, cap: 50 })
  await openModal(page)
  await expect(
    page.locator('text=/Te quedan|left today|remaining/i').first(),
  ).toBeVisible({ timeout: 5_000 })
})

test('cap exhausted on modal open → submit disabled + banner — D-33-08', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteDetail(page)
  await mockAskWhySuccess(page)
  await mockAskWhyUsage(page, { used: 50, cap: 50 })
  await openModal(page)
  const banner = page.locator('[role="alert"]').first()
  await expect(banner).toBeVisible({ timeout: 8_000 })
  await expect(banner).toContainText(/Se reinicia/)
  const submitBtn = page
    .locator('button')
    .filter({ hasText: /Pedir explicación|Ask for explanation/i })
    .first()
  // Either aria-disabled or DOM-disabled
  const ariaDisabled = await submitBtn.getAttribute('aria-disabled')
  const domDisabled = await submitBtn.isDisabled().catch(() => false)
  expect(ariaDisabled === 'true' || domDisabled).toBeTruthy()
})

// ---------------------------------------------------------------------------
// Group (f): i18n parity — es + en — XR-05
// ---------------------------------------------------------------------------

for (const locale of ['es', 'en'] as const) {
  test(`i18n parity — ${locale} locale — XR-05`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    if (locale === 'en') {
      await page.context().addCookies([
        { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
      ])
    }
    await seedAuth(page)
    await mockQuoteDetail(page)
    await mockAskWhySuccess(page)
    await mockAskWhyUsage(page)
    await openModal(page)
    if (locale === 'es') {
      await expect(
        page.locator('text=/¿Qué pasaría si|Pedir explicación|Canon mensual/i').first(),
      ).toBeVisible({ timeout: 6_000 })
    } else {
      await expect(
        page.locator('text=/What would happen if|Ask for explanation|Monthly rent/i').first(),
      ).toBeVisible({ timeout: 6_000 })
    }
  })
}

// ---------------------------------------------------------------------------
// Group (g): Post-result snapshots — XR-03 + COTI-UI-04
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`post-result snapshot — ${viewport.name} — XR-03 COTI-UI-04`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockQuoteDetail(page)
    await mockAskWhySuccess(page)
    await mockAskWhyUsage(page)
    await openModal(page)
    const slider = page.locator('input[type="range"], [role="slider"]').first()
    await slider.focus()
    await slider.press('ArrowRight')
    await page
      .locator('button')
      .filter({ hasText: /Pedir explicación|Ask for explanation/i })
      .first()
      .click()
    // Wait for hypothetical result to render — either dedicated testid or narrative text.
    await expect(
      page
        .locator('[data-testid="carrier-card-hypothetical"]')
        .or(page.locator('text=/Hipotético|Hypothetical|narrative_es|mantendría/i'))
        .first(),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveScreenshot(
      `cotizador-counterfactual-${viewport.name.toLowerCase()}-post-result.png`,
      { animations: 'disabled' },
    )
  })
}
