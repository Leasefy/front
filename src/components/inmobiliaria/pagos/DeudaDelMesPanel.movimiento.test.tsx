/**
 * @vitest-environment happy-dom
 *
 * El movimiento de la portada de Pagos (MOV-A1, movimiento ola 2, 03-10-2026),
 * con animaciones REALES (`MotionGlobalConfig.skipAnimations = false`):
 *
 * - Al buscar, la cuota que ya no coincide SALE (sigue un momento mientras se
 *   va) y las que quedan son los MISMOS nodos (`key` = la cuota).
 * - La marca de la pestaña del cajón es UNA y se desliza (`MotionIndicator`):
 *   antes cada pestaña tenía su raya y se prendía y apagaba con la opacidad.
 * - Las cifras del mes cuentan desde las del mes anterior (`AnimatedNumber`):
 *   recién cambiado el mes todavía no dicen la cifra nueva; un momento
 *   después, sí, y con el MISMO formato de siempre.
 * - La barra de avance de Pagos se corre con `transform`, nunca con el ancho.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'

import type { CarteraDelMes, FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const carteraMock = vi.fn()

vi.mock('@/lib/hooks/use-cartera', () => ({
  useCarteraDelMes: (mes: string) => carteraMock(mes),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    locale: 'es',
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('@/components/inmobiliaria/permiso-de-recibo', () => ({
  MOTIVO_SIN_PERMISO_DE_RECIBO: 'Necesitas permiso para crear cobros.',
  usePuedeHacerRecibo: () => true,
}))
vi.mock('@/lib/api/recibos-de-caja.service', () => ({
  recibosDeCajaApi: { crearPorCliente: vi.fn() },
}))
vi.mock('@/components/inmobiliaria/RegistrarPagoModal', () => ({
  RegistrarPagoModal: () => null,
}))
// El Select del DS monta un portal de Radix: se reduce a un <select> nativo.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children?: React.ReactNode
  }) =>
    React.createElement(
      'select',
      {
        value,
        onChange: (e: { target: { value: string } }) => onValueChange(e.target.value),
        'data-testid': 'select-mes',
      },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement('option', { value }, children),
}))

import { DeudaDelMesPanel } from './DeudaDelMesPanel'
import { BarraDeAvance } from './BarraDeAvance'

function fila(p: Partial<FilaDeLaCuotaDelMes>): FilaDeLaCuotaDelMes {
  return {
    cuotaId: 'q1',
    cobroId: null,
    contractId: 'ct1',
    contrato: '1686',
    contratoDeLeasefy: null,
    inquilino: 'Nicolás Rojas',
    tenantId: null,
    documento: '70814637',
    telefono: null,
    inmueble: 'Apartamento 302',
    mes: '2026-09',
    vence: '2026-09-05',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 5,
    diasDePlazo: 5,
    esVencida: true,
    enMora: true,
    enSiniestro: false,
    totalCop: 2_000_000,
    pagadoCop: 0,
    pendienteCop: 2_000_000,
    ...p,
  }
}

const NICOLAS = fila({})
const MARTA = fila({ cuotaId: 'q2', contractId: 'ct2', inquilino: 'Marta Gómez', documento: '43111222' })
const ANA = fila({ cuotaId: 'q3', contractId: 'ct3', inquilino: 'Ana Ruiz', documento: '52000111' })

function mes(pendienteCop: number): CarteraDelMes {
  return {
    generadoEn: '2026-09-15T17:00:00.000Z',
    hoy: '2026-09-15',
    mes: '2026-09',
    totales: {
      cuotas: 3,
      contratos: 3,
      inquilinos: 3,
      totalCop: pendienteCop,
      pagadoCop: 0,
      pendienteCop,
      porVencerCop: 0,
      vencidaEnPlazoCop: 0,
      carteraCop: pendienteCop,
      cuotasEnCartera: 3,
      enSiniestroCop: 0,
      sinCuadrarCop: 0,
    },
    filas: [NICOLAS, MARTA, ANA],
    contratosSinCuotas: 0,
    excluidas: [],
    avisos: [],
  } as CarteraDelMes
}

let host: HTMLDivElement
let root: Root
const $ = (sel: string) => host.querySelector(sel) as HTMLElement
const nombres = () =>
  [...host.querySelectorAll('[data-testid="cuota-fila"]')].map((tr) => tr.textContent?.match(/Nicolás|Marta|Ana/)?.[0])
const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  MotionGlobalConfig.skipAnimations = false
  carteraMock.mockReset()
  carteraMock.mockImplementation((m: string) => ({
    datos: mes(m === '2026-09' ? 6_000_000 : 3_000_000),
    cargando: false,
    error: null,
    recargar: vi.fn(),
  }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<DeudaDelMesPanel mesInicial="2026-09" />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

describe('Pagos — la deuda del mes se mueve', () => {
  it('🔴 al buscar, la cuota que no coincide SALE animada y las demás son los mismos nodos', async () => {
    await esperar(600) // que terminen de entrar
    const marta = host.querySelectorAll('[data-testid="cuota-fila"]')[1]
    escribir($('[data-testid="buscar-cuotas"]') as HTMLInputElement, 'Marta')
    // Mientras sale, la de Nicolás y la de Ana siguen ahí (no se cortan).
    expect(nombres()).toEqual(['Nicolás', 'Marta', 'Ana'])
    await esperar(500)
    expect(nombres()).toEqual(['Marta'])
    expect(host.querySelector('[data-testid="cuota-fila"]')).toBe(marta)
  })

  it('🔴 la marca de la pestaña es UNA y queda en la elegida (se desliza, no se prende y apaga)', async () => {
    const marcas = () => [...host.querySelectorAll('[data-testid="cajones-del-mes"] [role="tab"] span[aria-hidden]')]
    expect(marcas()).toHaveLength(1)
    expect($('[data-testid="cajon-todas"]').contains(marcas()[0]!)).toBe(true)
    act(() => {
      $('[data-testid="cajon-cartera"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await esperar(50)
    expect(marcas()).toHaveLength(1)
    expect($('[data-testid="cajon-cartera"]').contains(marcas()[0]!)).toBe(true)
  })

  it('🔴 al cambiar de mes, «falta» CUENTA hasta la cifra nueva, con el mismo formato', async () => {
    expect($('[data-testid="mes-falta"]').textContent).toBe('$\u00a06.000.000')
    act(() => {
      const select = $('[data-testid="select-mes"]') as HTMLSelectElement
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(select, '2026-08')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await esperar(60)
    // A mitad del conteo: ya no es la vieja ni todavía la nueva.
    const aMitad = $('[data-testid="mes-falta"]').textContent
    expect(aMitad).not.toBe('$ 3.000.000')
    await esperar(800)
    expect($('[data-testid="mes-falta"]').textContent).toBe('$\u00a03.000.000')
  })
})

describe('<BarraDeAvance>', () => {
  it('🔴 se corre con `transform` y nunca anima el ancho', async () => {
    MotionGlobalConfig.skipAnimations = true
    act(() => {
      root.render(
        <div className="overflow-hidden">
          <BarraDeAvance ancho="29.6%" data-testid="barra" />
        </div>,
      )
    })
    await esperar(20)
    const barra = $('[data-testid="barra"]')
    expect(barra.style.width).toBe('')
    expect(barra.style.transform).toContain('-70.4%')
    expect(barra.getAttribute('data-lleno')).toBe('29.6')
  })
})
