/**
 * use-carrier-detail.test.ts — Phase 35 plan 35-08 (Task 1 TDD RED → GREEN)
 *
 * Tests for useCarrierDetail 60s polling hook.
 * Pattern: mount via createRoot/act, mock globalThis.fetch and useAuth.
 * Modeled after use-ask-why-usage.test.tsx (Phase 33).
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

import { useCarrierDetail, type CarrierDetailPayload } from './use-carrier-detail'

let container: HTMLDivElement
let root: Root

const ORIGINAL_AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL

const MOCK_PAYLOAD: CarrierDetailPayload = {
  kpis: {
    latencyP95Ms: 420,
    errorRate24h: 0.02,
    approvalRate30d: 0.75,
    costPerQuoteUsd30d: 0.015,
  },
  latencySparkline: [
    { hour: '2026-05-01T00:00:00Z', p95LatencyMs: 380 },
    { hour: '2026-05-01T01:00:00Z', p95LatencyMs: 420 },
  ],
  errorRateSeries: [
    { date: '2026-05-01', errorRate: 0.01 },
    { date: '2026-05-02', errorRate: 0.02 },
  ],
  approvalByCanon: [
    { canonRange: '[0-1M]', approvalRate: 0.8 },
    { canonRange: '[1M-3M]', approvalRate: 0.72 },
    { canonRange: '[3M-5M]', approvalRate: 0.65 },
    { canonRange: '[5M+]', approvalRate: 0.5 },
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
  data: CarrierDetailPayload | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function renderHook(carrier: string): { current: HookResult | null } {
  const result: { current: HookResult | null } = { current: null }
  function Wrapper() {
    const hook = useCarrierDetail(carrier)
    result.current = hook as HookResult
    return null
  }
  act(() => {
    root.render(React.createElement(Wrapper))
  })
  return result
}

describe('useCarrierDetail', () => {
  it('Test 1 — resolves data on 200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(MOCK_PAYLOAD), { status: 200 }),
    )

    const result = renderHook('sura')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current?.data).toEqual(MOCK_PAYLOAD)
    expect(result.current?.isLoading).toBe(false)
    expect(result.current?.error).toBeNull()
  })

  it('Test 2 — sets error state on 4xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Forbidden', { status: 403 }),
    )

    const result = renderHook('sura')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current?.data).toBeNull()
    expect(result.current?.error).toBe('403')
    expect(result.current?.isLoading).toBe(false)
  })

  it('Test 3 — calls correct URL for specified carrier with credentials:include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(MOCK_PAYLOAD), { status: 200 }),
    )

    renderHook('mapfre')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/cotizador/aseguradoras/mapfre'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('Test 4 — refetch triggers a new fetch call', async () => {
    const body1 = { ...MOCK_PAYLOAD }
    const body2 = { ...MOCK_PAYLOAD, kpis: { ...MOCK_PAYLOAD.kpis, latencyP95Ms: 500 } }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(body1), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(body2), { status: 200 }))

    const result = renderHook('bolivar')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current?.data?.kpis.latencyP95Ms).toBe(420)

    await act(async () => {
      await result.current?.refetch()
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result.current?.data?.kpis.latencyP95Ms).toBe(500)
  })
})
