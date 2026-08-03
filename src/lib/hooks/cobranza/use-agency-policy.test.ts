import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useAgencyPolicy } from './use-agency-policy'

void React

// ── Auth mock ────────────────────────────────────────────────────────────────

const mockAgency = { id: 'AGY-TEST' as string | null }

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: mockAgency.id ? { id: mockAgency.id } : null,
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const AGENT_URL = 'http://localhost:4000'

// ── Helpers ───────────────────────────────────────────────────────────────────

type HookResult = ReturnType<typeof useAgencyPolicy>

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make404Response(): Response {
  return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
}

function make500Response(): Response {
  return new Response(null, { status: 500 })
}

const POLICY_OK = {
  tenantId: 'TEN-1',
  maxDiscountPct: 0.2,
  maxPlanMonths: 12,
  minPaymentCop: 50000,
  autoEscalateAfterDays: 60,
  allowHardshipPath: true,
  billingModel: 'performance',
  successFeePct: 0.08,
  monthlyMinCop: 0,
  perDeudorCop: 0,
  baseFeeCop: 0,
  hybridPct: 0,
  alegraAccountId: null,
  crmCredentialsConfigured: false,
  centralCredentialsConfigured: false,
  legalCredentialsConfigured: false,
  paymentCredentialsConfigured: false,
  wasiAccountId: null,
  datacreditoAccountId: null,
  transunionAccountId: null,
  certicamaraAccountId: null,
  wompiAccountId: null,
  boldAccountId: null,
  allowedPaymentPlans: [3, 6, 12],
  negotiationMaxAttempts: 3,
  crmProvider: 'wasi',
  erpProvider: 'alegra',
  dailyReportThresholds: null,
  dailyReportWhatsappEnabled: false,
  siniestroCanonesThreshold: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// ── Test Harness ──────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = useAgencyPolicy()
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  result = undefined
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', AGENT_URL)
  mockAgency.id = 'AGY-TEST'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  root?.unmount()
  container.remove()
})

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(TestWrapper))
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAgencyPolicy', () => {
  it('fetches the policy and maps the response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(POLICY_OK))

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.notProvisioned).toBe(false)
    expect(result?.data?.maxDiscountPct).toBe(0.2)
    expect(result?.data?.crmProvider).toBe('wasi')
  })

  it('sets error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeTruthy()
    expect(result?.data).toBeNull()
  })

  it('sets notProvisioned on 404 (onboarding incompleto)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make404Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.notProvisioned).toBe(true)
    expect(result?.data).toBeNull()
    expect(result?.error).toBeNull()
  })

  it('patchPolicy PATCHes /policy with the partial body and updates data', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeOkResponse(POLICY_OK))
      .mockResolvedValueOnce(makeOkResponse({ ...POLICY_OK, maxDiscountPct: 0.3 }))

    await mount()
    expect(result?.data?.maxDiscountPct).toBe(0.2)

    await act(async () => {
      await result?.patchPolicy({ maxDiscountPct: 0.3 })
    })

    const patchCall = fetchSpy.mock.calls[1]
    expect(String(patchCall[0])).toBe(`${AGENT_URL}/api/agency/AGY-TEST/policy`)
    const init = patchCall[1] as RequestInit
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ maxDiscountPct: 0.3 })
    expect(result?.data?.maxDiscountPct).toBe(0.3)
  })
})
