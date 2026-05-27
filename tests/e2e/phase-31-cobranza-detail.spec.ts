import { test, expect } from '@playwright/test'

// Phase 31 plan 31-12 (XR-03) visual regression for the 3 new cobranza surfaces:
//   - /panel/inmobiliaria/ai/cobranza/deudores              (list, default sort days_in_stage DESC)
//   - /panel/inmobiliaria/ai/cobranza/deudores/[id]         (debtor detail, Timeline tab active)
//   - /panel/inmobiliaria/ai/cobranza/llamadas/[callId]     (call detail, audio + transcript)
//
// Fan-out: 3 tests × 3 viewport projects (iPhone 14 / iPad Mini / Desktop Chrome 1440)
// = 9 baseline PNGs under tests/e2e/phase-31-cobranza-detail.spec.ts-snapshots/.
//
// The spec route-mocks the agent so the BACKEND DOES NOT need to be running.
// Auth: installMocks() seeds `localStorage['arriendo-facil-auth']` with a
// role='agency' shape — that uses ProtectedRoute's existing localStorage
// fallback (src/components/auth/ProtectedRoute.tsx) to pass without a real
// Supabase session.
//
// PageGuard (module='cobranza'|'cotizador') still requires `agentPerms` to be
// populated, which in turn needs `NEXT_PUBLIC_AGENT_URL` set. Per memory
// `v2.1 visual smoke env workaround`, the canAccess() function in
// src/lib/context/PermissionsContext.tsx must be temporarily patched with the
// documented localhost bypass to capture baselines locally — REVERT BEFORE COMMIT.
//
// To re-capture / update baselines (after applying the documented bypass):
//   pnpm dev  # start mvp on :3001
//   PLAYWRIGHT_BASE_URL=http://localhost:3001 \
//     npx playwright test tests/e2e/phase-31-cobranza-detail.spec.ts --update-snapshots
//
// Baselines committed 2026-05-27. Future regressions will only be caught when
// the spec is re-run against a build that matches the bypass conditions
// (i.e. the permanent fix lands: NEXT_PUBLIC_AGENT_URL set + seeded agency
// test user + mocked /my-permissions). Until then, this spec verifies that
// the page chrome (breadcrumb, filters, tabs, sidebar, audio player) renders.

const DEBTOR_ID = 'test-debtor-1'
const CALL_ID = 'test-call-1'

// Fixed epoch so timestamp formatting is deterministic across runs.
// 2026-05-27T12:00:00Z = 1779696000000
const FIXED_NOW = 1779696000000

// --- Mock fixtures ----------------------------------------------------------

const DEBTORS_LIST_PAYLOAD = {
  items: [
    {
      id: 'd-20',
      fullName: 'Patricia Salazar',
      currentStage: 'S4',
      daysInStage: 20,
      lastActivityAt: '2026-05-07T10:00:00Z',
      cedulaMasked: '52•••890',
      phoneMasked: '301•••2222',
      emailMasked: 'p•••@gmail.com',
      channel: 'voice',
      isPaused: false,
      carteraPausedUntil: null,
    },
    {
      id: 'd-12',
      fullName: 'Carlos Mendoza',
      currentStage: 'S3',
      daysInStage: 12,
      lastActivityAt: '2026-05-15T10:00:00Z',
      cedulaMasked: '79•••456',
      phoneMasked: '302•••3333',
      emailMasked: 'c•••@hotmail.com',
      channel: 'whatsapp',
      isPaused: false,
      carteraPausedUntil: null,
    },
    {
      id: 'd-08',
      fullName: 'Juan García',
      currentStage: 'S3',
      daysInStage: 8,
      lastActivityAt: '2026-05-19T10:00:00Z',
      cedulaMasked: '12•••678',
      phoneMasked: '300•••4444',
      emailMasked: 'j•••@gmail.com',
      channel: 'voice',
      isPaused: false,
      carteraPausedUntil: null,
    },
    {
      id: 'd-05',
      fullName: 'María Rodríguez',
      currentStage: 'S2',
      daysInStage: 5,
      lastActivityAt: '2026-05-22T10:00:00Z',
      cedulaMasked: '98•••321',
      phoneMasked: '301•••9876',
      emailMasked: 'm•••@gmail.com',
      channel: 'whatsapp',
      isPaused: false,
      carteraPausedUntil: null,
    },
    {
      id: 'd-03',
      fullName: 'Andrés Pérez',
      currentStage: 'S1',
      daysInStage: 3,
      lastActivityAt: '2026-05-24T10:00:00Z',
      cedulaMasked: '34•••567',
      phoneMasked: '305•••1111',
      emailMasked: 'a•••@gmail.com',
      channel: 'email',
      isPaused: false,
      carteraPausedUntil: null,
    },
  ],
  nextCursor: null,
  generatedAt: '2026-05-27T12:00:00Z',
}

