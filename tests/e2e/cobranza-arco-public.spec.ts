import { test, expect, type Page } from '@playwright/test'

// Phase 36 plan 36-11 — Playwright visual baselines for public /arco submission form.
//
// Requirements: XR-03, COBR-UI-13.
// No auth required — page is unauthenticated.
// Routes: /arco (public, unauthenticated).
//
// v2.1 env workaround: NOT needed for this spec (public page, no auth guard).
// Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local.
//
// Re-capture procedure:
//   cd ~/rent/mvp
//   pnpm dev   # separate terminal, port 3001
//   pnpm playwright test tests/e2e/cobranza-arco-public.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//
// Open UAT: Human must review visual baselines on first CI run.
//   Track as "36-11 open UAT — public ARCO form baselines pending human review".

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

// ─── Console error filter ─────────────────────────────────────────────────────

const IGNORED_CONSOLE_ERRORS = [
  'Access-Control-Allow-Origin',
  'Failed to load resource',
  'Status code: 204',
  'Warning:',
]

function attachConsoleErrorListener(page: Page, errors: string[]): void {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!IGNORED_CONSOLE_ERRORS.some((ignored) => text.includes(ignored))) {
        errors.push(text)
      }
    }
  })
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

async function mockArcoPublicSubmit(page: Page): Promise<void> {
  await page.route('**/api/arco', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Group (a): Public form snapshots at all 3 viewports (XR-03)
for (const viewport of VIEWPORTS) {
  test(`public ARCO form snapshot — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors: string[] = []
    attachConsoleErrorListener(page, consoleErrors)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    // NO seedAuth — unauthenticated page
    await page.goto('/arco')
    await page.waitForLoadState('domcontentloaded')
    await expect(
      page.locator('text=/derechos ARCO|Solicitud|ARCO/i').first(),
    ).toBeVisible({ timeout: 12_000 })
    expect(consoleErrors).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `public-arco-form-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// Group (b): Form submission → success state renders (COBR-UI-13)
test('public ARCO form submit shows success state — COBR-UI-13', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockArcoPublicSubmit(page)
  await page.goto('/arco')
  await page.waitForLoadState('domcontentloaded')
  // Fill required fields
  await page.locator('input[name="nombre"], input[placeholder*="nombre" i]').first().fill('Test User')
  await page.locator('input[name="cedula"], input[inputMode="numeric"]').first().fill('1234567890')
  await page.locator('input[type="email"]').first().fill('test@example.com')
  // Select tipo (shadcn Select — click trigger, then item)
  await page.locator('[role="combobox"]').first().click()
  await page.locator('[role="option"]').filter({ hasText: /acceso/i }).first().click()
  await page.locator('textarea').first().fill('Solicito acceso a mis datos personales almacenados.')
  // Submit
  await page
    .locator('button[type="submit"], button')
    .filter({ hasText: /enviar/i })
    .first()
    .click()
  // Success state — page should show email confirmation message
  await expect(
    page
      .locator('text=/correo electrónico|revisa.*correo|enlace/i')
      .or(page.locator('text=/enviado|confirmación|éxito/i'))
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})

// Group (c): Rate limit error state renders (D-36-02)
test('public ARCO form shows rate-limit alert on 429 — D-36-02', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/api/arco', async (route) => {
    await route.fulfill({ status: 429, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/arco')
  await page.waitForLoadState('domcontentloaded')
  // Fill minimal fields and submit to trigger error
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 8_000 })
  await emailInput.fill('test@example.com')
  await page
    .locator('button[type="submit"], button')
    .filter({ hasText: /enviar/i })
    .first()
    .click()
  await expect(
    page
      .locator('text=/demasiadas solicitudes|Límite alcanzado|rate.*limit/i')
      .or(page.locator('text=/429|demasiado|espera/i'))
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})
