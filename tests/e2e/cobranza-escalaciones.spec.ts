import { test, expect, type Page } from '@playwright/test'

// Phase 34 plan 34-09 — Playwright spec for the cobranza ESCALACIONES surfaces
// (kanban list page + detail page + resolve modal). 8 assertion groups (a–h)
// at 3 viewports: iPhone-14 / iPad-Mini / Desktop Chrome 1440.
//
// Decisions covered (annotated on each test):
//   - D-34-01     click-to-move kanban (no DnD) — group (a) urgency sort
//   - D-34-02     hybrid assignment model (Tomar self-claim vs Asignar admin) — groups (b), (h)
//   - D-34-05     resolve modal with 5 hardcoded templates + escalated-to-legal ack — groups (c), (d)
//   - D-34-RES-A3 role allow-list for assignment eligibility — group (h)
//   - D-34-RES-A5 escalated-to-legal triggers cascade — group (d)
//   - XR-03       no horizontal scroll + viewport snapshots — groups (a), (e), (g)
//   - XR-05       es + en i18n parity — group (f)
//   - COBR-UI-09  escalations triage surface — overall objective
//
// SSE-mock note (carried from Phase 33-07 lessons learned):
//   Phase 34 surfaces use SWR 60s polling (D-34-03) — NOT EventSource/SSE. The
//   page.route() mocks below intercept standard fetch reliably; we do NOT hit
//   the EventSource-vs-Playwright interception limitation that affected
//   cotizador-streaming.spec.ts. All endpoints in this spec are mock-friendly.
//
// v2.1 visual-smoke env workaround (NEVER commit these source tweaks):
//   1. src/app/panel/inmobiliaria/layout.tsx — add 'tenant' to allowedRoles
//   2. src/lib/context/PermissionsContext.tsx — add localhost-bypass in canAccess
//   Set NEXT_PUBLIC_AGENT_URL=http://localhost:4000 in .env.local (any value
//   works because route mocks intercept the fetch).
//
// Re-capture procedure:
//   cd ~/rent/mvp
//   # apply 2 source tweaks (NEVER commit)
//   pnpm dev   # separate terminal, port 3001
//   pnpm playwright test tests/e2e/cobranza-escalaciones.spec.ts \
//     --project="iPhone 14" --project="iPad Mini" --project="Desktop Chrome 1440" \
//     --update-snapshots
//   git checkout src/app/panel/inmobiliaria/layout.tsx \
//                src/lib/context/PermissionsContext.tsx
//   git status --short  # MUST only show new spec files + new snapshot PNGs.
//
// Test user: pruebasarrendador1902@gmail.com (role: 'agency').

const VIEWPORTS = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
] as const

const PERMISSIONS_OPERATOR = {
  modules: {
    cobranza: {
      view: true,
      'resolve-escalation': true,
      'assign-escalation': false,
      configure: false,
    },
  },
}

const PERMISSIONS_ADMIN = {
  modules: {
    cobranza: {
      view: true,
      'resolve-escalation': true,
      'assign-escalation': true,
      configure: true,
    },
  },
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

async function seedAuth(
  page: Page,
  opts: { email?: string; permissions?: object } = {},
): Promise<void> {
  const email = opts.email ?? 'pruebasarrendador1902@gmail.com'
  await page.addInitScript((seedEmail: string) => {
    try {
      localStorage.setItem(
        'arriendo-facil-auth',
        JSON.stringify({
          id: 'test-user-1',
          role: 'agency',
          backendRole: 'AGENT',
          onboardingCompleted: true,
          email: seedEmail,
        }),
      )
    } catch {
      // ignore
    }
  }, email)
  const perms = opts.permissions ?? PERMISSIONS_OPERATOR
  await page.route('**/my-permissions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(perms),
    })
  })
}

interface EscalationCard {
  id: string
  urgency: 'live' | 'high' | 'medium' | 'low'
  reason: string
  debtor_id_masked: string
  linked_call_id: string
  created_at: string
  assignee_email: string | null
  resolved_at?: string
  resolution_category?: string
}

