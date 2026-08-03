import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useCadence, type CadenceConfig } from './use-cadence'

void React

// ── Auth mock ────────────────────────────────────────────────────────────────

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

type HookResult = ReturnType<typeof useCadence>

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make404Response(): Response {
  return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
}

function make500Response(): Response {
  return new Response(null, { status: 500 })
}

const EMPTY_STAGES = { S0: [], S1: [], S2: [], S3: [], S4: [], S5: [], SX: [] }

const DEFAULT_CADENCE_GET = {
  cadenceConfig: null,
  source: 'default',
  effectiveConfig: EMPTY_STAGES,
  generatedAt: '2026-01-01T00:00:00.000Z',
}

const OVERRIDE_CADENCE: CadenceConfig = {
  ...EMPTY_STAGES,
  S1: [{ dayOffset: -7, channel: 'whatsapp', reason: 'pre_due_t_minus_7' }],
}

// ── Test Harness ──────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = useCadence()
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  result = undefined
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', AGENT_URL)
  mockAgency.id = 'AGY-TEST'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  root?.unmount()
  container.remove()
})

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(TestWrapper))
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCadence', () => {
  it('fetches cadence and always exposes a non-null effectiveConfig', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(DEFAULT_CADENCE_GET))

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.notProvisioned).toBe(false)
    expect(result?.source).toBe('default')
    expect(result?.cadenceConfig).toBeNull()
    expect(result?.effectiveConfig).toEqual(EMPTY_STAGES)
  })

  it('sets error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeTruthy()
    expect(result?.effectiveConfig).toBeNull()
  })

  it('sets notProvisioned on 404 (onboarding incompleto)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make404Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.notProvisioned).toBe(true)
    expect(result?.error).toBeNull()
  })

  it('saveCadence PUTs /cobranza/cadence with { cadenceConfig } and refetches effectiveConfig', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeOkResponse(DEFAULT_CADENCE_GET)) // initial GET
      .mockResolvedValueOnce(
        makeOkResponse({ cadenceConfig: OVERRIDE_CADENCE, source: 'agency', updatedAt: '2026-02-01T00:00:00.000Z' }),
      ) // PUT
      .mockResolvedValueOnce(
        makeOkResponse({
          cadenceConfig: OVERRIDE_CADENCE,
          source: 'agency',
          effectiveConfig: OVERRIDE_CADENCE,
          generatedAt: '2026-02-01T00:00:00.000Z',
        }),
      ) // refetch GET

    await mount()
    expect(result?.source).toBe('default')

    await act(async () => {
      await result?.saveCadence(OVERRIDE_CADENCE)
    })

    const putCall = fetchSpy.mock.calls[1]
    expect(String(putCall[0])).toBe(`${AGENT_URL}/api/agency/AGY-TEST/cobranza/cadence`)
    const init = putCall[1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ cadenceConfig: OVERRIDE_CADENCE })

    expect(result?.source).toBe('agency')
    expect(result?.effectiveConfig).toEqual(OVERRIDE_CADENCE)
  })
})
