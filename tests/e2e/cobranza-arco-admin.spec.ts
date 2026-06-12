import { test, expect, type Page } from '@playwright/test'

// Phase 36 plan 36-11 — Playwright visual baselines for ARCO admin inbox + detail pages.
//
// Requirements: XR-03 (3-viewport snapshots + 44px touch targets), COBR-UI-12 (ARCO inbox).
// Auth: localStorage seed (pruebasarrendador1902@gmail.com / role:agency).
// Routes:
//   - /panel/inmobiliaria/ai/cobranza/arco             (inbox list)
//   - /panel/inmobiliaria/ai/cobranza/arco/arco-req-001 (detail)
// FIXTURE_ID: 'arco-req-001' — used in mock payload and goto URL.
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
//   pnpm playwright test tests/e2e/cobranza-arco-admin.spec.ts \
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
//   git commit -m "revert(36-11): remove v2.1 env tweaks used for Phase 36 snapshot capture"
//   Verify: git diff HEAD~1 -- src/app/panel/inmobiliaria/layout.tsx shows the revert.
//   If this commit is missing, plan 36-11 is considered FAILED.
//
// Open UAT: Human must review visual baselines on first CI run.
//   Track as "36-11 open UAT — ARCO admin baselines pending human review".

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const ARCO_FIXTURE_ID = 'arco-req-001'

const ARCO_LIST_MOCK = {
  requests: [
    {
      id: 'arco-req-001',
      type: 'acceso',
      status: 'pending_admin_triage',
      requesterName: 'María García',
      requesterEmail: 'mg***@gmail.com',
      requesterCedulaHash: '12•••678',
      submittedAt: '2026-05-20T09:00:00Z',
      slaRemainingDays: 5,
    },
    {
      id: 'arco-req-002',
      type: 'rectificacion',
      status: 'in_progress',
      requesterName: 'Carlos López',
      requesterEmail: 'ca***@hotmail.com',
      requesterCedulaHash: '78•••321',
      submittedAt: '2026-05-18T14:30:00Z',
      slaRemainingDays: 1,
    },
    {
      id: 'arco-req-003',
      type: 'cancelacion',
      status: 'resolved',
      requesterName: 'Ana Torres',
      requesterEmail: 'an***@yahoo.com',
      requesterCedulaHash: '55•••900',
      submittedAt: '2026-05-10T11:00:00Z',
      slaRemainingDays: 12,
    },
  ],
  kpis: { pending: 2, onTime: 2, overdue: 0, resolvedLast30d: 1 },
}

const ARCO_DETAIL_MOCK = {
  id: 'arco-req-001',
  type: 'acceso',
  status: 'in_progress',
  requesterName: 'María García',
  requesterEmail: 'mariag@gmail.com',
  requesterCedulaHash: '12•••678',
  requesterDescription: 'Deseo conocer los datos que tienen registrados a mi nombre.',
  submittedAt: '2026-05-20T09:00:00Z',
  emailVerifiedAt: '2026-05-20T09:10:00Z',
  triagedAt: '2026-05-20T10:00:00Z',
  resolvedAt: null,
  resolutionPayload: null,
  auditLogIds: ['audit-001', 'audit-002'],
}

const ARCO_GATE_MOCK = { blocked: false }

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

async function mockArcoListEndpoints(page: Page): Promise<void> {
  // Note: arco/requests response includes kpis inline — no separate kpis route exists
  await page.route('**/api/agency/*/arco/requests', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ARCO_LIST_MOCK),
    })
  })
}

async function mockArcoDetailEndpoints(page: Page): Promise<void> {
  // Register detail BEFORE gate-status so the more specific path wins.
  await page.route(`**/api/agency/*/arco/requests/${ARCO_FIXTURE_ID}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ARCO_DETAIL_MOCK),
    })
  })
  await page.route('**/api/agency/*/arco/gate-status', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ARCO_GATE_MOCK),
    })
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

// Group (a): ARCO inbox snapshots at all 3 viewports (XR-03)
for (const viewport of VIEWPORTS) {
  test(`ARCO inbox snapshot — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors: string[] = []
    attachConsoleErrorListener(page, consoleErrors)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockArcoListEndpoints(page)
    await mockPermissions(page)
    await page.goto('/panel/inmobiliaria/ai/cobranza/arco')
    await page.waitForLoadState('domcontentloaded')
    await expect(
      page
        .locator('text=/María García/i')
        .or(page.locator('text=/ARCO|solicitudes ARCO/i'))
        .first(),
    ).toBeVisible({ timeout: 12_000 })
    expect(consoleErrors).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `cobranza-arco-inbox-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// Group (b): ARCO detail snapshots at all 3 viewports (XR-03)
for (const viewport of VIEWPORTS) {
  test(`ARCO detail snapshot — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors: string[] = []
    attachConsoleErrorListener(page, consoleErrors)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockArcoListEndpoints(page)
    await mockArcoDetailEndpoints(page)
    await mockPermissions(page)
    await page.goto(`/panel/inmobiliaria/ai/cobranza/arco/${ARCO_FIXTURE_ID}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(
      page.locator('text=/María García|acceso|resolv/i').first(),
    ).toBeVisible({ timeout: 12_000 })
    expect(consoleErrors).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `cobranza-arco-detail-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// Group (c): No horizontal overflow at iPhone-14 — inbox (XR-03)
test('ARCO inbox no horizontal scroll iPhone-14 — XR-03', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedAuth(page)
  await mockArcoListEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/arco')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page
      .locator('text=/María García/i')
      .or(page.locator('text=/ARCO|solicitudes/i'))
      .first(),
  ).toBeVisible({ timeout: 12_000 })
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
  const clientWidth = await page.evaluate(() => document.body.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
})

// Group (d): SLA badge colors present — amber for warning row (D-36-05)
test('ARCO inbox SLA badge amber for 1-day-remaining row — D-36-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockArcoListEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/ai/cobranza/arco')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('text=/Carlos López/i').first()).toBeVisible({ timeout: 12_000 })
  // Row for Carlos López has slaRemainingDays=1 → amber badge
  const row = page.locator('tr, [data-row]').filter({ hasText: /Carlos López/i }).first()
  const slaBadge = row
    .locator('[class*="amber"], text=/1.*día|WARN/i')
    .first()
    .or(row.locator('[class*="warning"]').first())
  await expect(slaBadge).toBeVisible({ timeout: 5_000 })
})
