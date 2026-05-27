import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks (declared BEFORE importing hooks under test).
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'AGY-TEST' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

// Supabase mock for the realtime test (Test 6)
type SubscribeCb = (status: string) => void
type ChangeHandler = (payload: { new: Record<string, unknown> }) => void

interface StubChannel {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  __handlers: ChangeHandler[]
}

const channels: StubChannel[] = []
let supabaseStub: {
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
} | null = null

function makeChannel(): StubChannel {
  const ch: StubChannel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    __handlers: [],
  }
  ch.on.mockImplementation((_event: string, _opts: unknown, handler: ChangeHandler) => {
    ch.__handlers.push(handler)
    return ch
  })
  ch.subscribe.mockImplementation((cb: SubscribeCb) => {
    cb('SUBSCRIBED')
    return ch
  })
  return ch
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => supabaseStub,
}))

// ---------------------------------------------------------------------------
// Imports under test (after mocks)
// ---------------------------------------------------------------------------

import {
  usePaymentPlanApproval,
  type UsePaymentPlanApprovalOptions,
  type UsePaymentPlanApprovalResult,
} from '../use-payment-plan-approval'
import { usePaymentsFunnelRealtime, type CarteraPaymentEvent } from '../use-payments-funnel-realtime'

const AGENT_URL = 'http://localhost:4000'

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = AGENT_URL
  channels.length = 0
  supabaseStub = {
    channel: vi.fn((_name: string) => {
      const ch = makeChannel()
      channels.push(ch)
      return ch
    }),
    removeChannel: vi.fn(),
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Plan/debtor/policy fixture + fetch routing
// ---------------------------------------------------------------------------

function makePlan(overrides?: { discount?: number; status?: string; planId?: string }) {
  return {
    planId: overrides?.planId ?? 'PLAN-1',
    tenantId: 'TEN-1',
    debtorId: 'DBT-1',
    stage: 'S3',
    status: overrides?.status ?? 'offered',
    paymentProvider: 'wompi',
    paymentUrl: null,
    totalDueCop: 1_500_000,
    initialAmountCop: 1_500_000,
    discountAppliedPct: overrides?.discount ?? 10,
    discountKind: 'standard',
    offeredAt: '2026-05-27T00:00:00Z',
    acceptedAt: null,
    defaultedAt: null,
    installments: [
      {
        number: 1,
        dueDate: '2026-06-15',
        amountCop: 500_000,
        status: 'pending',
        paidAt: null,
      },
      { number: 2, dueDate: '2026-07-15', amountCop: 500_000, status: 'pending', paidAt: null },
      { number: 3, dueDate: '2026-08-15', amountCop: 500_000, status: 'pending', paidAt: null },
    ],
  }
}

function makeDebtor() {
  return {
    id: 'DBT-1',
    fullName: 'Juan Pérez',
    currentStage: 'S3',
    daysInStage: 12,
    lastActivityAt: '2026-05-26T00:00:00Z',
    cedulaMasked: '12•••678',
    phoneMasked: '300•••5678',
    emailMasked: 'j•••@gmail.com',
    fiadorCedulaMasked: null,
    carterapausedUntil: null,
    isPaused: false,
    sidebar: {},
    kpis: {},
    generatedAt: '2026-05-27T00:00:00Z',
  }
}

function makePolicy(overrides?: { maxDiscountPct?: number }) {
  return {
    tenantId: 'TEN-1',
    maxDiscountPct: overrides?.maxDiscountPct ?? 15,
    maxPlanMonths: 12,
    minPaymentCop: 50_000,
    autoEscalateAfterDays: 7,
    allowHardshipPath: true,
    billingModel: 'success_fee',
    successFeePct: 0.05,
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
    allowedPaymentPlans: null,
    negotiationMaxAttempts: 3,
    crmProvider: 'wasi',
    erpProvider: 'alegra',
    dailyReportThresholds: null,
    dailyReportWhatsappEnabled: false,
    siniestroCanonesThreshold: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-26T00:00:00Z',
  }
}

interface FetchRouting {
  plan?: ReturnType<typeof makePlan>
  debtor?: ReturnType<typeof makeDebtor>
  policy?: ReturnType<typeof makePolicy>
}

function installFetch(routing: FetchRouting): {
  fetchMock: ReturnType<typeof vi.fn>
  calls: Array<{ url: string; init: RequestInit | undefined }>
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    calls.push({ url: u, init })
    if (u.includes('/cartera/payment-plans/') && u.endsWith('/approve')) {
      return new Response(
        JSON.stringify({
          planId: 'PLAN-1',
          wompiUrl: 'https://checkout.wompi.co/l/abc123',
          approvedAt: '2026-05-27T01:00:00Z',
          operatorApprovedBy: 'USR-1',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    if (u.includes('/cartera/payment-plans/') && u.endsWith('/reject')) {
      return new Response(
        JSON.stringify({ planId: 'PLAN-1', status: 'rejected', rejectedAt: '2026-05-27T01:00:00Z' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    if (u.includes('/cartera/payment-plans/offer')) {
      return new Response(JSON.stringify({ planId: 'PLAN-2' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (u.includes('/cartera/payment-plans/')) {
      return new Response(JSON.stringify(routing.plan ?? makePlan()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (u.includes('/cobranza/debtors/')) {
      return new Response(JSON.stringify(routing.debtor ?? makeDebtor()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (u.endsWith('/policy')) {
      return new Response(JSON.stringify(routing.policy ?? makePolicy()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response('not found', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface HarnessRef {
  current: UsePaymentPlanApprovalResult | null
}

function mount(opts: UsePaymentPlanApprovalOptions): {
  ref: HarnessRef
  root: Root
  container: HTMLDivElement
} {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const Harness = () => {
    ref.current = usePaymentPlanApproval(opts)
    return null
  }

  act(() => {
    root.render(<Harness />)
  })
  return { ref, root, container }
}

async function flush(): Promise<void> {
  // Let the in-flight fetch promises + state updates settle.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePaymentPlanApproval', () => {
  it('Test 1: max_discount hard-block — isMaxDiscountExceeded=true when proposed.discount > agency.maxDiscount', async () => {
    installFetch({
      plan: makePlan({ discount: 25 }),
      policy: makePolicy({ maxDiscountPct: 15 }),
    })
    const { ref, root, container } = mount({ planId: 'PLAN-1', canApprove: true })
    await flush()
    expect(ref.current?.plan?.proposed.discount).toBe(25)
    expect(ref.current?.plan?.agency.maxDiscount).toBe(15)
    expect(ref.current?.isMaxDiscountExceeded).toBe(true)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 2: approvePlan disabled when canApprove=false — returns PERMISSION_DENIED and skips fetch', async () => {
    const { fetchMock } = installFetch({})
    const { ref, root, container } = mount({ planId: 'PLAN-1', canApprove: false })
    await flush()

    fetchMock.mockClear()
    let result: { wompiLink: string } | { error: string } | null = null
    await act(async () => {
      result = (await ref.current!.approvePlan()) as
        | { wompiLink: string }
        | { error: string }
    })
    expect(result).toEqual({ error: 'PERMISSION_DENIED' })
    // No /approve call should have been issued.
    const approveCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).endsWith('/approve'),
    )
    expect(approveCalls.length).toBe(0)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 3: rejectPlan requires canned reason — throws when undefined, proceeds when valid slug', async () => {
    const { fetchMock } = installFetch({})
    const { ref, root, container } = mount({ planId: 'PLAN-1', canApprove: true })
    await flush()

    // No reason → throws synchronously (Promise rejection).
    await act(async () => {
      await expect(
        ref.current!.rejectPlan({ reject_reason: undefined }),
      ).rejects.toThrow(/reject_reason/i)
    })

    fetchMock.mockClear()
    let res: { ok: true } | { error: string } | null = null
    await act(async () => {
      res = (await ref.current!.rejectPlan({ reject_reason: 'discount_too_high' })) as
        | { ok: true }
        | { error: string }
    })
    expect(res).toEqual({ ok: true })
    const rejectCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).endsWith('/reject'),
    )
    expect(rejectCalls.length).toBe(1)
    const body = JSON.parse(String((rejectCalls[0][1] as RequestInit).body))
    expect(body.reject_reason).toBe('discount_too_high')
    act(() => root.unmount())
    container.remove()
  })

  it('Test 4: Modificar slider clamp — discount=99 with maxDiscount=15 sends discount=15 to /offer', async () => {
    const { fetchMock } = installFetch({
      plan: makePlan({ discount: 10 }),
      policy: makePolicy({ maxDiscountPct: 15 }),
    })
    const { ref, root, container } = mount({ planId: 'PLAN-1', canApprove: true })
    await flush()

    fetchMock.mockClear()
    await act(async () => {
      await ref.current!.modifyPlan({
        discount: 99,
        cuotas: 4,
        montoPorCuota: 400_000,
        fechaPrimerPago: '2026-06-15',
      })
    })

    const offerCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).endsWith('/cartera/payment-plans/offer'),
    )
    expect(offerCall).toBeTruthy()
    const offerBody = JSON.parse(String((offerCall![1] as RequestInit).body))
    expect(offerBody.discount).toBe(15)

    // Also verifies the second-step /reject(counter_offer) call.
    const rejectCall = fetchMock.mock.calls.find(
      (c) =>
        String(c[0]).includes('/cartera/payment-plans/PLAN-1/reject'),
    )
    expect(rejectCall).toBeTruthy()
    const rejectBody = JSON.parse(String((rejectCall![1] as RequestInit).body))
    expect(rejectBody.reject_reason).toBe('counter_offer')
    act(() => root.unmount())
    container.remove()
  })

  it('Test 5: optimistic update on approve success — plan.status becomes "approved" + wompiLink populated without a second GET', async () => {
    const { fetchMock } = installFetch({})
    const { ref, root, container } = mount({ planId: 'PLAN-1', canApprove: true })
    await flush()

    const getCallsBefore = fetchMock.mock.calls.filter((c) =>
      /\/cartera\/payment-plans\/PLAN-1$/.test(String(c[0])),
    ).length

    await act(async () => {
      await ref.current!.approvePlan()
    })

    const getCallsAfter = fetchMock.mock.calls.filter((c) =>
      /\/cartera\/payment-plans\/PLAN-1$/.test(String(c[0])),
    ).length

    expect(ref.current?.plan?.status).toBe('approved')
    expect(ref.current?.plan?.wompiLink).toBe('https://checkout.wompi.co/l/abc123')
    // No extra GET issued by the approve flow itself.
    expect(getCallsAfter).toBe(getCallsBefore)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 6: realtime payload triggers parent onUpdate callback with mapped row', () => {
    const onUpdate = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const Harness = () => {
      usePaymentsFunnelRealtime({ planId: 'PLAN-1', onUpdate })
      return null
    }
    act(() => {
      root.render(<Harness />)
    })

    expect(channels.length).toBe(1)
    const handler = channels[0].__handlers[0]
    expect(handler).toBeDefined()
    act(() => {
      handler({
        new: {
          id: 'evt-1',
          plan_id: 'PLAN-1',
          status: 'approved',
          amount: 250_000,
          provider: 'wompi',
          updated_at: '2026-05-27T02:00:00Z',
        },
      })
    })

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const received = onUpdate.mock.calls[0][0] as CarteraPaymentEvent
    expect(received).toEqual({
      id: 'evt-1',
      planId: 'PLAN-1',
      status: 'approved',
      amount: 250_000,
      provider: 'wompi',
      updatedAt: '2026-05-27T02:00:00Z',
    })

    act(() => root.unmount())
    container.remove()
  })
})