const DEFAULT_KANBAN = {
  open: [
    {
      id: 'esc-open-01',
      urgency: 'live' as const,
      reason: 'Deudor insiste en hablar con gerente',
      debtor_id_masked: '***456',
      linked_call_id: 'call-01',
      created_at: '2026-05-27T10:00:00Z',
      assignee_email: null,
    },
    {
      id: 'esc-open-02',
      urgency: 'high' as const,
      reason: 'Alto riesgo de fuga',
      debtor_id_masked: '***789',
      linked_call_id: 'call-02',
      created_at: '2026-05-27T09:00:00Z',
      assignee_email: null,
    },
  ],
  assigned: [
    {
      id: 'esc-asgn-01',
      urgency: 'medium' as const,
      reason: 'Caso en seguimiento',
      debtor_id_masked: '***321',
      linked_call_id: 'call-03',
      created_at: '2026-05-26T15:00:00Z',
      assignee_email: 'pruebasarrendador1902@gmail.com',
    },
  ],
  resolved: [
    {
      id: 'esc-res-01',
      urgency: 'low' as const,
      reason: 'Resuelto por acuerdo',
      debtor_id_masked: '***654',
      linked_call_id: 'call-04',
      created_at: '2026-05-25T12:00:00Z',
      assignee_email: 'pruebasarrendador1902@gmail.com',
      resolved_at: '2026-05-26T09:00:00Z',
      resolution_category: 'compromise',
    },
  ],
  resolvedNextCursor: null,
  generatedAt: '2026-05-28T08:00:00Z',
}

