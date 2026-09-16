/**
 * Lo que la inmobiliaria le debe a cada propietario, por mes (Nico,
 * 2026-09-12: «para analizar flujo de caja»).
 *
 * Lo que se protege:
 *  - una fila por propietario y, al abrirla, un renglón por mes con de qué
 *    está hecho el neto;
 *  - **los números cierran**: recaudado − comisión + a favor − a cargo = neto,
 *    y neto − girado = lo que se le debe; la suma de los meses es el total del
 *    propietario y el pie es la suma de lo que se ve;
 *  - lo que se le cobra al PROPIETARIO se pinta RESTANDO (es una deducción del
 *    egreso, no una deuda del inquilino);
 *  - un mes girado ya no se debe;
 *  - un mes que la liquidación no pudo calcular sale con su aviso, no en cero;
 *  - un fallo del back no se pinta como «no le debes nada a nadie».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { CarteraConPropietarios, MesDelPropietario } from '@/lib/api/cartera.types'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import es from '@/lib/i18n/locales/es.json'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const carteraMock = vi.fn()

vi.mock('@/lib/hooks/use-cartera', () => ({
  useCarteraConPropietarios: () => carteraMock(),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, queEs }: { error: unknown; queEs?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'fallo-de-carga' },
      `${queEs}: ${error instanceof Error ? error.message : String(error)}`,
    ),
}))

import { CarteraDePropietarios } from './CarteraDePropietarios'

function mes(p: Partial<MesDelPropietario> = {}): MesDelPropietario {
  const base = {
    month: '2026-08',
    recaudadoCop: 2_100_000,
    comisionCop: 210_000,
    conceptosAFavorCop: 0,
    // Una reparación de lavamanos: se le descuenta al dueño, no se le
    // factura a nadie.
    conceptosACargoCop: 50_000,
    estado: 'SIN_GENERAR' as const,
    ...p,
  }
  const netoCop =
    p.netoCop ??
    base.recaudadoCop + base.conceptosAFavorCop - base.comisionCop - base.conceptosACargoCop
  const giradoCop = p.giradoCop ?? (base.estado === 'DISP_COMPLETED' ? netoCop : 0)
  return { ...base, netoCop, giradoCop, pendienteCop: netoCop - giradoCop }
}

const AGOSTO = mes({ month: '2026-08', estado: 'DISP_COMPLETED' })
const SEPTIEMBRE = mes({ month: '2026-09' })

function datosDe(over: Partial<CarteraConPropietarios> = {}): CarteraConPropietarios {
  const propietarios = over.propietarios ?? [
    {
      propietarioId: 'p1',
      nombre: 'Marta Cifuentes',
      meses: [AGOSTO, SEPTIEMBRE],
      totales: {
        netoCop: AGOSTO.netoCop + SEPTIEMBRE.netoCop,
        giradoCop: AGOSTO.giradoCop + SEPTIEMBRE.giradoCop,
        pendienteCop: AGOSTO.pendienteCop + SEPTIEMBRE.pendienteCop,
      },
    },
    {
      propietarioId: 'p2',
      nombre: 'Jorge Restrepo',
      meses: [mes({ month: '2026-09', recaudadoCop: 1_000_000, comisionCop: 100_000, conceptosACargoCop: 0 })],
      totales: { netoCop: 900_000, giradoCop: 0, pendienteCop: 900_000 },
    },
  ]
  const totales = propietarios.reduce(
    (a, p) => ({
      netoCop: a.netoCop + p.totales.netoCop,
      giradoCop: a.giradoCop + p.totales.giradoCop,
      pendienteCop: a.pendienteCop + p.totales.pendienteCop,
    }),
    { netoCop: 0, giradoCop: 0, pendienteCop: 0 },
  )
  return {
    generadoEn: '2026-09-12T22:00:00.000Z',
    meses: ['2026-08', '2026-09'],
    avisos: [],
    totalesPorMes: [],
    totales,
    ...over,
    propietarios,
  }
}

function conDatos(datos: CarteraConPropietarios | null, extra: Record<string, unknown> = {}) {
  carteraMock.mockReturnValue({
    datos,
    cargando: false,
    error: null,
    recargar: vi.fn(),
    ...extra,
  })
}

let host: HTMLDivElement
let root: Root

function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<CarteraDePropietarios />)
  })
}

const $ = (sel: string) => {
  const el = host.querySelector<HTMLElement>(sel)
  if (!el) throw new Error(`No está: ${sel}`)
  return el
}
const todos = (sel: string) => Array.from(host.querySelectorAll<HTMLElement>(sel))
const clic = (el: HTMLElement) => act(() => el.click())

function pesosDe(fila: HTMLElement): number[] {
  return Array.from(fila.querySelectorAll(':scope > td')).flatMap((td) => {
    const texto = (td.textContent ?? '').trim()
    if (texto === '—') return [0]
    const m = /^\$(-?[\d.]+)$/.exec(texto)
    return m ? [Number(m[1]!.replace(/\./g, ''))] : []
  })
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  carteraMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('CarteraDePropietarios', () => {
  it('una fila por propietario, con lo pendiente, lo girado y el neto', () => {
    conDatos(datosDe())
    montar()

    const resumen = $('[data-testid="resumen-por-pagar"]').textContent ?? ''
    // Agosto ya se giró (1.840.000): lo pendiente son septiembre + Jorge.
    expect(resumen).toContain(formatCurrency(1_840_000 + 900_000))
    expect(resumen).toContain(formatCurrency(1_840_000))
    expect(resumen).toContain('2 propietarios')

    const filas = todos('[data-testid="fila-propietario"]')
    expect(filas).toHaveLength(2)
    expect(filas[0]!.textContent).toContain('Marta Cifuentes')
    // Neto · girado · se le debe.
    expect(pesosDe(filas[0]!)).toEqual([3_680_000, 1_840_000, 1_840_000])
  })

  it('el mes a mes explica el neto y lo que se le cobra al dueño RESTA', () => {
    conDatos(datosDe())
    montar()
    clic($('[data-testid="fila-propietario"] button'))

    const meses = todos('[data-testid="detalle-de-meses"] tbody tr')
    expect(meses).toHaveLength(2)

    let sumaDeNetos = 0
    let sumaDePendientes = 0
    for (const fila of meses) {
      const [recaudado, comision, aFavor, aCargo, neto, pendiente] = pesosDe(fila)
      // La comisión y lo que se le cobra al dueño se pintan en negativo.
      expect(comision).toBeLessThan(0)
      expect(aCargo).toBeLessThanOrEqual(0)
      expect(recaudado! + comision! + aFavor! + aCargo!).toBe(neto)
      sumaDeNetos += neto!
      sumaDePendientes += pendiente!
    }

    const [netoDeLaFila, , pendienteDeLaFila] = pesosDe(
      todos('[data-testid="fila-propietario"]')[0]!,
    )
    expect(sumaDeNetos).toBe(netoDeLaFila)
    expect(sumaDePendientes).toBe(pendienteDeLaFila)
  })

  it('un mes girado ya no se debe, y lo dice', () => {
    conDatos(datosDe())
    montar()
    clic($('[data-testid="fila-propietario"] button'))

    const agosto = todos('[data-testid="detalle-de-meses"] tbody tr')[0]!
    expect(agosto.textContent).toContain('Girado')
    const cifras = pesosDe(agosto)
    expect(cifras[cifras.length - 1]).toBe(0)
  })

  it('el pie suma lo que se ve, no el total general', () => {
    conDatos(datosDe())
    montar()

    expect(pesosDe($('[data-testid="totales-por-pagar"]'))).toEqual([
      3_680_000 + 900_000,
      1_840_000,
      1_840_000 + 900_000,
    ])

    escribir($('[data-testid="buscar-propietario"]') as HTMLInputElement, 'jorge')
    expect(todos('[data-testid="fila-propietario"]')).toHaveLength(1)
    expect(pesosDe($('[data-testid="totales-por-pagar"]'))).toEqual([900_000, 0, 900_000])
  })

  it('un mes que no se pudo liquidar sale con su aviso, no en cero', () => {
    conDatos(
      datosDe({
        avisos: [
          {
            month: '2026-09',
            mensaje: '«Apartamento 302» tiene 3 copropietarios y el cobro lleva impuestos.',
          },
        ],
      }),
    )
    montar()

    const aviso = $('[data-testid="avisos-de-liquidacion"]').textContent ?? ''
    expect(aviso).toContain('Septiembre de 2026')
    expect(aviso).toContain('3 copropietarios')
  })

  it('un fallo del back no se pinta como «no le debes nada a nadie»', () => {
    conDatos(null, { error: new Error('500 Internal Server Error') })
    montar()

    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('500')
    expect(host.querySelector('[data-testid="resumen-por-pagar"]')).toBeNull()
  })

  it('sin nada por girar lo dice, sin ofrecer quitar filtros', () => {
    conDatos(datosDe({ propietarios: [], meses: [] }))
    montar()

    expect($('[data-testid="tabla-por-pagar"]').textContent).toContain('No le debes nada a nadie')
    expect(host.querySelector('[data-testid="totales-por-pagar"]')).toBeNull()
  })
})

describe('🔴 la puerta al estado de cuenta del PROPIETARIO (Nico, 2026-09-16)', () => {
  it('cada propietario abre SU estado de cuenta, con el regreso a esta lectura', () => {
    conDatos(datosDe())
    montar()
    const enlaces = todos('[data-testid="propietario-estado-de-cuenta"]')
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/panel/inmobiliaria/estado-de-cuenta/propietario/p1?volver=%2Fpanel%2Finmobiliaria%2Fpagos%2Fcartera%2Fpor-pagar',
      '/panel/inmobiliaria/estado-de-cuenta/propietario/p2?volver=%2Fpanel%2Finmobiliaria%2Fpagos%2Fcartera%2Fpor-pagar',
    ])
  })

  it('el enlace NO vive dentro del botón que abre la fila', () => {
    conDatos(datosDe())
    montar()
    expect(host.querySelector('button [data-testid="propietario-estado-de-cuenta"]')).toBeNull()
  })
})

/*
 * 🔴 El pie decía «sólo se le debe lo que el inquilino efectivamente pagó»,
 * que es la base RECAUDADO, y el número sale con base CAUSADO
 * (`DispersionesService.liquidacionDelMes`, llamado sin base desde la cartera).
 * La base no se cambia acá: se dice la verdad, con la convención compartida
 * («Canon causado» con CAUSADO).
 */
describe('🔴 el pie dice la base con que se liquida', () => {
  it('habla de canon CAUSADO, no de lo que el inquilino pagó', () => {
    conDatos(datosDe())
    montar()
    expect($('[data-testid="pie-de-la-base"]').textContent).toBe('cartera.porPagar.pieCausado')
    expect(host.textContent).not.toContain('efectivamente pagó')
  })

  it('el texto del diccionario dice «causado», pagado o no, y no promete sólo lo recaudado', () => {
    const pie = (es as { cartera: { porPagar: { pieCausado: string; canonCausado: string } } })
      .cartera.porPagar
    expect(pie.pieCausado).toContain('canon causado')
    expect(pie.pieCausado).toContain('lo haya pagado el inquilino o no')
    expect(pie.canonCausado).toBe('Canon causado')
  })
})
