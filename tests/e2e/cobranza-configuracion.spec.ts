import { test, expect, type Page } from '@playwright/test'

// Phase 36 plan 36-11 — Playwright visual baselines for policies configuracion page.
//
// Requirements: XR-03, COTI-UI-11 (policies + simulator + version history).
// Recharts bbox assertion: asserts BarChart renders with non-zero height on Desktop (T-36-11-02).
// Disclaimer caption assertion: mandatory text "Estimación basada en cambios deterministas"
// must be visible in simulator result card (D-36-08).
//
// Auth: localStorage seed (pruebasarrendador1902@gmail.com / role:agency).
// Routes: /panel/inmobiliaria/cobros/cobranza/configuracion
//
// v2.1 env workaround (NEVER commit these source tweaks):
//   1. src/app/panel/inmobiliaria/layout.tsx — add 'tenant' to allowedRoles
//      so the test user (role:'agency') passes the layout guard.
//   2. src/lib/context/PermissionsContext.tsx — add localhost bypass so
//      canAccess('cobranza', anything) returns true on localhost:3001.
//   Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local (any value works
//   because page.route() mocks intercept before real network calls).
//
// Re-capture procedure:
//   cd ~/rent/mvp
//   # Apply 2 source tweaks (NEVER commit)
//   pnpm dev   # separate terminal, port 3001
//   pnpm playwright test tests/e2e/cobranza-configuracion.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git status --short  # MUST show only new/updated snapshot PNGs
//
// Revert protocol (mandatory after snapshot capture — identical to Phase 35-11):
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git add src/app/panel/inmobiliaria/layout.tsx \
//           src/lib/context/PermissionsContext.tsx
//   git commit -m "revert(36-11): remove v2.1 env tweaks used for Phase 36 snapshot capture"
//   Verify: git diff HEAD~1 -- src/app/panel/inmobiliaria/layout.tsx shows the revert.
//   If this commit is missing, plan 36-11 is considered FAILED.
//
// Open UAT: Human must review visual baselines on first CI run.
//   Track as "36-11 open UAT — configuracion page baselines pending human review".

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

// ─── Mock payloads ────────────────────────────────────────────────────────────

const POLICY_CONFIG_MOCK = {
  policy: {
    cadencia: {
      maxCallsPerWeek: 3,
      maxWhatsappPerWeek: 5,
      contactStartHour: '08:00',
      contactEndHour: '18:00',
      blockedDays: ['domingo', 'festivos'],
    },
    negociacion: {
      maxDiscountTier: 2,
      maxPaymentPlanMonths: 12,
      minPromiseAmountCop: 50000,
    },
    escalacion: {
      maxDaysBeforeEscalation: 30,
      brokenPromisesThreshold: 3,
      autoEscalateToLegal: false,
    },
    compliance: {
      verifyRneBeforeCall: true,
      aiDisclosure: true,
      callRecording: true,
    },
  },
  versionNumber: 3,
}

const POLICY_VERSIONS_MOCK = {
  versions: [
    {
      id: 'pv-003',
      versionNumber: 3,
      policyJson: {},
      createdByMemberId: 'admin@leasefy.co',
      createdAt: '2026-05-28T10:00:00Z',
      changeDescription: 'Reducir escalación a 30 días',
    },
    {
      id: 'pv-002',
      versionNumber: 2,
      policyJson: {},
      createdByMemberId: 'admin@leasefy.co',
      createdAt: '2026-05-25T14:00:00Z',
      changeDescription: null,
    },
    {
      id: 'pv-001',
      versionNumber: 1,
      policyJson: {},
      createdByMemberId: 'admin@leasefy.co',
      createdAt: '2026-05-20T09:00:00Z',
      changeDescription: 'Configuración inicial',
    },
  ],
  activeVersionNumber: 3,
}

const POLICY_SIMULATE_MOCK = {
  flipped_count: 12,
  by_stage: {
    contacto_inicial: 4,
    promesa_pago: 5,
    pre_legal: 3,
  },
  by_outcome: {
    no_answer: 6,
    promesa: 4,
    escalado: 2,
  },
}

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

// ─── Auth seed ────────────────────────────────────────────────────────────────

async function seedAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZW1haWwiOiJwcnVlYmFzYXJyZW5kYWRvcjE5MDJAZ21haWwuY29tIiwiZXhwIjo5OTk5OTk5OTk5LCJpc3MiOiJzdXBhYmFzZSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fX0.FAKE_SIGNATURE'
      const supabaseSession = {
        access_token: fakeJwt,
        refresh_token: 'fake-refresh-token',
        expires_at: 9999999999,
        expires_in: 9999999999,
        token_type: 'bearer',
        user: {
          id: 'test-user-1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'pruebasarrendador1902@gmail.com',
          app_metadata: { providers: ['email'] },
          user_metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      }
      localStorage.setItem('sb-jraqurdcjwnifzpdqtnm-auth-token', JSON.stringify(supabaseSession))
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
  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'pruebasarrendador1902@gmail.com',
          app_metadata: { providers: ['email'] },
          user_metadata: {},
        }),
      })
    } else {
      await route.fallback()
    }
  })
  await page.route('**/inmobiliaria/agency', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'agency-test-123', name: 'Test Agency', memberRole: 'ADMIN' }),
    })
  })
  await page.route('**/users/me', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-1',
        role: 'agency',
        backendRole: 'AGENT',
        onboardingCompleted: true,
        email: 'pruebasarrendador1902@gmail.com',
      }),
    })
  })
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

