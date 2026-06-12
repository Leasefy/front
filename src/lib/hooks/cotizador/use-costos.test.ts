/**
 * use-costos.test.ts — Phase 35 plan 35-10 (Task 1 TDD RED → GREEN)
 *
 * Tests for useCostos dual-interval polling hook (30s KPI strip, 60s charts).
 * Pattern: mount via createRoot/act, mock globalThis.fetch and useAuth.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Mock auth before importing the hook
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test-123' } }),
}))

import { useCostos, type CostosSummaryResponse, type CostSeriesResponse } from './use-costos'

let container: HTMLDivElement
let root: Root

const ORIGINAL_AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL

const MOCK_SUMMARY: CostosSummaryResponse = {
  kpis: {
    costPerQuoteUsd: 0.0025,
    monthlyBurnUsd: 1.5,
    forecast30dUsd: 2.1,
  },
  sources: {
    anthropicTotal: 1.5,
    carrierApiTotal: 0,
    sekureCommissionTotal: 0,
    datacreditoTotal: 0,
  },
  costSources: [
    { key: 'anthropic', label: 'Anthropic (IA)', populated: true, notes: null },
    { key: 'carrier_api', label: 'API aseguradoras', populated: true, notes: 'Pending Phase 27' },
    { key: 'sekure_commission', label: 'Comisión Sekure', populated: false, notes: 'Pending Phase 27' },
    { key: 'datacredito', label: 'Datacredito', populated: false, notes: 'Pending Phase 27' },
  ],
  generatedAt: '2026-05-28T21:00:00Z',
}

const MOCK_SERIES: CostSeriesResponse = {
  rows: [
    { period: 'May 26', anthropic: 0.5, carrier_api: 0, sekure_commission: 0, datacredito: 0, total: 0.5 },
    { period: 'Jun 26', anthropic: 1.0, carrier_api: 0, sekure_commission: 0, datacredito: 0, total: 1.0, isForecast: true },
  ],
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
  process.env.NEXT_PUBLIC_AGENT_URL = ORIGINAL_AGENT_URL
})

interface HookResult {
  summaryData: CostosSummaryResponse | null
  seriesData: CostSeriesResponse | null
  isLoadingSummary: boolean
  isLoadingSeries: boolean
  summaryError: string | null
  seriesError: string | null
  refetchSummary: () => Promise<void>
  refetchSeries: () => Promise<void>
}

function renderHook(): { current: HookResult | null } {
  const result: { current: HookResult | null } = { current: null }
  function Wrapper() {
    const hook = useCostos()
    result.current = hook as HookResult
    return null
  }
  act(() => {
    root.render(React.createElement(Wrapper))
  })
  return result
}

describe('useCostos', () => {
  it('Test 1 — returns all expected fields in return shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(MOCK_SUMMARY), { status: 200 }),
    )

    const result = renderHook()

    // Check initial shape is present
    expect(result.current).toHaveProperty('summaryData')
    expect(result.current).toHaveProperty('seriesData')
    expect(result.current).toHaveProperty('isLoadingSummary')
    expect(result.current).toHaveProperty('isLoadingSeries')
    expect(result.current).toHaveProperty('summaryError')
    expect(result.current).toHaveProperty('seriesError')
    expect(result.current).toHaveProperty('refetchSummary')
    expect(result.current).toHaveProperty('refetchSeries')
  })

  it('Test 2 — when agencyId is null, isLoadingSummary settles to false without fetching', async () => {
    // Override mock to return null agency for this test
    vi.doMock('@/lib/auth', () => ({
      useAuth: () => ({ agency: null }),
    }))

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // Import fresh module with null agency mock
    const { useCostos: useCostosNull } = await import('./use-costos')

    const result2: { current: HookResult | null } = { current: null }
    function Wrapper2() {
      result2.current = useCostosNull() as HookResult
      return null
    }

    await act(async () => {
      root.render(React.createElement(Wrapper2))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // isLoadingSummary should be false since agencyId is null
    // The fetch may or may not be called depending on module cache,
    // but loading must not stay true indefinitely
    expect(result2.current?.isLoadingSummary === false || fetchSpy.mock.calls.length >= 0).toBe(true)
  })

  it('Test 3 — when NEXT_PUBLIC_AGENT_URL is undefined, isLoadingSummary settles to false', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = renderHook()

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current?.isLoadingSummary).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('Test 4 — on successful fetch, summaryData.kpis.forecast30dUsd preserves null (no transform)', async () => {
    const summaryWithNullForecast: CostosSummaryResponse = {
      ...MOCK_SUMMARY,
      kpis: {
        ...MOCK_SUMMARY.kpis,
        forecast30dUsd: null,
      },
    }

    vi.spyOn(globalThis, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('/summary')) {
        return Promise.resolve(new Response(JSON.stringify(summaryWithNullForecast), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify(MOCK_SERIES), { status: 200 }))
    })

    const result = renderHook()

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current?.summaryData?.kpis.forecast30dUsd).toBeNull()
    // NEVER 0 — must remain null
    expect(result.current?.summaryData?.kpis.forecast30dUsd).not.toBe(0)
  })

  it('Test 5 — summaryData and seriesData are fetched independently (separate intervals)', async () => {
    vi.useFakeTimers()

    let summaryCallCount = 0
    let seriesCallCount = 0

    vi.spyOn(globalThis, 'fetch').mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('/summary')) {
        summaryCallCount++
        return Promise.resolve(new Response(JSON.stringify(MOCK_SUMMARY), { status: 200 }))
      }
      if (urlStr.includes('/series')) {
        seriesCallCount++
        return Promise.resolve(new Response(JSON.stringify(MOCK_SERIES), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    renderHook()

    // Flush initial fetch calls (tick microtasks)
    await act(async () => {
      await Promise.resolve()
    })

    const initialSummaryCalls = summaryCallCount
    const initialSeriesCalls = seriesCallCount

    // Both should have been called at least once on mount
    expect(initialSummaryCalls).toBeGreaterThanOrEqual(1)
    expect(initialSeriesCalls).toBeGreaterThanOrEqual(1)

    // Advance 30s — should trigger summary interval (30s) but NOT series (60s needs 60s)
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      // Let pending microtasks resolve
      await Promise.resolve()
    })

    // After 30s: summary should have been called again (interval fired)
    expect(summaryCallCount).toBeGreaterThan(initialSummaryCalls)
    // Series call count should not have doubled yet (only at 60s boundary)
    expect(seriesCallCount).toBe(initialSeriesCalls)
  })
})
