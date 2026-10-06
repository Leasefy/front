/**
 * QA-INQ (03-10-2026) · los hooks de Inquilinos.
 *
 *  · I-07: el portafolio (los tres números de arriba) no cambia con la
 *    búsqueda ni con la pestaña. Sin filtros, la lista ES el portafolio y no
 *    se pide nada más; con un filtro, se pide UNA vez la lista sin filtros.
 *  · I-12: el estado de cuenta de una persona con identidad sintética
 *    (`doc:…`) se pide por su documento, no por `doc:…`.
 *  · E-16: `version` vuelve a pedir el detalle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Inquilino } from '@/lib/api/inquilinos.service'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { listar, conteos, obtener, resumen, cobros } = vi.hoisted(() => ({
  listar: vi.fn(),
  conteos: vi.fn(),
  obtener: vi.fn(),
  resumen: vi.fn(),
  cobros: vi.fn(),
}))
vi.mock('@/lib/api/inquilinos.service', async (importar) => {
  const real = await importar<typeof import('@/lib/api/inquilinos.service')>()
  return { ...real, inquilinosApi: { listar, conteos, obtener } }
})
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { resumen } }))
vi.mock('@/lib/api/contracts.service', () => ({ contractsApi: { cobros } }))

import { useInquilinos } from './use-inquilinos'
import { useInquilinoDetalle } from './use-inquilino-detalle'

function persona(nombre: string, canon: number): Inquilino {
  return {
    tenantId: nombre,
    nombre,
    email: null,
    telefono: null,
    documento: null,
    arriendos: [
      { leaseId: null, contractId: `c-${nombre}`, estado: 'ACTIVE', desde: '2025-01-01', hasta: null, canonCop: canon, inmueble: null },
    ],
  }
}
const PORTAFOLIO = [persona('Ana', 1_000_000), persona('Beto', 2_000_000)]

let host: HTMLDivElement
let root: Root
let ultimo: ReturnType<typeof useInquilinos> | null = null

function Sonda({ buscar, estado }: { buscar: string; estado: 'activos' | 'todos' | 'terminados' }) {
  ultimo = useInquilinos({ buscar, estado }, { portafolio: true })
  return null
}

async function esperar(ms = 0) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

beforeEach(() => {
  listar.mockReset()
  conteos.mockReset().mockResolvedValue({ activos: 2, terminados: 0, todos: 2 })
  obtener.mockReset()
  resumen.mockReset()
  cobros.mockReset().mockResolvedValue([])
  listar.mockImplementation(async (f: { buscar?: string; estado?: string }) =>
    f.buscar ? [] : f.estado === 'activos' ? PORTAFOLIO : [...PORTAFOLIO, persona('Ceci', 9)],
  )
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  ultimo = null
})

describe('useInquilinos · I-07 el portafolio', () => {
  it('sin filtros, la lista ES el portafolio: UNA sola lectura', async () => {
    await act(async () => {
      root.render(<Sonda buscar="" estado="activos" />)
    })
    await esperar(10)
    expect(listar).toHaveBeenCalledTimes(1)
    expect(ultimo!.portafolio).toEqual({ personas: 2, vigentes: 2, canon: 3_000_000 })
  })

  it('🔴 con una búsqueda vacía de resultados, el portafolio NO cae a cero', async () => {
    await act(async () => {
      root.render(<Sonda buscar="" estado="activos" />)
    })
    await esperar(10)
    await act(async () => {
      root.render(<Sonda buscar="nadie" estado="activos" />)
    })
    await esperar(400)
    expect(ultimo!.inquilinos).toEqual([])
    expect(ultimo!.portafolio).toEqual({ personas: 2, vigentes: 2, canon: 3_000_000 })
    // No se volvió a pedir el portafolio sólo por teclear.
    expect(listar.mock.calls.filter(([f]) => !f.buscar && f.estado === 'activos')).toHaveLength(1)
  })

  it('🔴 llegando con un filtro (p. ej. «todos»), el portafolio se pide aparte: activos, sin búsqueda', async () => {
    await act(async () => {
      root.render(<Sonda buscar="" estado="todos" />)
    })
    await esperar(10)
    expect(listar).toHaveBeenCalledWith({ estado: 'activos' })
    expect(ultimo!.inquilinos).toHaveLength(3)
    expect(ultimo!.portafolio).toEqual({ personas: 2, vigentes: 2, canon: 3_000_000 })
  })

  it('si la lectura del portafolio falla, se dice (error propio), sin inventar un cero', async () => {
    listar.mockImplementation(async (f: { estado?: string }) => {
      if (f.estado === 'activos') throw new Error('500')
      return PORTAFOLIO
    })
    await act(async () => {
      root.render(<Sonda buscar="" estado="todos" />)
    })
    await esperar(10)
    expect(ultimo!.portafolio).toBeNull()
    expect(ultimo!.errorPortafolio).toBeTruthy()
  })
})

describe('useInquilinoDetalle · I-12 y E-16', () => {
  let detalle: ReturnType<typeof useInquilinoDetalle> = null
  function SondaDetalle({ p, version }: { p: Inquilino; version: number }) {
    detalle = useInquilinoDetalle(p, version)
    return null
  }

  it('🔴 con `doc:…` el estado de cuenta se pide por el DOCUMENTO', async () => {
    obtener.mockResolvedValue({ ...persona('Iván', 1), tenantId: 'doc:1020304050', documento: '1020304050' })
    resumen.mockResolvedValue({ restaPorPagar: 5, pendiente: 0, proximaCuota: null, enMora: null, contratos: 1 })
    await act(async () => {
      root.render(
        <SondaDetalle p={{ ...persona('Iván', 1), tenantId: 'doc:1020304050', documento: '1020304050' }} version={0} />,
      )
    })
    await esperar(10)
    expect(resumen).toHaveBeenCalledWith('inquilino', '1020304050')
    expect(resumen).not.toHaveBeenCalledWith('inquilino', 'doc:1020304050')
    expect(detalle!.refDeCuenta).toBe('1020304050')
  })

  it('subir `version` vuelve a pedir su detalle (tras «Editar datos»)', async () => {
    obtener.mockResolvedValue(persona('Ana', 1))
    resumen.mockResolvedValue({ restaPorPagar: 0, pendiente: 0, proximaCuota: null, enMora: null, contratos: 1 })
    await act(async () => {
      root.render(<SondaDetalle p={persona('Ana', 1)} version={0} />)
    })
    await esperar(10)
    expect(obtener).toHaveBeenCalledTimes(1)
    await act(async () => {
      root.render(<SondaDetalle p={persona('Ana', 1)} version={1} />)
    })
    await esperar(10)
    expect(obtener).toHaveBeenCalledTimes(2)
  })
})