const DEBTOR_DETAIL_PAYLOAD = {
  id: DEBTOR_ID,
  fullName: 'Patricia Salazar',
  currentStage: 'S4',
  daysInStage: 20,
  isPaused: false,
  carteraPausedUntil: null,
  contactAttemptsCount: 7,
  nextActionAt: '2026-05-27T14:14:00Z',
  cedulaMasked: '52•••890',
  phoneMasked: '301•••2222',
  emailMasked: 'p•••@gmail.com',
  fiadorCedulaMasked: '44•••111',
  generatedAt: '2026-05-27T12:00:00Z',
}

const DEBTOR_TIMELINE_PAYLOAD = {
  items: [
    {
      id: 'evt-6',
      type: 'stage_transition',
      occurredAt: '2026-05-26T15:00:00Z',
      payload: { from: 'S3', to: 'S4', reason: 'no_response' },
    },
    {
      id: 'evt-5',
      type: 'call',
      occurredAt: '2026-05-25T17:00:00Z',
      payload: { callId: CALL_ID, outcome: 'no_answer', durationSec: 22 },
    },
    {
      id: 'evt-4',
      type: 'memo',
      occurredAt: '2026-05-24T11:00:00Z',
      payload: { author: 'operador', text: 'Cliente reporta retraso de nómina.' },
    },
    {
      id: 'evt-3',
      type: 'call',
      occurredAt: '2026-05-22T16:00:00Z',
      payload: { callId: 'c-prev-1', outcome: 'ptp', durationSec: 145 },
    },
    {
      id: 'evt-2',
      type: 'payment',
      occurredAt: '2026-05-18T09:00:00Z',
      payload: { amount: 250000, currency: 'COP' },
    },
    {
      id: 'evt-1',
      type: 'stage_transition',
      occurredAt: '2026-05-10T08:00:00Z',
      payload: { from: 'S2', to: 'S3', reason: 'sla_expired' },
    },
  ],
  generatedAt: '2026-05-27T12:00:00Z',
}

const CALL_DETAIL_PAYLOAD = {
  id: CALL_ID,
  debtorId: DEBTOR_ID,
  debtorName: 'Patricia Salazar',
  startedAt: '2026-05-25T17:00:00Z',
  durationSec: 142,
  outcome: 'ptp',
  hasRecording: true,
  qa: {
    overall: 0.82,
    tone: 0.9,
    compliance: 0.78,
    recovery: 0.85,
    clarity: 0.8,
  },
  complianceFlags: [
    { id: 'cf-1', code: 'identity_verified', severity: 'info' },
    { id: 'cf-2', code: 'amount_disclosed', severity: 'info' },
  ],
  stateTrace: [
    { at: '2026-05-25T17:00:05Z', from: 'idle', to: 'identity', actor: 'agent' },
    { at: '2026-05-25T17:00:30Z', from: 'identity', to: 'discovery', actor: 'agent' },
    { at: '2026-05-25T17:01:15Z', from: 'discovery', to: 'negotiation', actor: 'agent' },
    { at: '2026-05-25T17:02:10Z', from: 'negotiation', to: 'ptp', actor: 'agent' },
  ],
  cost: {
    llm: 0.012,
    voice: 0.045,
    whatsapp: 0,
    total: 0.057,
    currency: 'USD',
  },
  generatedAt: '2026-05-27T12:00:00Z',
}

const CALL_TRANSCRIPT_PAYLOAD = {
  turns: [
    { id: 't-1', speaker: 'bot', at: 0, text: 'Buenas tardes, hablo con Patricia Salazar?', complianceFlagIds: [] },
    { id: 't-2', speaker: 'deudor', at: 3, text: 'Sí, con ella.', complianceFlagIds: [] },
    { id: 't-3', speaker: 'bot', at: 5, text: 'Le confirmo su cédula terminada en 890.', complianceFlagIds: ['cf-1'] },
    { id: 't-4', speaker: 'deudor', at: 9, text: 'Correcto.', complianceFlagIds: [] },
    { id: 't-5', speaker: 'bot', at: 11, text: 'Su saldo pendiente es de quinientos mil pesos.', complianceFlagIds: ['cf-2'] },
    { id: 't-6', speaker: 'deudor', at: 16, text: 'Entiendo. ¿Cuándo debo pagar?', complianceFlagIds: [] },
    { id: 't-7', speaker: 'bot', at: 19, text: 'Le propongo pagar el viernes treinta de mayo.', complianceFlagIds: [] },
    { id: 't-8', speaker: 'deudor', at: 24, text: 'De acuerdo, ese día puedo pagar.', complianceFlagIds: [] },
  ],
  generatedAt: '2026-05-27T12:00:00Z',
}

