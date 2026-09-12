import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { usePilotoAutonomia } from './use-piloto-autonomia'

void React

/**
 * T-0082 WU-3b: `usePilotoAutonomia` disparaba 12 GETs por agente con
 * `Promise.allSettled(...)` (T-0076 lo acotó a 4 en vuelo, nunca lo eliminó).
 * El contrato (`contract.md` §3.1/§3.2 Surface B) agrega
 * `GET /api/agency/{agencyId}/ai-hub/agentes/autonomia` — la MISMA lectura
 * batcheada que ya usa la píldora de la flota — y este hook pasa a hacer UNA
 * sola llamada, indexando el array de respuesta por `agente`. Reemplaza
 * enteramente el test T-0076 (fan-out acotado), que testeaba un
 * comportamiento que este cambio elimina.
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
const ROSTER_PATH = '/api/agency/AGY-TEST/ai-hub/agentes/autonomia'

type HookResult = ReturnType<typeof usePilotoAutonomia>

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make500Response(): Response {
  return new Response(null, { status: 500 })
}

/** Roster fixture — los 12 agentes de PILOTO_AGENTES, en orden arbitrario. */
function rosterFixture(overrides: { omit?: string[] } = {}) {
  const TODOS = [
    'cobranza',
    'retencion',
    'prospectos',
    'pagos',
    'calidad',
    'aprobaciones',
    'mantenimiento',
    'cotizador',
    'conciliacion',
    'estudio',
    'matching',
    'avaluos',
  ]
  const omitidos = new Set(overrides.omit ?? [])
  return {
    agentes: TODOS.filter((a) => !omitidos.has(a)).map((agente) => ({
      agente,
      modo: 'copiloto' as const,
      modosDisponibles: ['sombra', 'copiloto', 'autonomo'] as const,
      valla: [{ id: 'v1', label: 'Valla', value: 'x', estado: 'activo' }],
      t323: agente === 'cobranza',
      origen: 'default' as const,
      efectoReal: `efecto de ${agente}`,
    })),
  }
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

describe('usePilotoAutonomia — roster batcheado (T-0082 WU-3b)', () => {
  it('(a) hace exactamente UN GET al roster y expone los mismos datos por agente que el fan-out de 12', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      expect(url).toContain(ROSTER_PATH)
      return makeOkResponse(rosterFixture())
    })

    await mount()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.totalRoster).toBe(12)
    expect(result?.rows).toHaveLength(12)

    const cobranza = result?.rows.find((r) => r.agente === 'cobranza')
    expect(cobranza?.modo).toBe('copiloto')
    expect(cobranza?.modosDisponibles).toEqual(['sombra', 'copiloto', 'autonomo'])
    expect(cobranza?.valla).toEqual([{ id: 'v1', label: 'Valla', value: 'x', estado: 'activo' }])
    expect(cobranza?.t323).toBe(true)
    expect(cobranza?.efectoReal).toBe('efecto de cobranza')
  })

  it('(b) un agente ausente del array se omite sin marcar error (mismo fail-soft que el 404 por agente de antes)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      makeOkResponse(rosterFixture({ omit: ['matching'] })),
    )

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.error).toBeNull()
    expect(result?.rows).toHaveLength(11)
    expect(result?.rows.find((r) => r.agente === 'matching')).toBeUndefined()
    expect(result?.totalRoster).toBe(12) // el roster DECLARADO no cambia, solo quién contestó
  })

  it('la llamada entera falla (503/500) ⇒ cero filas y error visible (contract.md §3.3: no hay degradación parcial)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())

    await mount()

    expect(result?.isLoading).toBe(false)
    expect(result?.rows).toHaveLength(0)
    expect(result?.error).toBeTruthy()
  })

  it('sin agencyId no dispara ningún fetch', async () => {
    mockAgency.id = null
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await mount()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result?.isLoading).toBe(false)
    expect(result?.rows).toHaveLength(0)
  })
})
