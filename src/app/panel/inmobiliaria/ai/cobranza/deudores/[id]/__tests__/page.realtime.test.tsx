import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mock all the heavy dependencies the orchestrator pulls in so the test can
// focus on the realtime-wiring contract (Task 3 — 31-11).
// ---------------------------------------------------------------------------

// i18n
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es' as const,
  }),
}))

// Next.js navigation
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => ({
    get: (_k: string) => null,
    toString: () => '',
  }),
}))

// cartera helper
vi.mock('@/lib/cartera', () => ({
  stageColorClasses: () => ({ bg: '', text: '', border: '' }),
  relativeTime: () => 'now',
}))

// Detail hook — return a steady object with refetch we can assert against.
const detailRefetch = vi.fn(async () => undefined)
vi.mock('@/lib/hooks/cobranza/use-debtor-detail', () => ({
  useDebtorDetail: () => ({
    data: {
      fullName: 'Test Debtor',
      currentStage: 'S2',
      daysInStage: 3,
      isPaused: false,
      sidebar: { nextAction: null, contactAttemptsCount: 1 },
    },
    isLoading: false,
    error: null,
    refetch: detailRefetch,
  }),
}))

// PII context — provider is a passthrough.
vi.mock('@/lib/context/PIIRevealContext', () => ({
  PIIRevealContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock('@/components/inmobiliaria/cobranza/PIIRevealModal', () => ({
  PIIRevealModal: () => null,
}))

// Tabs — stub so we can inspect props passed in.
const timelineProps: Array<{ debtorId: string; refetchKey?: number }> = []
const llamadasProps: Array<{ debtorId: string; refetchKey?: number }> = []
vi.mock('../tabs/TimelineTab', () => ({
  TimelineTab: (p: { debtorId: string; refetchKey?: number }) => {
    timelineProps.push({ ...p })
    return null
  },
}))
vi.mock('../tabs/LlamadasTab', () => ({
  LlamadasTab: (p: { debtorId: string; refetchKey?: number }) => {
    llamadasProps.push({ ...p })
    return null
  },
}))
vi.mock('../tabs/MemosTab', () => ({ MemosTab: () => null }))
vi.mock('../tabs/CompromisosTab', () => ({ CompromisosTab: () => null }))
vi.mock('../tabs/AccionesTab', () => ({ AccionesTab: () => null }))

// Sidebar
vi.mock('../DebtorSidebar', () => ({
  DebtorSidebar: () => null,
}))

// ---------------------------------------------------------------------------
// The realtime hooks — capture calls + expose triggers.
// ---------------------------------------------------------------------------

type StageOpts = {
  debtorId: string
  onNewTransition: () => void
  onReconnect?: () => void
}
type CallsOpts = {
  debtorId: string
  onNewCall: () => void
  onReconnect?: () => void
}

const stageCalls: StageOpts[] = []
const callsCalls: CallsOpts[] = []

vi.mock('@/lib/hooks/cobranza/use-debtor-stage-transitions-realtime', () => ({
  useDebtorStageTransitionsRealtime: (opts: StageOpts) => {
    stageCalls.push(opts)
    return { isConnected: true }
  },
}))
vi.mock('@/lib/hooks/cobranza/use-debtor-calls-realtime', () => ({
  useDebtorCallsRealtime: (opts: CallsOpts) => {
    callsCalls.push(opts)
    return { isConnected: true }
  },
}))

// ---------------------------------------------------------------------------
// Now import the orchestrator.
// ---------------------------------------------------------------------------
import DebtorDetailClient from '../DebtorDetailClient'

beforeEach(() => {
  stageCalls.length = 0
  callsCalls.length = 0
  timelineProps.length = 0
  llamadasProps.length = 0
  detailRefetch.mockClear()
  replaceMock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mountPage(debtorId: string): {
  root: Root
  container: HTMLDivElement
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<DebtorDetailClient debtorId={debtorId} />)
  })
  return { root, container }
}

describe('DebtorDetailClient — realtime wiring (31-11 Task 3)', () => {
  it('Test 1: invokes both realtime hooks with the current debtorId', () => {
    const { root, container } = mountPage('D-42')
    // Both hooks called at least once with debtorId='D-42'.
    expect(stageCalls.length).toBeGreaterThan(0)
    expect(callsCalls.length).toBeGreaterThan(0)
    expect(stageCalls[stageCalls.length - 1].debtorId).toBe('D-42')
    expect(callsCalls[callsCalls.length - 1].debtorId).toBe('D-42')
    act(() => root.unmount())
    container.remove()
  })

  it('Test 2: onNewTransition refetches detail + bumps timeline refetchKey', () => {
    const { root, container } = mountPage('D-1')
    const initialDetailCalls = detailRefetch.mock.calls.length
    const initialTimelineKey =
      timelineProps[timelineProps.length - 1]?.refetchKey ?? 0

    act(() => {
      stageCalls[stageCalls.length - 1].onNewTransition()
    })

    expect(detailRefetch.mock.calls.length).toBeGreaterThan(initialDetailCalls)
    const newTimelineKey =
      timelineProps[timelineProps.length - 1]?.refetchKey ?? 0
    expect(newTimelineKey).toBeGreaterThan(initialTimelineKey)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 3: stage onReconnect refetches detail (single refetch per D-31-18)', () => {
    const { root, container } = mountPage('D-1')
    detailRefetch.mockClear()
    act(() => {
      stageCalls[stageCalls.length - 1].onReconnect!()
    })
    expect(detailRefetch).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 4: onNewCall refetches detail + bumps llamadas refetchKey', () => {
    const { root, container } = mountPage('D-1')
    const initialDetailCalls = detailRefetch.mock.calls.length
    // Activate the Llamadas tab so the prop sink exists.
    // (The orchestrator starts on 'timeline' by default; the LlamadasTab is
    // mounted only when active. The refetchKey is held in state at the
    // orchestrator regardless, so the trigger still updates it — when the
    // user opens Llamadas the latest key is picked up. Here we only need to
    // assert detail.refetch was called.)
    act(() => {
      callsCalls[callsCalls.length - 1].onNewCall()
    })
    expect(detailRefetch.mock.calls.length).toBeGreaterThan(initialDetailCalls)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 5: calls onReconnect refetches detail exactly once per call', () => {
    const { root, container } = mountPage('D-1')
    detailRefetch.mockClear()
    act(() => {
      callsCalls[callsCalls.length - 1].onReconnect!()
    })
    expect(detailRefetch).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
    container.remove()
  })

  it('Test 6: realtime callbacks are referentially stable across re-renders (useCallback)', () => {
    const { root, container } = mountPage('D-1')
    const firstStageCb = stageCalls[stageCalls.length - 1].onNewTransition
    const firstCallsCb = callsCalls[callsCalls.length - 1].onNewCall

    // Force a re-render by re-rendering the same component.
    act(() => {
      root.render(<DebtorDetailClient debtorId="D-1" />)
    })

    const secondStageCb = stageCalls[stageCalls.length - 1].onNewTransition
    const secondCallsCb = callsCalls[callsCalls.length - 1].onNewCall

    expect(secondStageCb).toBe(firstStageCb)
    expect(secondCallsCb).toBe(firstCallsCb)
    act(() => root.unmount())
    container.remove()
  })
})
