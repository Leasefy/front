import { test, expect, type Page } from '@playwright/test'

// Phase 36 plan 36-11 — Playwright visual baselines for templates list page.
//
// Requirements: XR-03, COTI-UI-10. Admin-only.
// Routes: /panel/inmobiliaria/cobros/cobranza/plantillas (templates list).
// Auth: localStorage seed (pruebasarrendador1902@gmail.com / role:agency).
//
// v2.1 env workaround (NEVER commit these source tweaks):
//   1. src/app/panel/inmobiliaria/layout.tsx — add 'tenant' to allowedRoles
//   2. src/lib/context/PermissionsContext.tsx — add localhost bypass in canAccess
//   Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local.
//
// Re-capture procedure:
//   cd ~/rent/mvp
//   # Apply 2 source tweaks (NEVER commit)
//   pnpm dev   # separate terminal, port 3001
//   pnpm playwright test tests/e2e/cobranza-templates.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//
// Open UAT: Human must review visual baselines on first CI run.
//   Track as "36-11 open UAT — templates list baselines pending human review".

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const TEMPLATES_LIST_MOCK = {
  templates: [
    {
      id: 'tpl-001',
      name: 'Llamada inicial — Etapa 1',
      category: 'stage',
      status: 'published',
      waSubmissionStatus: null,
      tokenCount: 420,
      bodyDraft:
        'Buenas tardes {{deudor_nombre}}, le contactamos de parte de...',
      bodyPublished:
        'Buenas tardes {{deudor_nombre}}, le contactamos de parte de...',
      updatedAt: '2026-05-25T10:00:00Z',
    },
    {
      id: 'tpl-002',
      name: 'WhatsApp recordatorio',
      category: 'whatsapp',
      status: 'draft',
      waSubmissionStatus: 'pending',
      tokenCount: 95,
      bodyDraft: 'Hola {{deudor_nombre}}, le recordamos su cuota pendiente.',
      bodyPublished: null,
      updatedAt: '2026-05-28T08:00:00Z',
    },
    {
      id: 'tpl-003',
      name: 'Manejo de objeción — No tengo dinero',
      category: 'objection',
      status: 'published',
      waSubmissionStatus: null,
      tokenCount: 310,
      bodyDraft: 'Entiendo su situación...',
      bodyPublished: 'Entiendo su situación...',
      updatedAt: '2026-05-20T14:00:00Z',
    },
  ],
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

async function mockTemplatesEndpoints(page: Page): Promise<void> {
  await page.route('**/api/agency/*/cobranza/templates', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEMPLATES_LIST_MOCK),
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

// Group (a): Templates list snapshots at all 3 viewports (XR-03)
for (const viewport of VIEWPORTS) {
  test(`templates list snapshot — ${viewport.name} — XR-03`, async ({ page }) => {
    const consoleErrors: string[] = []
    attachConsoleErrorListener(page, consoleErrors)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await seedAuth(page)
    await mockTemplatesEndpoints(page)
    await mockPermissions(page)
    await page.goto('/panel/inmobiliaria/cobros/cobranza/plantillas')
    await page.waitForLoadState('domcontentloaded')
    await expect(
      page
        .locator('text=/Llamada inicial|plantillas|WhatsApp/i')
        .first(),
    ).toBeVisible({ timeout: 12_000 })
    expect(consoleErrors).toHaveLength(0)
    await expect(page).toHaveScreenshot({
      path: `cobranza-templates-${viewport.name.toLowerCase()}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })
}

// Group (b): WA pending pill visible for draft WA template (D-36-07)
test('WhatsApp pending Meta pill visible — D-36-07', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockTemplatesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/plantillas')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('text=/WhatsApp recordatorio/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  const pill = page
    .locator('text=/Pendiente Meta|pending.*meta/i')
    .first()
    .or(page.locator('[class*="amber"]').filter({ hasText: /meta|pending/i }).first())
    .or(page.locator('text=/pendiente|pending/i').first())
  await expect(pill).toBeVisible({ timeout: 8_000 })
})

// Group (c): Token count badge visible (D-36-06)
test('token count badge renders — D-36-06', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockTemplatesEndpoints(page)
  await mockPermissions(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/plantillas')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('text=/Llamada inicial/i').first(),
  ).toBeVisible({ timeout: 12_000 })
  const badge = page
    .locator('text=/420.*token|tokens/i')
    .first()
    .or(page.locator('[class*="font-mono"]').filter({ hasText: /token/ }).first())
    .or(page.locator('text=/420/i').first())
  await expect(badge).toBeVisible({ timeout: 8_000 })
})