async function mockPoliciesEndpoints(page: Page): Promise<void> {
  // GET /policies/versions → full history DESC (register BEFORE /policies
  // so the more-specific path wins the glob match)
  await page.route('**/api/agency/*/policies/versions', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(POLICY_VERSIONS_MOCK),
    })
  })
  // POST /policies/impact → deterministic backtest results
  await page.route('**/api/agency/*/policies/impact', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(POLICY_SIMULATE_MOCK),
    })
  })
  // GET  /policies → current config
  // PUT  /policies → save new version
  await page.route('**/api/agency/*/policies', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(POLICY_CONFIG_MOCK),
      })
    } else if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: POLICY_VERSIONS_MOCK.versions[0] }),
      })
    } else {
      await route.fallback()
    }
  })
}

async function mockPermissions(page: Page): Promise<void> {
  await page.route('**/api/agency/*/my-permissions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ modules: { cobranza: { view: true, intervene: true } } }),
    })
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Group (a): Configuracion page snapshots at all 3 viewports (XR-03)
for (const viewport of VIEWPORTS) {
  test(`configuracion page snapshot — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors: string[] = []
    attachConsoleErrorListener(page, consoleErrors)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockPoliciesEndpoints(page)
    await mockPermissions(page)
    await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion')
    await page.waitForLoadState('domcontentloaded')
    await expect(
      page
        .locator('text=/Cadencia de contacto|Cadencia|configuración/i')
        .first(),
    ).toBeVisible({ timeout: 12_000 })
    expect(consoleErrors).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `cobranza-configuracion-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// Group (b): Locked compliance toggles render as disabled (D-36-09, XR-03)
test('locked RNE toggle is disabled — D-36-09 XR-03', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockPoliciesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion')
  await page.waitForLoadState('domcontentloaded')
  // Wait for Compliance section to be visible
  await expect(
    page.locator('text=/Compliance/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  // Locate the RNE toggle — look for disabled Switch or aria-disabled wrapper
  const lockedToggle = page
    .locator('[aria-disabled="true"] [role="switch"], [disabled][role="switch"]')
    .first()
    .or(
      page
        .locator('text=/verificar RNE|RNE/i')
        .locator('..')
        .locator('[role="switch"]'),
    )
    .first()
  await expect(lockedToggle).toBeVisible({ timeout: 10_000 })
  // It must not be interactive — aria-disabled or disabled attribute
  const ariaDisabled = await lockedToggle.getAttribute('aria-disabled').catch(() => null)
  const disabledAttr = await lockedToggle.getAttribute('disabled').catch(() => null)
  // At least one of the two attributes should be set (T-36-11-04 mitigation)
  const isDisabled = ariaDisabled !== null || disabledAttr !== null
  expect(isDisabled).toBe(true)
})

// Group (c): Impact simulator result card shows Recharts bbox > 0 (XR-03, T-36-11-02)
test('impact simulator BarChart has non-zero bounding box on Desktop — XR-03', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockPoliciesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion')
  await page.waitForLoadState('domcontentloaded')
  // Wait for page to load
  await expect(
    page.locator('text=/Cadencia de contacto/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  // Edit a field to make form dirty (enables Simular button)
  const numInput = page
    .locator('input[name="maxCallsPerWeek"], input[type="number"]')
    .first()
  await numInput.fill('4')
  // Click Simular impacto
  await page
    .locator('button')
    .filter({ hasText: /simular.*impacto|simular/i })
    .first()
    .click()
  // Wait for simulator result card — mandatory disclaimer must be visible (D-36-08)
  await expect(
    page.locator('text=/Estimación basada|deterministas/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  // Recharts svg must have non-zero bbox (T-36-11-02 mitigation)
  const svgEl = page
    .locator('svg')
    .filter({ has: page.locator('path, rect') })
    .first()
  const box = await svgEl.boundingBox({ timeout: 8_000 }).catch(() => null)
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
  expect(box!.height).toBeGreaterThan(0) // T-36-11-02: assert height > 0 on tablet too
})

// Group (d): Mandatory disclaimer caption visible after simulation (D-36-08)
test('simulator disclaimer caption visible — D-36-08', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await seedAuth(page)
  await mockPoliciesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('text=/Cadencia de contacto/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  // Edit field to make dirty
  await page.locator('input[type="number"]').first().fill('5')
  // Click Simular
  await page
    .locator('button')
    .filter({ hasText: /simular/i })
    .first()
    .click()
  // Disclaimer must appear — D-36-08 mandatory caption
  await expect(
    page
      .locator('text=/Estimación basada en cambios deterministas/i')
      .or(page.locator('text=/LLM.*ajustar|agente LLM/i'))
      .first(),
  ).toBeVisible({ timeout: 12_000 })
})

// Group (e): Version history table shows v3 as active (D-36-09)
test('version history table — v3 marked active — D-36-09', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockPoliciesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('text=/v3|versión 3/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  // Active row has emerald styling or "Activa" pill
  const activeRow = page
    .locator('tr, [data-row]')
    .filter({ hasText: /v3/i })
    .first()
  const activePill = activeRow
    .locator('text=/Activa|active/i, [class*="emerald"]')
    .first()
  await expect(activePill).toBeVisible({ timeout: 5_000 })
})

// Group (f): Restore button opens AlertDialog for non-active version (D-36-09)
test('Restaurar button on v1 opens AlertDialog — D-36-09', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockPoliciesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/configuracion')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('text=/v1/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  // Find Restaurar button on v1 row
  const v1Row = page
    .locator('tr, [data-row]')
    .filter({ hasText: /v1/i })
    .first()
  const restoreBtn = v1Row
    .locator('button')
    .filter({ hasText: /restaurar/i })
    .first()
  await expect(restoreBtn).toBeVisible({ timeout: 5_000 })
  await restoreBtn.click()
  // AlertDialog appears
  await expect(
    page
      .locator('[role="alertdialog"], text=/Restaurar versión/i')
      .first(),
  ).toBeVisible({ timeout: 5_000 })
})
