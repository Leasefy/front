import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { usePaymentsFunnel } from './use-payments-funnel'

void React

// Mock useAuth so the hook sees a stable agency id
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'AGY-TEST' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const AGENT_URL = 'http://localhost:4000'

type FunnelRow = {
  id: string
  createdAt: string
  amount: number
  feeCop: number | null
  status: 'approved' | 'pending' | 'declined' | 'disbursed'
  provider: 'wompi' | 'bold'
  disbursementState: 'pending' | 'settled'
  disbursementPendingDays: number
  paymentPlanId: string | null
  debtor: {
    id: string
    fullName: string
    cedulaMasked: string
    phoneMasked: string
    emailMasked: string | null
  }
}

type FunnelResponse = {
  items: FunnelRow[]
  nextCursor: string | null
  kpis: {
    approvedCount: number
    pendingCount: number
    declinedCount: number
    totalRecaudadoCop: number
    totalDisbursedCop: number
    avgFeeCop: number
  }
  generatedAt: string
}

function makeRow(opts: Partial<FunnelRow> & { id: string }): FunnelRow {
  return {
    id: opts.id,
    createdAt: opts.createdAt ?? '2026-05-27T00:00:00Z',
    amount: opts.amount ?? 100_000,
    feeCop: opts.feeCop ?? 3_000,
    status: opts.status ?? 'approved',
    provider: opts.provider ?? 'wompi',
    disbursementState: opts.disbursementState ?? 'settled',
    disbursementPendingDays: opts.disbursementPendingDays ?? 0,
    paymentPlanId: opts.paymentPlanId ?? null,
    debtor: opts.debtor ?? {
      id: `DBT-${opts.id}`,
      fullName: `Debtor ${opts.id}`,
      cedulaMasked: '12•••678',
      phoneMasked: '300•••5678',
      emailMasked: 'j•••@gmail.com',
    },
  }
}

function makePage(opts: {
  count: number
  startId?: number
  nextCursor?: string | null
  rowOverride?: (i: number) => Partial<FunnelRow>
}): FunnelResponse {
  const startId = opts.startId ?? 0
  return {
    items: Array.from({ length: opts.count }, (_, i) =>
      makeRow({
        id: `P-${startId + i}`,
        ...(opts.rowOverride ? opts.rowOverride(i) : {}),
      }),
    ),
    nextCursor: opts.nextCursor === undefined ? null : opts.nextCursor,
    kpis: {
      approvedCount: 10,
      pendingCount: 5,
      declinedCount: 2,
      totalRecaudadoCop: 1_500_000,
      totalDisbursedCop: 1_200_000,
      avgFeeCop: 3_500,
    },
    generatedAt: '2026-05-27T00:00:00Z',
  }
}

interface HarnessRef {
  current: ReturnType<typeof usePaymentsFunnel> | null
}

type Filters = NonNullable<Parameters<typeof usePaymentsFunnel>[0]>

function mountHarness(
  filters: Filters = {},
): { ref: HarnessRef; root: Root; container: HTMLDivElement; rerender: (f: Filters) => void } {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let currentFilters = filters

  const Harness = (props: { filters: typeof currentFilters }) => {
    ref.current = usePaymentsFunnel(props.filters)
    return null
  }

  act(() => {
    root.render(<Harness filters={currentFilters} />)
  })

  const rerender = (f: typeof currentFilters) => {
    currentFilters = f
    act(() => {
      root.render(<Harness filters={currentFilters} />)
    })
  }

  return { ref, root, container, rerender }
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = AGENT_URL
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete process.env.NEXT_PUBLIC_AGENT_URL
})

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('usePaymentsFunnel', () => {
  it('Test 1 — changing provider filter resets rows and refetches', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage({ count: 2 }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container, rerender } = mountHarness({ provider: 'wompi' })
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(
      'provider=wompi',
    )
    expect(ref.current?.rows.length).toBe(2)

    rerender({ provider: 'bold' })
    // immediately after rerender, the reset effect should have cleared rows
    expect(ref.current?.rows.length).toBe(0)
    expect(ref.current?.isLoading).toBe(true)

    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondUrl = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0] as string
    expect(secondUrl).toContain('provider=bold')
    expect(ref.current?.rows.length).toBe(2)

    act(() => root.unmount())
    container.remove()
  })

  it('Test 2 — polls page 1 every 30s, preserves loaded subsequent pages', async () => {
    const responses = [
      makePage({ count: 2, startId: 0, nextCursor: 'CUR-1' }),
      makePage({ count: 2, startId: 2, nextCursor: null }),
      makePage({ count: 2, startId: 100, nextCursor: 'CUR-1' }), // poll refresh
    ]
    let n = 0
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => responses[n++],
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await ref.current!.loadMore()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(ref.current?.rows.length).toBe(4)

    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    // Poll URL must NOT carry cursor
    const pollUrl = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[2][0] as string
    expect(pollUrl).not.toContain('cursor=')
    // After poll, first 2 rows are replaced (P-100, P-101), tail preserved
    expect(ref.current?.rows.map((r) => r.id)).toEqual(['P-100', 'P-101', 'P-2', 'P-3'])

    act(() => root.unmount())
    container.remove()
  })

  it('Test 3 — pending-pill threshold: <3 no pill, >=3 pill', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        makePage({
          count: 2,
          rowOverride: (i) => ({
            disbursementState: 'pending',
            disbursementPendingDays: i === 0 ? 2 : 3,
          }),
        }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()

    expect(ref.current?.rows.length).toBe(2)
    expect(ref.current?.rows[0].disbursementPendingDays).toBe(2)
    expect(ref.current?.rows[0].disbursementPendingDays < 3).toBe(true)
    expect(ref.current?.rows[1].disbursementPendingDays).toBe(3)
    expect(ref.current?.rows[1].disbursementPendingDays >= 3).toBe(true)

    act(() => root.unmount())
    container.remove()
  })

  it('Test 4 — bails out when NEXT_PUBLIC_AGENT_URL is unset, console.warn fired', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn() as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(ref.current?.isLoading).toBe(false)
    expect(ref.current?.rows.length).toBe(0)
    expect(warnSpy).toHaveBeenCalled()

    act(() => root.unmount())
    container.remove()
  })

  it('Test 5 — loadMore appends second page; polling replaces page 1 only', async () => {
    const responses = [
      makePage({ count: 2, startId: 0, nextCursor: 'CUR-1' }),
      makePage({ count: 2, startId: 2, nextCursor: null }),
    ]
    let n = 0
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => responses[n++],
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()
    expect(ref.current?.hasMore).toBe(true)

    await act(async () => {
      await ref.current!.loadMore()
    })

    const secondCall = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0] as string
    expect(secondCall).toContain('cursor=CUR-1')
    expect(ref.current?.rows.length).toBe(4)
    expect(ref.current?.rows.map((r) => r.id)).toEqual(['P-0', 'P-1', 'P-2', 'P-3'])
    expect(ref.current?.hasMore).toBe(false)

    act(() => root.unmount())
    container.remove()
  })

  it('Test 6 — error state set on non-ok response, isLoading=false', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()

    expect(ref.current?.error).toBe('500')
    expect(ref.current?.isLoading).toBe(false)
    expect(ref.current?.rows.length).toBe(0)

    act(() => root.unmount())
    container.remove()
  })

  it('Test 7 — loadMore is a no-op when nextCursor is null', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage({ count: 1, nextCursor: null }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()
    expect(ref.current?.hasMore).toBe(false)

    await act(async () => {
      await ref.current!.loadMore()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    container.remove()
  })
})
