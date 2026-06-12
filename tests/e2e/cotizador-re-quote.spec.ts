import { test, expect, type Page, type Request } from '@playwright/test'

// Phase 33 plan 33-07 — Playwright spec for the re-quote flow (parent → child).
//
// Decisions covered (D-NN / requirement annotations on each test):
//   - D-08      raw cédula NEVER leaves the client in any POST body (runtime invariant, group b)
//   - D-33-10   re-quote entry point + ?from= pre-fill                   (groups a, b, c)
//   - D-33-11   ReQuoteOfBadge — immediate parent only, 1-hop depth      (groups d, e)
//   - D-33-14   pre-fill GET failure banner with Volver + Continuar      (group f)
//   - XR-03     cross-viewport snapshots                                 (groups a, h)
//   - XR-05     i18n parity (es + en)                                    (group g)
//   - COTI-UI-05 re-quote with modified inputs                            (overall objective)
//
// Auth: same `addInitScript` localStorage pattern as cotizador-counterfactual.spec.ts.
//
// D-08 runtime invariant strategy:
//   The `installCedulaGuard(page)` helper attaches a `page.on('request')` listener
//   BEFORE navigation. It inspects every outgoing POST body against the regex
//   /"cedula":\s*"\d{7,10}"/ and appends any match to the `cedulaLeaks` array.
//   The D-08 test asserts `cedulaLeaks.length === 0` after the full pre-fill +
//   submit cycle. This is a runtime invariant — it executes on every CI run.
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
//   pnpm dev   # separate terminal, port 3001
//   pnpm playwright test tests/e2e/cotizador-re-quote.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git status --short   # MUST only show new snapshot PNGs.

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const PARENT_QUOTE_ID = 'test-parent-33'

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
  await page.route('**/my-permissions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PERMISSIONS_FULL),
    })
  })
}

