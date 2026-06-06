/**
 * use-ai-hub-landing.test.ts — Phase 37 plan 37-11 (Task 2 TDD RED → GREEN)
 *
 * Tests for useAiHubLanding hook: 30s polling + isLoading race-fix (memory phase_36_patch_13).
 *
 * Coverage matrix (37-11-PLAN.md §Task 2 <behavior>):
 *   (1) 30s polling: after initial fetch, setInterval called with 30_000ms; advancing timers fires second fetch
 *   (2) isLoading race-fix: when agency is null, isLoading=false after first render (not stuck true)
 *   (3) getActiveAgents includes cobranza + cotizador entries (from ai-agents.ts)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Controllable auth mock — set per test
let _mockAgency: { id: string } | null = { id: 'agency-test-hub' }

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: _mockAgency }),
}))

import { useAiHubLanding, type AiHubLandingResponse } from './use-ai-hub-landing'
import { getActiveAgents } from '@/lib/types/ai-agents'

let container: HTMLDivElement
let root: Root

const MOCK_LANDING: AiHubLandingResponse = {
  cobranza: {
    permitted: true,
    heroKpi: { label: 'recovery_rate_30d_pct', value: '12.4%', populated: true },
    secondaryKpi: { label: 'open_escalations', value: 2 },
    lastActivityAt: '2026-05-29T10:00:00Z',
  },
  cotizador: {
    permitted: true,
    heroKpi: { label: 'approval_rate_30d_pct', value: '78.0%', populated: true },
    secondaryKpi: { label: 'quotes_today', value: 5 },
    lastActivityAt: '2026-05-29T09:00:00Z',
  },
  generatedAt: '2026-05-29T11:00:00Z',
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
  _mockAgency = { id: 'agency-test-hub' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ── Test (1): 30s polling ─────────────────────────────────────────────────

describe('useAiHubLanding — polling', () => {
  it('polls at 30s interval: fetch called again after 30_000ms', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_LANDING,
    })
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    let hookResult: ReturnType<typeof useAiHubLanding> | null = null

    function TestComponent() {
      hookResult = useAiHubLanding()
      return null
    }

    await act(async () => {
      root.render(React.createElement(TestComponent))
    })

    // Initial fetch should have been called once
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/ai-hub/landing')

    // Advance 30 seconds — should trigger second fetch
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      // Give promises time to resolve
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(hookResult).not.toBeNull()
    expect(hookResult!.data).toMatchObject({ cobranza: { permitted: true } })
  })
})

// ── Test (2): isLoading race-fix — no agency ──────────────────────────────

describe('useAiHubLanding — isLoading race-fix (memory phase_36_patch_13)', () => {
  it('sets isLoading=false when agency is null (not stuck at true)', async () => {
    // Override agency mock to null for this test
    _mockAgency = null

    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof globalThis.fetch

    let hookResult: ReturnType<typeof useAiHubLanding> | null = null

    function TestComponent() {
      hookResult = useAiHubLanding()
      return null
    }

    await act(async () => {
      root.render(React.createElement(TestComponent))
    })

    // fetch should NOT have been called
    expect(fetchMock).not.toHaveBeenCalled()
    // isLoading MUST be false — not stuck at true (memory phase_36_patch_13)
    expect(hookResult).not.toBeNull()
    expect(hookResult!.isLoading).toBe(false)
    expect(hookResult!.data).toBeNull()
  })
})

// ── Test (3): getActiveAgents includes cobranza + cotizador ───────────────

describe('ai-agents.ts — getActiveAgents includes cobranza + cotizador', () => {
  it('returns array containing id=cobranza and id=cotizador entries', () => {
    const agents = getActiveAgents()
    const ids = agents.map((a) => a.id)
    expect(ids).toContain('cobranza')
    expect(ids).toContain('cotizador')
    expect(ids).toContain('tenant-scoring')
    expect(ids).toContain('smart-matching')
    // All 4 active agents present
    expect(agents.filter((a) => a.status === 'active').length).toBeGreaterThanOrEqual(4)
  })
})
