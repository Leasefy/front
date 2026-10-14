/**
 * useAgenteDePagos — cómo se traduce lo que contesta el micro.
 *
 * Lo que importa: que «no contestó» se lea como fallo y nunca como apagado.
 * 🔴 (14-10-2026) ya no se pide el «tablero» (`/pagos/home/metrics`): esa ruta
 * no existe en el micro y era un 404 en cada visita.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const auth = { agency: { id: 'agency-1' } as { id: string } | null }
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }))

const fetchPilotoGobierno = vi.fn()
vi.mock('@/lib/api/piloto', () => ({ fetchPilotoGobierno: (...a: unknown[]) => fetchPilotoGobierno(...a) }))

const fetchPagosHome = vi.fn()
vi.mock('@/lib/api/pagos-home', () => ({ fetchPagosHome: (...a: unknown[]) => fetchPagosHome(...a) }))

import { useAgenteDePagos, type AgenteDePagosLectura } from './use-agente-de-pagos'

let contenedor: HTMLDivElement
let root: Root
let ultima: AgenteDePagosLectura | null = null

function Sonda() {
  ultima = useAgenteDePagos()
  return null
}

async function montar() {
  await act(async () => {
    root.render(<Sonda />)
  })
  // Deja resolver las dos promesas.
  await act(async () => {
    await Promise.resolve()
  })
}

const gobiernoCon = (disponibleGlobal: boolean, corre: boolean) => ({
  ok: true,
  data: {
    agentes: [
      { agente: 'cobranza', corre: true, origen: 'heredado', disponibleGlobal: true },
      { agente: 'pagos', corre, origen: 'heredado', disponibleGlobal },
    ],
    llavesFinas: [],
  },
})

beforeEach(() => {
  auth.agency = { id: 'agency-1' }
  fetchPilotoGobierno.mockReset()
  fetchPagosHome.mockReset()
  ultima = null
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('useAgenteDePagos', () => {
  it('hoy: toma el item «pagos» del gobierno', async () => {
    fetchPilotoGobierno.mockResolvedValue(gobiernoCon(false, false))
    await montar()
    expect(fetchPilotoGobierno).toHaveBeenCalledWith('agency-1', expect.anything())
    expect(ultima?.gobierno).toEqual({
      estado: 'listo',
      item: { agente: 'pagos', corre: false, origen: 'heredado', disponibleGlobal: false },
    })
  })

  it('🔴 (14-10) no pide el tablero que el micro no publica', async () => {
    fetchPilotoGobierno.mockResolvedValue(gobiernoCon(true, true))
    await montar()
    expect(fetchPagosHome).not.toHaveBeenCalled()
    expect(ultima && 'tablero' in ultima).toBe(false)
  })

  it('🔴 el gobierno que no contesta es «fallo»', async () => {
    fetchPilotoGobierno.mockResolvedValue({ ok: false, error: '403' })
    await montar()
    expect(ultima?.gobierno).toEqual({ estado: 'fallo' })
  })

  it('si el micro no lista al equipo, el item llega en null (y se leerá «sin verificar»)', async () => {
    fetchPilotoGobierno.mockResolvedValue({ ok: true, data: { agentes: [], llavesFinas: [] } })
    await montar()
    expect(ultima?.gobierno).toEqual({ estado: 'listo', item: null })
  })

  it('sin agencia todavía no pregunta ni afirma nada', async () => {
    auth.agency = null
    await montar()
    expect(fetchPilotoGobierno).not.toHaveBeenCalled()
    expect(ultima?.gobierno).toEqual({ estado: 'cargando' })
  })
})
