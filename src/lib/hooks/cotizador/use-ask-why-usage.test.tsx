/**
 * useAskWhyUsage hook tests — Phase 33 plan 33-04 (TDD RED → GREEN)
 *
 * Pattern: mount the hook inside a tiny test component via createRoot/act,
 * mock globalThis.fetch and useAuth.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// Mock auth before importing the hook
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test' } }),
}))

import { useAskWhyUsage } from './use-ask-why-usage'

void React // jsx-preserve

let container: HTMLDivElement
let root: Root

const ORIGINAL_AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL

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
  data: ReturnType<typeof useAskWhyUsage>['data']
  isLoading: boolean
  mutate: ReturnType<typeof useAskWhyUsage>['mutate']
}

function renderHook(agencyId: string | null): { current: HookResult | null } {
  const result: { current: HookResult | null } = { current: null }
  function Wrapper() {
    const hook = useAskWhyUsage(agencyId)
    result.current = hook
    return null
  }
  act(() => {
    root.render(<Wrapper />)
  })
  return result
}

describe('useAskWhyUsage', () => {
  it('Test 1 — returns {used_today, daily_cap, resets_at} when fetch succeeds 200', async () => {
    const body = { used_today: 0, daily_cap: 50, resets_at: '2026-05-28T05:00:00Z' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    )

    const result = renderHook('agency-test')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current?.data).toEqual(body)
    expect(result.current?.isLoading).toBe(false)
  })

  it('Test 2 — returns {data: null, isLoading: false} when agencyId is null (no fetch)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    )

    const result = renderHook(null)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current?.data).toBeNull()
    expect(result.current?.isLoading).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Test 3 — re-fetches after mutate() is called', async () => {
    const body1 = { used_today: 0, daily_cap: 50, resets_at: '2026-05-28T05:00:00Z' }
    const body2 = { used_today: 1, daily_cap: 50, resets_at: '2026-05-28T05:00:00Z' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(body1), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(body2), { status: 200 }))

    const result = renderHook('agency-test')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(result.current?.data?.used_today).toBe(0)

    await act(async () => {
      result.current?.mutate()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result.current?.data?.used_today).toBe(1)
  })

  it('Test 4 — calls GET ask-why/usage with credentials:include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ used_today: 0, daily_cap: 50, resets_at: 'x' }), { status: 200 }),
    )

    renderHook('agency-test')

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://agent.test/api/agency/agency-test/cotizador/ask-why/usage',
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