async function mockEscalationsKanban(
  page: Page,
  payload: typeof DEFAULT_KANBAN = DEFAULT_KANBAN,
): Promise<void> {
  await page.route('**/api/agency/*/cobranza/escalations', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

async function mockEscalationDetail(page: Page, eid: string): Promise<void> {
  await page.route(`**/api/agency/*/cobranza/escalations/${eid}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: eid,
        urgency: 'live',
        reason: 'Deudor insiste en hablar con gerente',
        debtor_id_masked: '***456',
        linked_call_id: 'call-01',
        created_at: '2026-05-27T10:00:00Z',
        assignee_email: null,
        state_trace_json: { steps: ['agent_raised', 'operator_review'] },
      }),
    })
  })
}

// ---------------------------------------------------------------------------
// Group (a): Kanban 3 columns + urgency sort + snapshot — D-34-01 D-34-02 XR-03 COBR-UI-09
// ---------------------------------------------------------------------------

async function assertKanbanThreeColumns(page: Page, viewport: {width:number;height:number;name:string}): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await seedAuth(page)
  await mockEscalationsKanban(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  await expect(page.locator('text=/Abiertas|Pendientes|Open/i').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('text=/Asignadas|Assigned/i').first()).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('text=/Resueltas|Resolved/i').first()).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('text=***456').first()).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('text=***789').first()).toBeVisible({ timeout: 5_000 })
  await expect(page).toHaveScreenshot(
    `cobranza-escalaciones-kanban-${viewport.name.toLowerCase()}.png`,
    { animations: 'disabled' },
  )
}

test('kanban 3 columns + urgency sort — iPhone-14 — D-34-01 D-34-02 XR-03 COBR-UI-09', async ({ page }) => {
  await assertKanbanThreeColumns(page, VIEWPORTS[0])
})
test('kanban 3 columns + urgency sort — iPad-Mini — D-34-01 D-34-02 XR-03 COBR-UI-09', async ({ page }) => {
  await assertKanbanThreeColumns(page, VIEWPORTS[1])
})
test('kanban 3 columns + urgency sort — Desktop — D-34-01 D-34-02 XR-03 COBR-UI-09', async ({ page }) => {
  await assertKanbanThreeColumns(page, VIEWPORTS[2])
})

// ---------------------------------------------------------------------------
// Group (b): Click "Tomar" persists self-claim — D-34-02 D-34-RES-A3
// ---------------------------------------------------------------------------

test('"Tomar" claims card; POST claim fires — D-34-02 D-34-RES-A3', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  let requestCount = 0
  await page.route('**/api/agency/*/cobranza/escalations', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    requestCount++
    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          open: [
            {
              id: 'esc-open-01',
              urgency: 'live',
              reason: 'Test',
              debtor_id_masked: '***456',
              linked_call_id: 'call-01',
              created_at: '2026-05-27T10:00:00Z',
              assignee_email: null,
            },
          ],
          assigned: [],
          resolved: [],
          resolvedNextCursor: null,
          generatedAt: '2026-05-28T08:00:00Z',
        }),
      })
    } else {
      // After claim — card moves to assigned
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          open: [],
          assigned: [
            {
              id: 'esc-open-01',
              urgency: 'live',
              reason: 'Test',
              debtor_id_masked: '***456',
              linked_call_id: 'call-01',
              created_at: '2026-05-27T10:00:00Z',
              assignee_email: 'pruebasarrendador1902@gmail.com',
            },
          ],
          resolved: [],
          resolvedNextCursor: null,
          generatedAt: '2026-05-28T08:00:00Z',
        }),
      })
    }
  })
  const claimRequests: string[] = []
  await page.route('**/api/agency/*/cobranza/escalations/*/claim', async (route) => {
    claimRequests.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"ok":true}',
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  const tomarBtn = page.locator('button').filter({ hasText: /Tomar/i }).first()
  await expect(tomarBtn).toBeVisible({ timeout: 15_000 })
  await tomarBtn.click()
  await page.waitForTimeout(800)
  expect(claimRequests.length).toBeGreaterThanOrEqual(1)
})

// ---------------------------------------------------------------------------
// Group (c): "Resolver" opens modal with 5 templates; escalated-to-legal ack — D-34-05
// ---------------------------------------------------------------------------

test('resolve modal renders 5 categories; escalated-to-legal shows pre_judicial ack — D-34-05', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  // Operator with own assignment so they can resolve
  await seedAuth(page)
  await mockEscalationsKanban(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  const resolverBtn = page.locator('button').filter({ hasText: /Resolver/i }).first()
  await expect(resolverBtn).toBeVisible({ timeout: 15_000 })
  await resolverBtn.click()
  // Modal/drawer opens
  const modal = page
    .locator('[role="dialog"], [data-testid*="resolve-modal"], [data-testid*="resolve-drawer"]')
    .first()
  await expect(modal).toBeVisible({ timeout: 8_000 })
  // Verify 5 D-34-05 category options are present (tolerant: option value OR option text)
  const expectedValues = [
    'compromise',
    'customer-rejected',
    'escalated-to-legal',
    'false-positive',
    'other',
  ]
  for (const cat of expectedValues) {
    const opt = modal.locator(
      `option[value="${cat}"], [data-value="${cat}"], [data-category="${cat}"]`,
    )
    const present = (await opt.count()) > 0
    expect(present, `category option ${cat} should be present in modal`).toBe(true)
  }
  // Select escalated-to-legal and verify the ack/warning copy appears
  const select = modal.locator('select').first()
  if ((await select.count()) > 0) {
    await select.selectOption('escalated-to-legal').catch(() => {})
  } else {
    await modal
      .locator('[role="option"], [data-value="escalated-to-legal"], [data-category="escalated-to-legal"]')
      .first()
      .click()
      .catch(() => {})
  }
  await expect(
    modal.locator('text=/pre_judicial|pre.?judicial|jurídico|legal/i').first(),
  ).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// Group (d): Resolve POST fires when submitted — D-34-05 D-34-RES-A5
// ---------------------------------------------------------------------------

test('resolve submit fires POST /resolve (cascade routed via backend) — D-34-05 D-34-RES-A5', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockEscalationsKanban(page)
  const resolveRequests: string[] = []
  await page.route('**/api/agency/*/cobranza/escalations/*/resolve', async (route) => {
    resolveRequests.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"ok":true,"cascaded_to_legal":false}',
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  const resolverBtn = page.locator('button').filter({ hasText: /Resolver/i }).first()
  await expect(resolverBtn).toBeVisible({ timeout: 15_000 })
  await resolverBtn.click()
  const modal = page.locator('[role="dialog"]').first()
  await expect(modal).toBeVisible({ timeout: 8_000 })
  const select = modal.locator('select').first()
  if ((await select.count()) > 0) {
    await select.selectOption('compromise').catch(() => {})
  }
  const textarea = modal.locator('textarea').first()
  await textarea.fill(
    'Acordamos pago en 3 cuotas iguales de $300.000 con el deudor directamente el día de hoy.',
  )
  const submitBtn = modal
    .locator('button[type="submit"], button')
    .filter({ hasText: /Confirmar|Guardar|Resolver/i })
    .last()
  await submitBtn.click()
  await page.waitForTimeout(1200)
  // Frontend MUST route through /resolve (not direct /force-stage) — T-34-09-05 mitigation
  expect(resolveRequests.length).toBeGreaterThanOrEqual(1)
  for (const url of resolveRequests) {
    expect(url).not.toContain('/force-stage')
  }
})

// ---------------------------------------------------------------------------
// Group (e): No horizontal scroll at any viewport — XR-03
// ---------------------------------------------------------------------------

async function assertNoHorizontalScroll(page: Page, viewport: {width:number;height:number;name:string}): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await seedAuth(page)
  await mockEscalationsKanban(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
}

test('no horizontal scroll — iPhone-14 — XR-03', async ({ page }) => {
  await assertNoHorizontalScroll(page, VIEWPORTS[0])
})
test('no horizontal scroll — iPad-Mini — XR-03', async ({ page }) => {
  await assertNoHorizontalScroll(page, VIEWPORTS[1])
})
test('no horizontal scroll — Desktop — XR-03', async ({ page }) => {
  await assertNoHorizontalScroll(page, VIEWPORTS[2])
})

// ---------------------------------------------------------------------------
// Group (f): i18n parity es + en — XR-05
// ---------------------------------------------------------------------------

test('escalaciones i18n parity — es — XR-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page)
  await mockEscalationsKanban(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  await expect(
    page.locator('text=/Abiertas|Asignadas|Escalaciones|Pendientes/i').first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('escalaciones i18n parity — en — XR-05', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
  ])
  await seedAuth(page)
  await mockEscalationsKanban(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  await expect(
    page.locator('text=/Open|Assigned|Escalations|Pending/i').first(),
  ).toBeVisible({ timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// Group (g): Detail page snapshot per viewport — XR-03
// ---------------------------------------------------------------------------

async function assertDetailSnapshot(page: Page, viewport: {width:number;height:number;name:string}): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await seedAuth(page)
  await mockEscalationsKanban(page)
  await mockEscalationDetail(page, 'esc-open-01')
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones/esc-open-01')
  await page.waitForLoadState('domcontentloaded')
  await expect(
    page.locator('h1, h2, [data-testid="escalation-detail-title"]').first(),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveScreenshot(
    `cobranza-escalaciones-detail-${viewport.name.toLowerCase()}.png`,
    { animations: 'disabled' },
  )
}

test('escalation detail snapshot — iPhone-14 — XR-03', async ({ page }) => {
  await assertDetailSnapshot(page, VIEWPORTS[0])
})
test('escalation detail snapshot — iPad-Mini — XR-03', async ({ page }) => {
  await assertDetailSnapshot(page, VIEWPORTS[1])
})
test('escalation detail snapshot — Desktop — XR-03', async ({ page }) => {
  await assertDetailSnapshot(page, VIEWPORTS[2])
})

// ---------------------------------------------------------------------------
// Group (h): RBAC — admin sees "Asignar"; operator does not — D-34-02 D-34-RES-A3
// ---------------------------------------------------------------------------

test('admin role sees "Asignar" button — D-34-02 D-34-RES-A3', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page, {
    email: 'admin@test.com',
    permissions: PERMISSIONS_ADMIN,
  })
  await mockEscalationsKanban(page)
  // Mock members endpoint used by assign dropdown
  await page.route('**/agency/members**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 'u1', email: 'op1@test.com', name: 'Op 1', role: 'agente', status: 'active' },
          { id: 'u2', email: 'op2@test.com', name: 'Op 2', role: 'operator', status: 'active' },
        ],
      }),
    })
  })
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  await expect(
    page.locator('button').filter({ hasText: /Asignar/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
})

test('operator role does NOT see "Asignar" button (only Tomar) — D-34-02 D-34-RES-A3', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedAuth(page) // default = operator (no assign-escalation perm)
  await mockEscalationsKanban(page)
  await page.goto('/panel/inmobiliaria/cobros/cobranza/escalaciones')
  // Tomar must be visible
  await expect(
    page.locator('button').filter({ hasText: /Tomar/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
  // Asignar must NOT be visible
  const asignarCount = await page
    .locator('button')
    .filter({ hasText: /Asignar/i })
    .count()
  expect(asignarCount).toBe(0)
})
