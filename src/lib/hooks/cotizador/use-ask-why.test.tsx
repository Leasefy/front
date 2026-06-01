/**
 * useAskWhy hook tests — Phase 33 plan 33-04 (TDD RED → GREEN)
 *
 * Covers happy path + 5 error types (429/404/timeout/5xx/400) + isLoading state.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test' } }),
}))

import { useAskWhy, type AskWhyError, type AskWhyResult } from './use-ask-why'

void React

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
  process.env.NEXT_PUBLIC_AGENT_URL = ORIGINAL_AGENT_URL
})

interface HookResult {
  mutate: ReturnType<typeof useAskWhy>['mutate']
  isLoading: boolean
  error: AskWhyError | null
  reset: () => void
}

function renderHook(agencyId: string | null): { current: HookResult | null } {
  const result: { current: HookResult | null } = { current: null }
  function Wrapper() {
    const hook = useAskWhy(agencyId)
    result.current = hook
    return null
  }
  act(() => {
    root.render(<Wrapper />)
  })
  return result
}

describe('useAskWhy', () => {
  it('Test 1 — mutate POSTs correct JSON body to ask-why endpoint', async () => {
    const successBody: AskWhyResult = {
      narrative_es: 'Si el canon fuera mayor…',
      cost_usd: 0.00087,
      hypothetical_carriers: [],
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(successBody), { status: 200 }),
    )

    const result = renderHook('agency-test')

    await act(async () => {
      await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1500000 })
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://agent.test/api/agency/agency-test/cotizador/ask-why',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ quote_id: 'q1', variable: 'canon', new_value: 1500000 }),
      }),
    )
    const calledHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers
    expect(calledHeaders.get('Content-Type')).toBe('application/json')
    expect(calledHeaders.get('Authorization')).toMatch(/^Bearer /)
  })

  it('Test 2 — on 429 error code=429 with cap/used/resets_at populated', async () => {
    const body = { error: 'daily_ask_why_cap_exceeded', cap: 50, used: 50, resets_at: '2026-05-29T05:00:00Z' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 429 }),
    )

    const result = renderHook('agency-test')

    await act(async () => {
      try {
        await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1 })
      } catch {
        /* swallow */
      }
    })

    const err = result.current!.error
    expect(err?.code).toBe(429)
    if (err?.code === 429) {
      expect(err.cap).toBe(50)
      expect(err.used).toBe(50)
      expect(err.resets_at).toBe('2026-05-29T05:00:00Z')
    }
  })

  it('Test 3 — on 404 error code=404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'quote_not_found' }), { status: 404 }),
    )
    const result = renderHook('agency-test')
    await act(async () => {
      try {
        await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1 })
      } catch { /* */ }
    })
    expect(result.current!.error?.code).toBe(404)
  })

  it('Test 4 — on timeout (AbortError), error code=timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })

    const result = renderHook('agency-test')
    await act(async () => {
      try {
        await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1 })
      } catch { /* */ }
    })
    expect(result.current!.error?.code).toBe('timeout')
  })

  it('Test 5 — on network failure (non-abort throw), error code=network', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('failed to fetch'))
    const result = renderHook('agency-test')
    await act(async () => {
      try {
        await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1 })
      } catch { /* */ }
    })
    expect(result.current!.error?.code).toBe('network')
  })

  it('Test 6 — on 400 error code=400 with message from body.error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_variable' }), { status: 400 }),
    )
    const result = renderHook('agency-test')
    await act(async () => {
      try {
        await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: -1 })
      } catch { /* */ }
    })
    const err = result.current!.error
    expect(err?.code).toBe(400)
    if (err?.code === 400) {
      expect(err.message).toBe('invalid_variable')
    }
  })

  it('Test 7 — on 5xx error code=500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 503 }),
    )
    const result = renderHook('agency-test')
    await act(async () => {
      try {
        await result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1 })
      } catch { /* */ }
    })
    expect(result.current!.error?.code).toBe(500)
  })

  it('Test 8 — isLoading flips true→false around mutate', async () => {
    let resolveFetch: (v: Response) => void = () => {}
    const pending = new Promise<Response>(r => { resolveFetch = r })
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pending)

    const result = renderHook('agency-test')

    let mutatePromise: Promise<AskWhyResult> | undefined
    act(() => {
      mutatePromise = result.current!.mutate({ quote_id: 'q1', variable: 'canon', new_value: 1 })
    })

    // After scheduling mutate, before resolving — isLoading should be true
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(result.current!.isLoading).toBe(true)

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ narrative_es: 'ok', cost_usd: 0.001, hypothetical_carriers: [] }), { status: 200 }))
      await mutatePromise!.catch(() => {})
    })

    expect(result.current!.isLoading).toBe(false)
    expect(result.current!.error).toBeNull()
  })
})
