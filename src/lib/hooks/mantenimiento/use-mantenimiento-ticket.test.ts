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
    const api = result.current as unknown as Record<string, unknown>
    for (const m of ['assign', 'requestInfo', 'requestApproval', 'escalate', 'reopen', 'close']) {
      expect(typeof api[m]).toBe('function')
    }
  })

  it('returns null data for an unknown id', async () => {
    const result = renderHook('does-not-exist')
    await act(async () => { await new Promise((r) => setTimeout(r, 40)) })
    expect(result.current!.isLoading).toBe(false)
    expect(result.current!.data).toBeNull()
  })

  it('assign() → estado proveedor_asignado and appends an evento', async () => {
    const result = renderHook('mant-001')
    await settle(result)
    const before = result.current!.data!.eventos.length
    act(() => { result.current!.assign() })
    expect(result.current!.data!.estado).toBe('proveedor_asignado')
    expect(result.current!.data!.eventos.length).toBe(before + 1)
    expect(result.current!.data!.eventos.at(-1)!.actor).toBe('human')
  })

  it('requestInfo/requestApproval/escalate/reopen map to valid states', async () => {
    const result = renderHook('mant-001')
    await settle(result)
    act(() => { result.current!.requestInfo() })
    expect(result.current!.data!.estado).toBe('informacion_incompleta')
    act(() => { result.current!.requestApproval() })
    expect(result.current!.data!.estado).toBe('requiere_aprobacion')
    act(() => { result.current!.escalate() })
    expect(result.current!.data!.estado).toBe('escalado')
    act(() => { result.current!.reopen() })
    expect(result.current!.data!.estado).toBe('reabierto')
  })

  it('close() is FENCE-04 gated: no-op + false without evidence; cierra con evidencia', async () => {
    const result = renderHook('mant-001')
    await settle(result)
    let ret: boolean | undefined
    act(() => { ret = result.current!.close() })
    expect(ret).toBe(false)
    expect(result.current!.data!.estado).not.toBe('cerrado')

    act(() => { ret = result.current!.close({ note: 'reparado, foto adjunta' }) })
    expect(ret).toBe(true)
    expect(result.current!.data!.estado).toBe('cerrado')
  })
})
