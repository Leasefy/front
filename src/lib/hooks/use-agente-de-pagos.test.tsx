/**
 * useAgenteDePagos — cómo se traduce lo que contesta el micro.
 *
 * Lo que importa: un tablero que no existe (404) o está apagado (503) llega
 * como `notAvailable` y se lee «no disponible», NO como fallo; y que una
 * lectura falle no tapa a la otra.
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
  it('hoy: toma el item «pagos» del gobierno y el tablero sin publicar es «no disponible»', async () => {
    fetchPilotoGobierno.mockResolvedValue(gobiernoCon(false, false))
    fetchPagosHome.mockResolvedValue({ data: null, notAvailable: true })
    await montar()
    expect(fetchPilotoGobierno).toHaveBeenCalledWith('agency-1', expect.anything())
    expect(ultima?.gobierno).toEqual({
      estado: 'listo',
      item: { agente: 'pagos', corre: false, origen: 'heredado', disponibleGlobal: false },
    })
    expect(ultima?.tablero).toEqual({ estado: 'no-disponible' })
    expect(ultima?.resumen).toBeNull()
  })

  it('🔴 el gobierno que no contesta es «fallo», y no tapa al tablero', async () => {
    fetchPilotoGobierno.mockResolvedValue({ ok: false, error: '403' })
    const resumen = { agente: 'pagos', kpis: [], pipeline: [], feed: [], generatedAt: '' }
    fetchPagosHome.mockResolvedValue({ data: resumen, notAvailable: false })
    await montar()
    expect(ultima?.gobierno).toEqual({ estado: 'fallo' })
    expect(ultima?.tablero).toEqual({ estado: 'listo' })
    expect(ultima?.resumen).toBe(resumen)
  })

  it('un tablero que rompe (500, sin URL del agente) es «fallo», con el error', async () => {
    fetchPilotoGobierno.mockResolvedValue(gobiernoCon(true, true))
    const error = new Error('500')
    fetchPagosHome.mockRejectedValue(error)
    await montar()
    expect(ultima?.tablero).toEqual({ estado: 'fallo', error })
    expect(ultima?.gobierno.estado).toBe('listo')
  })

  it('si el micro no lista al equipo, el item llega en null (y se leerá «sin verificar»)', async () => {
    fetchPilotoGobierno.mockResolvedValue({ ok: true, data: { agentes: [], llavesFinas: [] } })
    fetchPagosHome.mockResolvedValue({ data: null, notAvailable: true })
    await montar()
    expect(ultima?.gobierno).toEqual({ estado: 'listo', item: null })
  })

  it('sin agencia todavía no pregunta ni afirma nada', async () => {
    auth.agency = null
    await montar()
    expect(fetchPilotoGobierno).not.toHaveBeenCalled()
    expect(ultima?.gobierno).toEqual({ estado: 'cargando' })
    expect(ultima?.tablero).toEqual({ estado: 'cargando' })
  })
})
