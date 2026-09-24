/**
 * De dónde saca el cajón del inquilino lo que DEBE.
 *
 * 🔴 Del resumen del estado de cuenta (las cuotas de sus contratos), nunca de
 * los cobros: en la inmobiliaria migrada hay 0 cobros contra 30.951 cuotas, y
 * sumando cobros todos sus inquilinos se veían sin saldo. Por eso acá los cobros
 * vienen vacíos y el resumen trae deuda: si el hook volviera a derivarla de los
 * cobros, `cuenta` no tendría de dónde salir.
 *
 * Y la identidad: primero la cuenta del portal; si con ella no aparece ningún
 * contrato, el documento. Nunca las dos sumadas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Inquilino } from '@/lib/api/inquilinos.service'
import type { ResumenDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const resumenMock = vi.fn()
const cobrosMock = vi.fn()
const obtenerMock = vi.fn()

vi.mock('@/lib/api/estado-de-cuenta.service', () => ({
  estadoDeCuentaApi: {
    resumen: (tipo: string, id: string) => resumenMock(tipo, id),
  },
}))
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { cobros: (id: string) => cobrosMock(id) },
}))
vi.mock('@/lib/api/inquilinos.service', () => ({
  inquilinosApi: { obtener: (id: string) => obtenerMock(id) },
}))

import { useInquilinoDetalle } from './use-inquilino-detalle'

function resumen(p: Partial<ResumenDelEstadoDeCuenta> = {}): ResumenDelEstadoDeCuenta {
  return { restaPorPagar: 0, pendiente: 0, proximaCuota: null, enMora: null, contratos: 1, ...p }
}

const PERSONA: Inquilino = {
  tenantId: 'u-1',
  nombre: 'Esteban López',
  email: null,
  telefono: null,
  documento: '1020304050',
  arriendos: [
    {
      leaseId: 'l1',
      contractId: 'c1',
      estado: 'ACTIVE',
      desde: '2025-09-04',
      hasta: '2026-09-04',
      canonCop: 1_250_000,
      inmueble: null,
    },
  ],
}

describe('useInquilinoDetalle — lo que debe', () => {
  let root: Root | undefined
  let container: HTMLDivElement | undefined
  const result: { current: ReturnType<typeof useInquilinoDetalle> } = { current: null }

  function Sonda({ persona }: { persona: Inquilino }) {
    result.current = useInquilinoDetalle(persona)
    return null
  }

  async function montar(persona: Inquilino = PERSONA) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root!.render(<Sonda persona={persona} />)
    })
  }

  beforeEach(() => {
    resumenMock.mockReset()
    cobrosMock.mockReset()
    obtenerMock.mockReset()
    // Cero cobros: la inmobiliaria migrada.
    cobrosMock.mockResolvedValue([])
    obtenerMock.mockResolvedValue(PERSONA)
    result.current = null
  })

  afterEach(() => {
    const r = root
    if (r) act(() => r.unmount())
    container?.remove()
    root = undefined
    container = undefined
  })

  it('🔴 con cero cobros, la deuda llega del estado de cuenta por su cuenta del portal', async () => {
    resumenMock.mockResolvedValue(
      resumen({ restaPorPagar: 15_000_000, pendiente: 2_500_000, enMora: { dias: 37, monto: 1_250_000 } }),
    )

    await montar()

    expect(resumenMock).toHaveBeenCalledWith('inquilino', 'u-1')
    expect(result.current?.cobros).toEqual([])
    expect(result.current?.cuenta?.restaPorPagar).toBe(15_000_000)
    expect(result.current?.cuenta?.enMora).toEqual({ dias: 37, monto: 1_250_000 })
    expect(result.current?.refDeCuenta).toBe('u-1')
    expect(result.current?.cargandoCuenta).toBe(false)
  })

  it('si por la cuenta no aparece ningún contrato, pregunta por el documento — y no suma las dos', async () => {
    resumenMock.mockImplementation((_tipo: string, id: string) =>
      Promise.resolve(
        id === 'u-1' ? resumen({ contratos: 0 }) : resumen({ contratos: 2, restaPorPagar: 7_000_000 }),
      ),
    )

    await montar()

    expect(resumenMock).toHaveBeenCalledWith('inquilino', '1020304050')
    expect(result.current?.cuenta?.restaPorPagar).toBe(7_000_000)
    expect(result.current?.refDeCuenta).toBe('1020304050')
  })

  it('sin contratos por ninguno de los dos caminos, no hay estado de cuenta que abrir', async () => {
    resumenMock.mockResolvedValue(resumen({ contratos: 0 }))

    await montar()

    expect(result.current?.cuenta?.contratos).toBe(0)
    expect(result.current?.refDeCuenta).toBeNull()
  })

  it('si el estado de cuenta no responde, no inventa un cero: `cuenta` null y el error dicho', async () => {
    resumenMock.mockRejectedValue(new Error('500'))

    await montar()

    expect(result.current?.cuenta).toBeNull()
    expect(result.current?.errorCuenta).toBe(true)
    expect(result.current?.refDeCuenta).toBeNull()
  })
})
