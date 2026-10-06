/**
 * QA-CONT-95 (04-10-2026): la fecha que traen precargada «Terminar el arriendo»
 * y «Cambiar de propietario» es HOY EN COLOMBIA. Salía de `toISOString()` (UTC):
 * desde las 7 p. m. de Bogotá ya era mañana, y una terminación confirmada sin
 * mirar la fecha cobraba un día de más en el último mes.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    motivosDeTerminacion: vi.fn(async () => ({ motivos: [{ codigo: 'MUTUO_ACUERDO', nombre: 'Mutuo acuerdo', exigeNota: false }] })),
    vistaPreviaDeTerminacion: vi.fn(async () => ({ puedeTerminarse: true, razon: null, finPactado: '2026-12-31', disponible: true, prorrateoDelUltimoMes: null })),
    terminar: vi.fn(),
    registrarCesion: vi.fn(),
  },
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: { getAll: vi.fn(async () => []) } }))
vi.mock('@/components/contratos/SelectorDePropietario', () => ({ SelectorDePropietario: () => null }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { TerminarContrato } from './TerminarContrato'
import { CesionDelInmueble } from './CesionDelInmueble'

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  // 7:30 p. m. del 4 de octubre en Bogotá = 00:30 del 5 en UTC.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-05T00:30:00.000Z'))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => { root?.unmount() })
  container?.remove()
  root = null
  vi.useRealTimers()
})

describe('QA-CONT-95 · la fecha de hoy precargada es la de Colombia', () => {
  it('🔴 «Terminar el arriendo» a las 7:30 p. m. trae el 4 de octubre, no el 5', async () => {
    await act(async () => {
      root!.render(<TerminarContrato contractId="c1" abierto onCerrar={vi.fn()} onTerminado={vi.fn()} />)
    })
    const campo = document.body.querySelector('[data-testid="terminado-en"]') as HTMLInputElement
    expect(campo.value).toBe('2026-10-04')
  })

  it('🔴 «Cambiar de propietario» a las 7:30 p. m. trae el 4 de octubre, no el 5', async () => {
    await act(async () => {
      root!.render(<CesionDelInmueble contractId="c1" propietarioActual="Ana" abierto onCerrar={vi.fn()} onRegistrada={vi.fn()} />)
    })
    const campo = document.body.querySelector('[data-testid="cesion-desde"]') as HTMLInputElement
    expect(campo.value).toBe('2026-10-04')
  })
})