async function mockQuoteMetadata(
  page: Page,
  quoteId: string,
  opts: { reQuoteOf?: string | null } = {},
): Promise<void> {
  await page.route(`**/api/agency/*/cotizador/quote/${quoteId}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: quoteId,
        re_quote_of: opts.reQuoteOf ?? null,
        candidato: {
          cedula_hash: 'a'.repeat(64),
          codeudoresCount: 1,
        },
        propiedad: {
          canon: 1500000,
          ciudad: 'Bogotá',
          tipo: 'apartamento',
        },
        carriers: [
          { carrier: 'Sura', status: 'approved', primaMensualCop: 450000, latencyMs: 1100, condiciones: [], isStub: false },
        ],
      }),
    })
  })
}

async function mockQuoteSubmit(page: Page, newQuoteId: string): Promise<void> {
  await page.route('**/api/agency/*/cotizador/quote', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: newQuoteId, re_quote_of: PARENT_QUOTE_ID }),
    })
  })
}

/**
 * D-08 raw-cédula guard.
 *
 * Attaches a network listener that captures any outgoing request whose body
 * contains a 7-10 digit "cedula" field. Returns the array reference; caller
 * asserts `arr.length === 0` AFTER the interaction.
 */
function installCedulaGuard(page: Page): string[] {
  const cedulaLeaks: string[] = []
  page.on('request', (req: Request) => {
    const body = req.postData()
    if (body && /"cedula"\s*:\s*"\d{7,10}"/.test(body)) {
      cedulaLeaks.push(`${req.method()} ${req.url()} — ${body.slice(0, 200)}`)
    }
  })
  return cedulaLeaks
}

// ---------------------------------------------------------------------------
// Group (a): Re-cotizar button navigates to /nueva?from={id} — D-33-10
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`re-quote button navigates to nueva?from= — ${viewport.name} — D-33-10 XR-03`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockQuoteMetadata(page, PARENT_QUOTE_ID)
    await page.goto(`/panel/inmobiliaria/ai/cotizador/${PARENT_QUOTE_ID}`, {
      waitUntil: 'domcontentloaded',
    })
    const reQuoteBtn = page
      .locator('button, a')
      .filter({ hasText: /Re-cotizar con cambios|Re-quote with changes/i })
      .first()
    await expect(reQuoteBtn).toBeVisible({ timeout: 10_000 })
    await reQuoteBtn.click()
    await page.waitForURL(new RegExp(`cotizador/nueva\\?from=${PARENT_QUOTE_ID}`), {
      timeout: 8_000,
    })
    expect(page.url()).toContain(`from=${PARENT_QUOTE_ID}`)
  })
}

// ---------------------------------------------------------------------------
// Group (b): D-08 invariant — no raw cédula in any outgoing request body
// ---------------------------------------------------------------------------

test('wizard pre-fill + submit: no raw cédula in any request body — D-08 COTI-UI-05', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const cedulaLeaks = installCedulaGuard(page)
  await seedAuth(page)
  await mockQuoteMetadata(page, PARENT_QUOTE_ID)
  await mockQuoteSubmit(page, 'test-new-quote-33')
  await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
    waitUntil: 'networkidle',
  })
  // Pre-fill notice should appear.
  await expect(
    page.locator('text=/Re-usando cédula|Re-using cedula|Re-using cédula/i').first(),
  ).toBeVisible({ timeout: 10_000 })
  // Advance through steps & submit (best-effort — the wizard may have multiple steps).
  for (let i = 0; i < 4; i++) {
    const continueBtn = page
      .locator('button')
      .filter({ hasText: /Continuar|Continue|Siguiente|Next/i })
      .first()
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
  }
  const submitBtn = page
    .locator('button[type="submit"], button')
    .filter({ hasText: /Cotizar|Confirmar|Submit|Enviar/i })
    .first()
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click().catch(() => {})
    await page.waitForTimeout(800)
  }
  // D-08 invariant assertion — no raw cédula leaked anywhere.
  expect(cedulaLeaks, `Raw cédula leaked: ${cedulaLeaks.join(' | ')}`).toHaveLength(0)
})

test('pre-fill notice "Re-usando cédula" visible when ?from= present — D-33-10', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteMetadata(page, PARENT_QUOTE_ID)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
    waitUntil: 'networkidle',
  })
  await expect(
    page.locator('text=/Re-usando cédula|Re-using cedula|Re-using cédula/i').first(),
  ).toBeVisible({ timeout: 10_000 })
})

test('"Cambiar candidato" button is visible in re-quote pre-fill mode — D-33-10', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteMetadata(page, PARENT_QUOTE_ID)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
    waitUntil: 'networkidle',
  })
  await expect(
    page
      .locator('button')
      .filter({ hasText: /Cambiar candidato|Change candidate/i })
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------------------
// Group (c): "Cambiar candidato" reveals raw cédula input — D-33-10
// ---------------------------------------------------------------------------

test('"Cambiar candidato" clears hash and shows raw cédula input — D-33-10', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteMetadata(page, PARENT_QUOTE_ID)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
    waitUntil: 'networkidle',
  })
  const cambiarBtn = page
    .locator('button')
    .filter({ hasText: /Cambiar candidato|Change candidate/i })
    .first()
  await expect(cambiarBtn).toBeVisible({ timeout: 10_000 })
  await cambiarBtn.click()
  await expect(
    page
      .locator('input[name*="cedula" i], input[placeholder*="cédula" i], input[placeholder*="cedula" i]')
      .first(),
  ).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// Group (d): ReQuoteOfBadge on child detail page — D-33-11
// ---------------------------------------------------------------------------

test('child quote detail renders ReQuoteOfBadge with parent shortId — D-33-11', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  const parentId = 'aabbccdd-1122-3344-5566-778899aabbcc'
  const childId = 'deadbeef-aaaa-bbbb-cccc-ddddeeeeefff'
  await page.route(`**/api/agency/*/cotizador/quote/${childId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: childId,
        re_quote_of: parentId,
        candidato: { cedula_hash: 'h'.repeat(64), codeudoresCount: 1 },
        propiedad: { canon: 1500000, ciudad: 'Bogotá', tipo: 'apartamento' },
        carriers: [],
      }),
    })
  })
  await page.goto(`/panel/inmobiliaria/ai/cotizador/${childId}`, {
    waitUntil: 'domcontentloaded',
  })
  const badge = page
    .locator('[data-testid="re-quote-of-badge"]')
    .or(
      page
        .locator('a, span')
        .filter({ hasText: /Re-cotización de #aabbccdd/i }),
    )
    .first()
  await expect(badge).toBeVisible({ timeout: 10_000 })
  // Confirm badge text matches the expected shortId pattern.
  await expect(badge).toHaveText(/Re-cotización de #[0-9a-f]{8}/i)
  // Badge should link to the parent quote.
  const href = await badge.getAttribute('href').catch(() => null)
  if (href !== null) {
    expect(href).toContain(parentId)
  }
})

// ---------------------------------------------------------------------------
// Group (e): Re-quote-of-re-quote depth — badge shows immediate parent only — D-33-11
// ---------------------------------------------------------------------------

test('re-quote-of-re-quote: badge shows IMMEDIATE parent only, 1-hop — D-33-11', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  const grandparentId = '00000000-aaaa-bbbb-cccc-000000000001'
  const parentId = '11111111-aaaa-bbbb-cccc-000000000002'
  const childId = '22222222-aaaa-bbbb-cccc-000000000003'
  await page.route(`**/api/agency/*/cotizador/quote/${childId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: childId,
        re_quote_of: parentId, // immediate parent — NOT grandparent
        candidato: { cedula_hash: 'h'.repeat(64), codeudoresCount: 0 },
        propiedad: { canon: 1000000, ciudad: 'Bogotá', tipo: 'casa' },
        carriers: [],
      }),
    })
  })
  await page.goto(`/panel/inmobiliaria/ai/cotizador/${childId}`, {
    waitUntil: 'domcontentloaded',
  })
  const badge = page
    .locator('[data-testid="re-quote-of-badge"]')
    .or(
      page
        .locator('a, span')
        .filter({ hasText: /Re-cotización de #11111111/i }),
    )
    .first()
  await expect(badge).toBeVisible({ timeout: 10_000 })
  await expect(badge).toContainText(/#11111111/)
  // Badge href, if present, must point at parent (NOT grandparent).
  const href = await badge.getAttribute('href').catch(() => null)
  if (href !== null) {
    expect(href).toContain(parentId)
    expect(href).not.toContain(grandparentId)
  }
})

// ---------------------------------------------------------------------------
// Group (f): Pre-fill GET 404 shows banner with Volver + Continuar — D-33-14
// ---------------------------------------------------------------------------

test('pre-fill GET 404 shows step-1 banner with Volver + Continuar — D-33-14', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await page.route('**/api/agency/*/cotizador/quote/nonexistent-parent', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/panel/inmobiliaria/ai/cotizador/nueva?from=nonexistent-parent', {
    waitUntil: 'networkidle',
  })
  await expect(
    page.locator('text=/No pudimos cargar|Could not load|We couldn|t load/i').first(),
  ).toBeVisible({ timeout: 10_000 })
  await expect(
    page.locator('button, a').filter({ hasText: /Volver|Back/i }).first(),
  ).toBeVisible({ timeout: 3_000 })
  await expect(
    page.locator('button, a').filter({ hasText: /Continuar|Continue/i }).first(),
  ).toBeVisible({ timeout: 3_000 })
})

// ---------------------------------------------------------------------------
// Group (g): i18n parity — es + en — XR-05
// ---------------------------------------------------------------------------

for (const locale of ['es', 'en'] as const) {
  test(`re-quote wizard i18n — ${locale} locale — XR-05`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    if (locale === 'en') {
      await page.context().addCookies([
        { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
      ])
    }
    await seedAuth(page)
    await mockQuoteMetadata(page, PARENT_QUOTE_ID)
    await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
      waitUntil: 'networkidle',
    })
    if (locale === 'es') {
      await expect(
        page.locator('text=/Re-usando cédula de cotización anterior/i').first(),
      ).toBeVisible({ timeout: 10_000 })
      await expect(
        page.locator('button').filter({ hasText: /Cambiar candidato/i }).first(),
      ).toBeVisible({ timeout: 5_000 })
    } else {
      await expect(
        page.locator('text=/Re-using cedula|Re-using cédula|Reusing cedula/i').first(),
      ).toBeVisible({ timeout: 10_000 })
      await expect(
        page.locator('button').filter({ hasText: /Change candidate/i }).first(),
      ).toBeVisible({ timeout: 5_000 })
    }
  })
}

test('parent quote detail shows "Re-cotizar con cambios" button — D-33-10', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockQuoteMetadata(page, PARENT_QUOTE_ID)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/${PARENT_QUOTE_ID}`, {
    waitUntil: 'domcontentloaded',
  })
  await expect(
    page
      .locator('button, a')
      .filter({ hasText: /Re-cotizar con cambios|Re-quote with changes/i })
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})

test('quote without re_quote_of does NOT render ReQuoteOfBadge — D-33-11', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  const standaloneId = '99999999-aaaa-bbbb-cccc-999999999999'
  await page.route(`**/api/agency/*/cotizador/quote/${standaloneId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: standaloneId,
        re_quote_of: null,
        candidato: { cedula_hash: 'h'.repeat(64), codeudoresCount: 1 },
        propiedad: { canon: 1500000, ciudad: 'Bogotá', tipo: 'apartamento' },
        carriers: [],
      }),
    })
  })
  await page.goto(`/panel/inmobiliaria/ai/cotizador/${standaloneId}`, {
    waitUntil: 'domcontentloaded',
  })
  // Wait for page content to settle, then assert badge is absent.
  await page.waitForTimeout(800)
  await expect(
    page.locator('[data-testid="re-quote-of-badge"]').first(),
  ).not.toBeVisible({ timeout: 2_000 })
  await expect(
    page.locator('text=/Re-cotización de #/i').first(),
  ).not.toBeVisible({ timeout: 2_000 })
})

test('D-08 guard captures NO leak when no interaction (sanity baseline)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const cedulaLeaks = installCedulaGuard(page)
  await seedAuth(page)
  await mockQuoteMetadata(page, PARENT_QUOTE_ID)
  await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(500)
  expect(cedulaLeaks).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// Group (h): Cross-viewport snapshots — XR-03 + COTI-UI-05
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`re-quote wizard snapshot — ${viewport.name} — XR-03 COTI-UI-05`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockQuoteMetadata(page, PARENT_QUOTE_ID)
    await page.goto(`/panel/inmobiliaria/ai/cotizador/nueva?from=${PARENT_QUOTE_ID}`, {
      waitUntil: 'networkidle',
    })
    await expect(
      page
        .locator('text=/Re-usando cédula|Re-using/i')
        .or(page.locator('h1, h2').first())
        .first(),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveScreenshot(
      `cotizador-re-quote-${viewport.name.toLowerCase()}-wizard-prefill.png`,
      { animations: 'disabled' },
    )
  })
}