// Tiny silent 1-second WAV header bytes. The audio element only needs metadata
// to render scrub + duration; we don't actually play it.
const SILENT_WAV_BASE64 =
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

// --- Helpers ----------------------------------------------------------------

async function installMocks(page: import('@playwright/test').Page) {
  // Auth bypass: ProtectedRoute trusts a localStorage fallback at 'arriendo-facil-auth'
  // when the Supabase context user is null (see src/components/auth/ProtectedRoute.tsx).
  // Seeding a role='agency' shape lets PageGuard pass without a real Supabase session.
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'arriendo-facil-auth',
        JSON.stringify({
          id: 'test-user-1',
          role: 'agency',
          backendRole: 'AGENT',
          onboardingCompleted: true,
          email: 'test@example.com',
        }),
      )
    } catch {
      // ignore
    }
  })

  // Fix Date.now so any "x time ago" / sidebar countdown is deterministic.
  await page.addInitScript((fixedNow) => {
    const OriginalDate = Date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).Date = class extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        // @ts-expect-error variadic forwarding
        super(...(args.length ? args : [fixedNow]))
      }
      static now() {
        return fixedNow
      }
    }
  }, FIXED_NOW)

  // Permissions endpoint — let cobranza actions through.
  await page.route('**/api/agency/**/my-permissions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modules: {
          cobranza: { view: true, intervene: true, 'force-stage': true, reveal_pii: true },
        },
      }),
    })
  })

  // Debtors list.
  await page.route('**/cobranza/debtors**', async (route, request) => {
    // Don't hijack the single-debtor detail endpoint.
    if (/\/cobranza\/debtors\/[^/]+(\/|$|\?)/.test(request.url())) return route.continue()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DEBTORS_LIST_PAYLOAD),
    })
  })

  // Debtor detail.
  await page.route(`**/cobranza/debtors/${DEBTOR_ID}**`, async (route, request) => {
    const url = request.url()
    if (url.endsWith('/timeline') || url.includes('/timeline?')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DEBTOR_TIMELINE_PAYLOAD),
      })
    }
    if (url.includes('/calls')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], generatedAt: '2026-05-27T12:00:00Z' }),
      })
    }
    if (url.includes('/memos')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], generatedAt: '2026-05-27T12:00:00Z' }),
      })
    }
    if (url.includes('/compromisos')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentPlans: [],
          insuranceClaims: [],
          legalArtifacts: [],
          generatedAt: '2026-05-27T12:00:00Z',
        }),
      })
    }
    if (url.includes('/audit')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], generatedAt: '2026-05-27T12:00:00Z' }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DEBTOR_DETAIL_PAYLOAD),
    })
  })

  // Call detail.
  await page.route(`**/cobranza/calls/${CALL_ID}**`, async (route, request) => {
    const url = request.url()
    if (url.endsWith('/transcript') || url.includes('/transcript?')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CALL_TRANSCRIPT_PAYLOAD),
      })
    }
    if (url.endsWith('/audio') || url.includes('/audio?')) {
      return route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: { 'accept-ranges': 'bytes', 'cache-control': 'no-store' },
        body: Buffer.from(SILENT_WAV_BASE64, 'base64'),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CALL_DETAIL_PAYLOAD),
    })
  })
}

// --- Tests ------------------------------------------------------------------

test.describe('phase 31 cobranza visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await installMocks(page)
  })

  test('debtors list — default sort days_in_stage DESC', async ({ page }) => {
    await page.goto('/panel/inmobiliaria/ai/cobranza/deudores')

    // Wait for page chrome to be present (table OR empty state OR PageGuard fallback).
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(200)

    await expect(page).toHaveScreenshot('debtors-list.png', {
      fullPage: true,
    })
  })

  test('debtor detail — Timeline tab active, bottom-drawer at sm', async ({ page }) => {
    await page.goto(`/panel/inmobiliaria/ai/cobranza/deudores/${DEBTOR_ID}`)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(200)

    await expect(page).toHaveScreenshot('debtor-detail-timeline.png', {
      fullPage: true,
      // Mask the live "Próxima acción en …" countdown; even with frozen Date.now
      // the sidebar's setInterval tick can fire mid-screenshot.
      mask: [page.locator('[data-testid="sidebar-countdown"]').or(page.getByText(/Próxima acción/i))],
    })
  })

  test('call detail — audio + transcript, sticky-top audio at sm', async ({ page }) => {
    await page.goto(`/panel/inmobiliaria/ai/cobranza/llamadas/${CALL_ID}`)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(200)

    await expect(page).toHaveScreenshot('call-detail.png', {
      fullPage: true,
    })
  })
})
