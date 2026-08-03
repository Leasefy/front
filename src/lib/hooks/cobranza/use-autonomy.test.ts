import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useAutonomy } from './use-autonomy'

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

type HookResult = ReturnType<typeof useAutonomy>

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

const AUTONOMY_OK = {
  agencyId: 'AGY-TEST',
  autonomyLevel: 'automatico_completo',
  requiresHumanApproval: false,
  isDefault: true,
}

// ── Test Harness ──────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = useAutonomy()
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

describe('useAutonomy', () => {
  it('fetches the autonomy level', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(AUTONOMY_OK))

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.notProvisioned).toBe(false)
    expect(result?.data?.autonomyLevel).toBe('automatico_completo')
    expect(result?.data?.isDefault).toBe(true)
  })

  it('sets error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeTruthy()
    expect(result?.data).toBeNull()
  })

  it('sets notProvisioned on 404 (onboarding incompleto)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make404Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.notProvisioned).toBe(true)
    expect(result?.data).toBeNull()
    expect(result?.error).toBeNull()
  })

  it('saveAutonomy PUTs /cobranza/autonomy with { autonomyLevel } and updates data', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeOkResponse(AUTONOMY_OK))
      .mockResolvedValueOnce(
        makeOkResponse({
          agencyId: 'AGY-TEST',
          autonomyLevel: 'aprobar',
          requiresHumanApproval: true,
          isDefault: false,
        }),
      )

    await mount()
    expect(result?.data?.autonomyLevel).toBe('automatico_completo')

    await act(async () => {
      await result?.saveAutonomy('aprobar')
    })

    const putCall = fetchSpy.mock.calls[1]
    expect(String(putCall[0])).toBe(`${AGENT_URL}/api/agency/AGY-TEST/cobranza/autonomy`)
    const init = putCall[1] as RequestInit
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ autonomyLevel: 'aprobar' })
    expect(result?.data?.autonomyLevel).toBe('aprobar')
    expect(result?.data?.requiresHumanApproval).toBe(true)
  })
})
