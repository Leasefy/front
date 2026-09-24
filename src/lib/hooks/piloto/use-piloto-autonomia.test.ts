import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { usePilotoAutonomia } from './use-piloto-autonomia'

void React

/**
 * T-0076 decía «nunca más de 4 peticiones de autonomía en vuelo». Desde la
 * auditoría del Piloto (23-09-2026) es una sola: la de la flota, que trae
 * los doce agentes (y el chat) con todo lo que el panel necesita.
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

const flota = {
  activo: true,
  modo: 'copiloto',
  distintos: [],
  actuan: 2,
  resumen: { sombra: 0, copiloto: 2, autonomo: 0 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-09-23T10:00:00.000-05:00',
  agentes: [
    {
      agente: 'cobranza',
      modo: 'copiloto',
      origen: 'piloto',
      corre: true,
      porQueNoCorre: null,
      gobierna: true,
      actua: true,
      efectoReal: 'Laura prepara cada llamada…',
      valla: [{ id: 'ley2300', label: 'Ley 2300', value: 'x', estado: 'regla' }],
      t323: true,
    },
    {
      agente: 'chat',
      modo: 'copiloto',
      origen: 'default',
      corre: true,
      porQueNoCorre: null,
      gobierna: false,
      actua: false,
      efectoReal: 'El chat todavía no lee esta perilla…',
      valla: [],
      t323: false,
    },
    {
      agente: 'pagos',
      modo: 'copiloto',
      origen: 'default',
      corre: false,
      porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.',
      gobierna: true,
      actua: false,
      efectoReal: 'Payu prepara el cobro…',
      valla: [],
      t323: true,
    },
  ],
}

describe('🔴 usePilotoAutonomia — UNA petición para toda la flota (auditoría del Piloto, 23-09)', () => {
  it('lee la flota con un solo GET (antes eran 12 GET por agente)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeOkResponse(flota))
    await mount()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0]![0])).toContain('/ai-hub/autonomia')
    expect(String(fetchSpy.mock.calls[0]![0])).not.toContain('/agentes/')
  })

  it('trae la frase de la tabla de verdad, si corre y si el modo lo gobierna — y el chat', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeOkResponse(flota))
    await mount()
    expect(result?.isLoading).toBe(false)
    expect(result?.rows.map((r) => r.agente)).toEqual(['cobranza', 'chat', 'pagos'])
    const chat = result?.rows.find((r) => r.agente === 'chat')
    expect(chat).toMatchObject({ gobierna: false, corre: true })
    expect(chat?.efectoReal).toContain('todavía no lee esta perilla')
    const pagos = result?.rows.find((r) => r.agente === 'pagos')
    expect(pagos).toMatchObject({ corre: false, porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.' })
    expect(result?.rows.find((r) => r.agente === 'cobranza')?.valla).toHaveLength(1)
  })

  it('si la flota no contesta, error queda seteado y no se inventan filas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())
    await mount()
    expect(result?.isLoading).toBe(false)
    expect(result?.rows).toHaveLength(0)
    expect(result?.error).toBeTruthy()
  })

  it('404 (micro viejo): sin filas y sin error inventado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make404Response())
    await mount()
    expect(result?.rows).toHaveLength(0)
    expect(result?.error).toBeNull()
  })
})
