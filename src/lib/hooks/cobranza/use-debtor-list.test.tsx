import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useDebtorList } from './use-debtor-list'

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

function makePage(opts: {
  count: number
  startId?: number
  nextCursor?: string | null
}): {
  items: Array<{
    id: string
    fullName: string
    currentStage: 'S1'
    daysInStage: number
    lastActivityAt: string
    cedulaMasked: string
    phoneMasked: string
    emailMasked: string | null
    channel: 'voice'
    isPaused: false
    carteraPausedUntil: null
  }>
  nextCursor: string | null
  generatedAt: string
} {
  const startId = opts.startId ?? 0
  return {
    items: Array.from({ length: opts.count }, (_, i) => ({
      id: `D-${startId + i}`,
      fullName: `Debtor ${startId + i}`,
      currentStage: 'S1' as const,
      daysInStage: 3,
      lastActivityAt: '2026-05-27T00:00:00Z',
      cedulaMasked: '12•••678',
      phoneMasked: '300•••5678',
      emailMasked: 'j•••@gmail.com',
      channel: 'voice' as const,
      isPaused: false as const,
      carteraPausedUntil: null,
    })),
    nextCursor: opts.nextCursor === undefined ? null : opts.nextCursor,
    generatedAt: '2026-05-27T00:00:00Z',
  }
}

interface HarnessRef {
  current: ReturnType<typeof useDebtorList> | null
}

type Filters = NonNullable<Parameters<typeof useDebtorList>[0]>

function mountHarness(
  filters: Filters = {},
): { ref: HarnessRef; root: Root; container: HTMLDivElement; rerender: (f: Filters) => void } {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  let currentFilters = filters

  const Harness = (props: { filters: typeof currentFilters }) => {
    ref.current = useDebtorList(props.filters)
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

describe('useDebtorList', () => {
  it('fetches page 1 on mount with no cursor', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage({ count: 3 }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const firstCall = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(firstCall).toBe(`${AGENT_URL}/api/agency/AGY-TEST/cobranza/debtors`)
    expect(ref.current?.pages.length).toBe(3)
    expect(ref.current?.isLoading).toBe(false)
    expect(ref.current?.hasMore).toBe(false)

    act(() => root.unmount())
    container.remove()
  })

  it('loadMore sends the prior nextCursor and concatenates the next page', async () => {
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
    expect(ref.current?.pages.length).toBe(4)
    expect(ref.current?.pages.map((p) => p.id)).toEqual(['D-0', 'D-1', 'D-2', 'D-3'])
    expect(ref.current?.hasMore).toBe(false)

    act(() => root.unmount())
    container.remove()
  })

  it('changing filters resets pages and refetches page 1', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage({ count: 1 }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container, rerender } = mountHarness({ stage: 'S1' })
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('stage=S1')

    rerender({ stage: 'S2,S3' })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondUrl = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0] as string
    expect(secondUrl).toContain('stage=S2%2CS3')
    expect(ref.current?.pages.length).toBe(1)

    act(() => root.unmount())
    container.remove()
  })

  it('polls page 1 every 30s', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage({ count: 1 }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { root, container } = mountHarness({})
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // Polling refresh must NOT carry a cursor (page-1-only)
    const url = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0] as string
    expect(url).not.toContain('cursor=')

    act(() => root.unmount())
    container.remove()
  })

  it('sets error on HTTP non-ok response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { ref, root, container } = mountHarness({})
    await flushPromises()

    expect(ref.current?.error).toBe('500')
    expect(ref.current?.pages.length).toBe(0)

    act(() => root.unmount())
    container.remove()
  })

  it('loadMore is a no-op when nextCursor is null', async () => {
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

  it('serializes a HEX:<8hex> search payload unchanged', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage({ count: 0 }),
    })) as unknown as typeof globalThis.fetch
    globalThis.fetch = fetchMock

    const { root, container } = mountHarness({ search: 'HEX:ef797c81' })
    await flushPromises()

    const url = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('search=HEX%3Aef797c81')

    act(() => root.unmount())
    container.remove()
  })
})
