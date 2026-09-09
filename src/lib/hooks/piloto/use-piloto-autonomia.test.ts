import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { usePilotoAutonomia } from './use-piloto-autonomia'

void React

/**
 * T-0076: `usePilotoAutonomia` disparaba los 12 agentes del roster con
 * `Promise.allSettled(...)` — 12 peticiones simultáneas al agente en el
 * montaje de `/panel/inmobiliaria/piloto`, el mayor contribuyente al burst
 * que tumbaba la pantalla contra `agents_limit` (5 r/s, burst 10; ledger
 * §2.2). Esta prueba fija dos cosas: que nunca hay más de un puñado de
 * peticiones en vuelo a la vez, y que el resultado —filas, error,
 * fail-soft por agente— es EXACTAMENTE el mismo que con `allSettled`.
 */

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

type HookResult = ReturnType<typeof usePilotoAutonomia>

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

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = usePilotoAutonomia()
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

describe('usePilotoAutonomia — fan-out acotado (T-0076)', () => {
  it('nunca tiene más de 4 peticiones en vuelo a la vez para los 12 agentes del roster', async () => {
    let enVuelo = 0
    let picoDeVuelo = 0

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      enVuelo += 1
      picoDeVuelo = Math.max(picoDeVuelo, enVuelo)
      await new Promise((r) => setTimeout(r, 5))
      enVuelo -= 1
      return makeOkResponse({
        modo: 'copiloto',
        modosDisponibles: ['sombra', 'copiloto', 'autonomo'],
      })
    })

    await mount()

    // 12 agentes en el roster (PILOTO_AGENTES) — el pico nunca los alcanza.
    expect(picoDeVuelo).toBeGreaterThan(0)
    expect(picoDeVuelo).toBeLessThanOrEqual(4)
  })

  it('sigue trayendo una fila por agente que respondió 200, en el mismo orden que antes', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/agentes/cobranza/autonomia')) {
        return makeOkResponse({ modo: 'autonomo', modosDisponibles: ['sombra', 'autonomo'] })
      }
      return make404Response()
    })

    await mount()

    expect(result?.isLoading).toBe(false)
    const fila = result?.rows.find((r) => r.agente === 'cobranza')
    expect(fila?.modo).toBe('autonomo')
    // El resto del roster no reportó (404) — fail-soft por agente, no tumba
    // la fila de cobranza.
    expect(result?.rows).toHaveLength(1)
    expect(result?.totalRoster).toBe(12)
  })

  it('si NINGÚN agente contesta bien, error queda seteado (fail-soft agotado)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.rows).toHaveLength(0)
    expect(result?.error).toBeTruthy()
  })
})
