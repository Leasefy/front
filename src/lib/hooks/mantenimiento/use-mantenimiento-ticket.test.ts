/**
 * use-mantenimiento-ticket.test.ts — Phase 7 plan 07-01 (Task 3 TDD)
 *
 * Mock-mode resolve of a known ticket + the state-machine-consistent mutators.
 * close() honors the FENCE-04 evidence gate (no-op without evidence).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

let _mockAgency: { id: string } | null = { id: 'agency-test-mant' }
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: _mockAgency }),
}))

import { useMantenimientoTicket } from './use-mantenimiento-ticket'

let container: HTMLDivElement
let root: Root
const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API
const ORIGINAL_DELAY = process.env.NEXT_PUBLIC_MOCK_DELAY_MS

function renderHook(ticketId: string): { current: ReturnType<typeof useMantenimientoTicket> | null } {
  const result: { current: ReturnType<typeof useMantenimientoTicket> | null } = { current: null }
  function Wrapper() {
    result.current = useMantenimientoTicket(ticketId)
    return null
  }
  act(() => {
    root.render(React.createElement(Wrapper))
  })
  return result
}

beforeEach(() => {
  // Estos tests ejercitan la rama SIMULADA, y el simulado dejó de venir por
  // defecto: hay que pedirlo con todas las letras. Antes alcanzaba con borrar
  // la variable, y esa misma comodidad servía datos inventados en staging.
  process.env.NEXT_PUBLIC_USE_MOCK_API = 'true'
  process.env.NEXT_PUBLIC_MOCK_DELAY_MS = '10'
  _mockAgency = { id: 'agency-test-mant' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
  if (ORIGINAL_MOCK === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK_API
  else process.env.NEXT_PUBLIC_USE_MOCK_API = ORIGINAL_MOCK
  if (ORIGINAL_DELAY === undefined) delete process.env.NEXT_PUBLIC_MOCK_DELAY_MS
  else process.env.NEXT_PUBLIC_MOCK_DELAY_MS = ORIGINAL_DELAY
})

async function settle(result: { current: ReturnType<typeof useMantenimientoTicket> | null }) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40))
  })
  expect(result.current!.isLoading).toBe(false)
  expect(result.current!.data).not.toBeNull()
}

describe('useMantenimientoTicket', () => {
  it('mock mode resolves a known ticket detail with the full return shape', async () => {
    const result = renderHook('mant-001')
    await settle(result)
    expect(result.current!.data!.id).toBe('mant-001')
    expect(result.current).toHaveProperty('refetch')
    expect(typeof result.current!.refetch).toBe('function')
  })

  it('returns null data for an unknown id', async () => {
    const result = renderHook('does-not-exist')
    await act(async () => { await new Promise((r) => setTimeout(r, 40)) })
    expect(result.current!.isLoading).toBe(false)
    expect(result.current!.data).toBeNull()
  })

  /**
   * 🔴 El hook NO puede volver a exponer mutadores locales.
   *
   * Tenía `assign`/`requestInfo`/`requestApproval`/`escalate`/`reopen`/`close`,
   * que cambiaban `estado` en memoria y le agregaban al historial un evento con
   * `actor: 'human'` diciendo «Proveedor asignado al ticket.» — sin que saliera
   * nada, sin que se guardara nada y volviendo atrás al recargar. El micro sirve
   * estos tickets sólo por GET; el estado es del back detrás de un rail S2S que
   * el navegador no puede usar. Si alguien los repone, esto se pone rojo.
   */
  it('no expone mutadores: la ficha se mira, no se acciona', async () => {
    const result = renderHook('mant-001')
    await settle(result)
    expect(Object.keys(result.current!).sort()).toEqual([
      'data',
      'error',
      'isLoading',
      'refetch',
    ])
  })

  it('el estado del ticket no cambia desde el cliente', async () => {
    const result = renderHook('mant-001')
    await settle(result)
    const antes = result.current!.data!.estado
    const eventos = result.current!.data!.eventos.length
    // Cualquier mutador que reaparezca sería llamable acá; hoy no hay ninguno.
    const conMutadores = result.current as unknown as Record<string, unknown>
    for (const nombre of ['assign', 'requestInfo', 'requestApproval', 'escalate', 'reopen', 'close']) {
      expect(conMutadores[nombre]).toBeUndefined()
    }
    expect(result.current!.data!.estado).toBe(antes)
    expect(result.current!.data!.eventos.length).toBe(eventos)
  })
})
