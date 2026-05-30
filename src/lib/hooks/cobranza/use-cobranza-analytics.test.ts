import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useCobranzaAnalytics } from './use-cobranza-analytics'

void React

// ── Auth mock ────────────────────────────────────────────────────────────────

// Default: agency is present (overridden per-test as needed)
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

type HookResult = ReturnType<typeof useCobranzaAnalytics>

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make500Response(): Response {
  return new Response(null, { status: 500 })
}

// Minimal valid backend responses for each endpoint
const AGENCY_GATE_OK = { populated: true, calls_30d: 20 }
const RECOVERY_OK = { populated: false, rows: [] }
const OBJECTIONS_OK = { populated: false, objections: [] }
const CADENCE_OK = { populated: false, channelMix: { populated: false, rows: [] }, heatmap: { populated: false, cells: [] } }
const COST_OK = { populated: false, cost_per_peso: null, sparkline_90d: [] }
const SCRIPTS_OK = { populated: false, reason: 'schema_pending', rows: [], pendingPhase: 38 }

// ── Test Harness ──────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = useCobranzaAnalytics()
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  result = undefined
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', AGENT_URL)
  // reset agency to present
  mockAgency.id = 'AGY-TEST'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  root?.unmount()
  container.remove()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCobranzaAnalytics', () => {
  it('Test 1 (race-fix): when agencyId is null, isLoading becomes false', async () => {
    // Arrange: no agency
    mockAgency.id = null

    await act(async () => {
      root = createRoot(container)
      root.render(React.createElement(TestWrapper))
    })

    // isLoading must have settled to false even without a fetch
    expect(result?.isLoading).toBe(false)
    // no error set (just no agency — not an error condition)
    expect(result?.data).toBeNull()
  })

  it('Test 2 (race-fix branch 1): when NEXT_PUBLIC_AGENT_URL is not set, isLoading becomes false and error is set', async () => {
    // Arrange: remove the agent URL
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '')

    await act(async () => {
      root = createRoot(container)
      root.render(React.createElement(TestWrapper))
    })

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeTruthy()
    expect(result?.data).toBeNull()
  })

  it('Test 3: on successful parallel fetch, data contains all 6 keys', async () => {
    // Arrange: mock fetch to return success for all 6 endpoints
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url)
      if (urlStr.includes('/agency-gate'))    return makeOkResponse(AGENCY_GATE_OK)
      if (urlStr.includes('/recovery-rate'))  return makeOkResponse(RECOVERY_OK)
      if (urlStr.includes('/top-objections')) return makeOkResponse(OBJECTIONS_OK)
      if (urlStr.includes('/cadence'))        return makeOkResponse(CADENCE_OK)
      if (urlStr.includes('/cost-per-peso'))  return makeOkResponse(COST_OK)
      if (urlStr.includes('/top-scripts'))    return makeOkResponse(SCRIPTS_OK)
      return make500Response()
    })

    await act(async () => {
      root = createRoot(container)
      root.render(React.createElement(TestWrapper))
    })

    expect(fetchSpy).toHaveBeenCalled()
    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.data).not.toBeNull()

    // All 6 top-level keys present
    const data = result?.data
    expect(data).toHaveProperty('agencyGate')
    expect(data).toHaveProperty('recovery')
    expect(data).toHaveProperty('objections')
    expect(data).toHaveProperty('cadence')
    expect(data).toHaveProperty('costPerPeso')
    expect(data).toHaveProperty('topScripts')
  })

  it('Test 4: on total failure (all 500), error is set and data remains null', async () => {
    // Arrange: every fetch returns 500
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => make500Response())

    await act(async () => {
      root = createRoot(container)
      root.render(React.createElement(TestWrapper))
    })

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeTruthy()
    expect(result?.data).toBeNull()
  })
})
