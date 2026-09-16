/**
 * La cartera completa: la franja con las cuatro cifras que NO se pueden sumar
 * en una, las fichas por edad de la cartera, y LA tabla de la casa con el
 * agrupador (Por deuda · Por propietario · En siniestro) en su barra.
 *
 * Lo que se protege:
 *  - 🔴 lo que no vence, lo vencido en plazo y la cartera son TRES cifras
 *    distintas, y ninguna ficha de edad alcanza a las dos primeras;
 *  - los tramos por edad se leen sobre `diasDeMora`, que son los días DESPUÉS
 *    del plazo del contrato;
 *  - los tres agrupadores muestran LA tabla, con sus filas, dentro de la
 *    misma tarjeta;
 *  - tocar un propietario abre sus deudas y deja el filtro a la vista;
 *  - los dos vacíos siguen siendo dos (con filtros → «Quitar los filtros»);
 *  - lo que el informe NO cuenta se muestra, no se calla;
 *  - un fallo del back no se pinta como una cartera en $0.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { CarteraItem, CarteraReport } from '@/lib/types/inmobiliaria'
import { formatCurrency } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const reportMock = vi.fn()
const pushMock = vi.fn()

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useCarteraReport: () => reportMock(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    locale: 'es',
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, queEs }: { error: unknown; queEs?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'fallo-de-carga' },
      `${queEs}: ${error instanceof Error ? error.message : String(error)}`,
    ),
}))

import { CarteraCompleta } from './CarteraCompleta'

function deuda(p: Partial<CarteraItem> = {}): CarteraItem {
  return {
    cuotaId: 'q1',
    cobroId: null,
    contractId: 'ct-1',
    contrato: '1686',
    contratoDeLeasefy: 'Leasefy #12',
    propertyId: 'inm-1',
    consignacionId: 'cons1',
    propertyTitle: 'Apartamento 302',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López',
    tenantPhone: '3010082450',
    tenantDocument: '1020',
    propietarioId: 'p1',
    propietarioName: 'Marta Cifuentes',
    agenteId: null,
    agenteName: null,
    month: '2026-08',
    vence: '2026-08-05',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 12,
    diasDePlazo: 3,
    esVencida: true,
    totalAmount: 3_750_000,
    paidAmount: 0,
    pendingAmount: 3_750_000,
    remindersSent: 2,
    lastReminderDate: '2026-08-20',
    ...p,
  }
}

const ITEMS: CarteraItem[] = [
  deuda(),
  deuda({
    cuotaId: 'q2',
    propertyId: 'inm-2',
    tenantName: 'Ana Pérez',
    diasDeMora: 95,
    pendingAmount: 1_000_000,
  }),
  deuda({
    cuotaId: 'q3',
    propertyId: 'inm-3',
    tenantName: 'Luis Gómez',
    propietarioId: 'p2',
    propietarioName: 'Jorge Restrepo',
    cajon: 'POR_VENCER',
    esVencida: false,
    diasDeMora: 0,
    pendingAmount: 2_000_000,
  }),
  deuda({
    cuotaId: 'q4',
    propertyId: 'inm-4',
    tenantName: 'Carla Ruiz',
    propietarioId: null,
    propietarioName: null,
    diasDeMora: 40,
    pendingAmount: 500_000,
  }),
  deuda({
    cuotaId: 'q5',
    propertyId: 'inm-5',
    tenantName: 'Sara Mesa',
    propietarioId: 'p2',
    propietarioName: 'Jorge Restrepo',
    cajon: 'VENCIDA_EN_PLAZO',
    esVencida: true,
    diasDeMora: 0,
    pendingAmount: 750_000,
  }),
]

function reporte(over: Partial<CarteraReport> = {}): CarteraReport {
  return {
    generadoEn: '2026-09-03T10:00:00Z',
    hoy: '2026-09-03',
    items: ITEMS,
    summary: {
      deudaTotalCop: 8_000_000,
      porVencerCop: 2_000_000,
      vencidaEnPlazoCop: 750_000,
      carteraCop: 6_150_000,
      carteraVivaCop: 5_250_000,
      enSiniestroCop: 900_000,
      bucket0to30: 3_750_000,
      bucket31to60: 500_000,
      bucket61to90: 0,
      bucket90plus: 1_000_000,
      cuotas: 6,
      cuotasPorVencer: 1,
      cuotasVencidasEnPlazo: 1,
      cuotasEnCartera: 4,
      cuotasEnSiniestro: 1,
    },
    siniestros: {
      cantidad: 1,
      totalCop: 900_000,
      diasParaSiniestro: 45,
      items: [
        {
          ...deuda({
            cuotaId: 's1',
            tenantName: 'Pedro Quiroga',
            diasDeMora: 60,
            pendingAmount: 900_000,
          }),
          siniestroDesde: '2026-08-19',
          diasEnSiniestro: 15,
        },
      ],
    },
    sinCamino: {
      sinInmueble: 0,
      sinMandato: 0,
      sinPropietario: 1,
      sinAgente: 5,
      sinDireccion: 0,
      sinTelefono: 0,
    },
    contratosSinCuotas: 0,
    avisos: [],
    ...over,
  }
}

function conReporte(report: CarteraReport | null, extra: Partial<ReturnType<typeof reportMock>> = {}) {
  reportMock.mockReturnValue({
    report,
    isLoading: false,
    error: null,
    errorCrudo: null,
    refetch: vi.fn(),
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
    root.render(<CarteraCompleta />)
  })
}

const $ = (sel: string) => {
  const el = host.querySelector<HTMLElement>(sel)
  if (!el) throw new Error(`No está: ${sel}`)
  return el
}
const todos = (sel: string) => Array.from(host.querySelectorAll<HTMLElement>(sel))
const boton = (texto: string) => {
  const b = todos('button').find((x) => (x.textContent ?? '').trim() === texto)
  if (!b) throw new Error(`No hay botón «${texto}»`)
  return b
}
const clic = (el: HTMLElement) => act(() => el.click())
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  reportMock.mockReset()
  pushMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('CarteraCompleta', () => {
  it('🔴 la franja separa deuda, por vencer, vencido en plazo y cartera', () => {
    conReporte(reporte())
    montar()

    // La deuda entera: lo que el contrato dice que se debe.
    expect($('[data-testid="resumen-deuda-total"]').textContent).toContain(
      formatCurrency(8_000_000),
    )
    const porVencer = $('[data-testid="resumen-por_vencer"]').textContent ?? ''
    expect(porVencer).toContain(formatCurrency(2_000_000))
    expect(porVencer).toContain('Todavía no vence. Es deuda, no cartera.')
    const enPlazo = $('[data-testid="resumen-vencida_en_plazo"]').textContent ?? ''
    expect(enPlazo).toContain(formatCurrency(750_000))
    expect(enPlazo).toContain('el plazo del contrato sigue corriendo')
    // 🔴 La cartera es SÓLO lo que pasó el plazo: no los 8 millones.
    const cartera = $('[data-testid="resumen-cartera"]').textContent ?? ''
    expect(cartera).toContain(formatCurrency(5_250_000))
    expect(cartera).toContain('Es lo único que la cobranza persigue')
  })

  it('las fichas son la edad DE LA CARTERA, medida sobre la mora real', () => {
    conReporte(reporte())
    montar()

    expect($('[data-testid="tramo-0-30"]').textContent).toContain(formatCurrency(3_750_000))
    expect($('[data-testid="tramo-31-60"]').textContent).toContain(formatCurrency(500_000))
    expect($('[data-testid="tramo-90+"]').textContent).toContain('1 deuda')
    // Ni lo que no vence ni lo vencido en plazo entran a ningún tramo: su
    // plata suma $2.750.000 y ninguna ficha la muestra.
    const enFichas = todos('[data-testid^="tramo-"]')
      .map((f) => f.textContent ?? '')
      .join(' ')
    expect(enFichas).not.toContain(formatCurrency(2_000_000))
    expect(enFichas).not.toContain(formatCurrency(750_000))
  })

  it('LA tabla trae una fila por cuota, de los tres cajones', () => {
    conReporte(reporte())
    montar()

    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(5)
    expect(host.querySelector('[data-testid="sin-datos"]')).toBeNull()
  })

  it('una cifra de la franja filtra su cajón', () => {
    conReporte(reporte())
    montar()

    clic($('[data-testid="resumen-por_vencer"]'))
    let filas = todos('[data-testid="cartera-fila"]')
    expect(filas).toHaveLength(1)
    expect(filas[0].getAttribute('data-cajon')).toBe('POR_VENCER')
    expect($('[data-testid="que-significa"]').textContent).toContain('no cartera')

    clic($('[data-testid="resumen-cartera"]'))
    filas = todos('[data-testid="cartera-fila"]')
    expect(filas).toHaveLength(3)
    expect(filas.every((f) => f.getAttribute('data-cajon') === 'CARTERA')).toBe(true)

    // «Deuda total» quita los filtros: es «ver todo».
    clic($('[data-testid="resumen-deuda-total"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(5)
  })

  it('«Por propietario» agrupa en la misma tarjeta, y tocar uno abre sus deudas con el filtro a la vista', () => {
    conReporte(reporte())
    montar()

    clic(boton('Por propietario'))
    const filas = todos('[data-testid="propietario-fila"]')
    expect(filas).toHaveLength(3)
    // El que más debe arriba, con deudas e inmuebles contados aparte.
    expect(filas[0].textContent).toContain('Marta Cifuentes')
    expect(filas[0].textContent).toContain(formatCurrency(4_750_000))
    expect(filas[0].textContent).toContain('Más de 90 días')
    // Jorge no tiene cartera: lo peor que tiene es una cuota vencida en plazo.
    expect(filas[1].textContent).toContain('Vencido, en plazo')
    expect(filas[2].textContent).toContain('Sin propietario registrado')

    clic(filas[0])
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(2)
    expect($('[data-testid="chip-propietario"]').textContent).toContain('Marta Cifuentes')

    clic($('[data-testid="chip-propietario"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(5)
    expect(host.querySelector('[data-testid="chip-propietario"]')).toBeNull()
  })

  it('la fila sin propietario también se abre: filtra las deudas que no tienen dueño', () => {
    conReporte(reporte())
    montar()
    clic(boton('Por propietario'))
    clic(todos('[data-testid="propietario-fila"]')[2])
    const filas = todos('[data-testid="cartera-fila"]')
    expect(filas).toHaveLength(1)
    expect(filas[0].textContent).toContain('Carla Ruiz')
  })

  it('«En siniestro» es un segmento más de la misma tabla, y la cifra de la franja lo abre', () => {
    conReporte(reporte())
    montar()

    clic(boton('En siniestro · 1'))
    let filas = todos('[data-testid="siniestro-fila"]')
    expect(filas).toHaveLength(1)
    expect(filas[0].textContent).toContain('Pedro Quiroga')
    expect(filas[0].textContent).toContain('15 días')

    clic(boton('Por deuda'))
    expect(todos('[data-testid="siniestro-fila"]')).toHaveLength(0)
    clic($('[data-testid="resumen-en-siniestro"]'))
    filas = todos('[data-testid="siniestro-fila"]')
    expect(filas).toHaveLength(1)
    const franja = $('[data-testid="resumen-en-siniestro"]').textContent ?? ''
    expect(franja).toContain(formatCurrency(900_000))
    expect(franja).toContain('a los 45 días')
  })

  it('una ficha filtra el tramo y explica qué significa; tocarla de nuevo lo quita', () => {
    conReporte(reporte())
    montar()

    clic($('[data-testid="tramo-90+"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(1)
    expect($('[data-testid="tramo-90+"]').getAttribute('aria-pressed')).toBe('true')
    expect($('[data-testid="que-significa"]').textContent).toContain('jurídico')

    clic($('[data-testid="tramo-90+"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(5)
    expect(host.querySelector('[data-testid="que-significa"]')).toBeNull()
  })

  it('🔴 lo que el informe NO cuenta se muestra', () => {
    conReporte(
      reporte({
        contratosSinCuotas: 195,
        avisos: [
          '195 contrato(s) vigente(s) todavía no tienen tabla de amortización: su deuda NO está sumada acá.',
          '5 cuota(s) no tienen agente responsable.',
        ],
      }),
    )
    montar()

    const avisos = $('[data-testid="avisos-de-la-cartera"]').textContent ?? ''
    expect(avisos).toContain('195 contrato(s) vigente(s)')
    expect(avisos).toContain('agente responsable')
  })

  it('sin avisos no se pinta un recuadro vacío', () => {
    conReporte(reporte())
    montar()
    expect(host.querySelector('[data-testid="avisos-de-la-cartera"]')).toBeNull()
  })

  it('la búsqueda filtra, y sin resultados ofrece quitar los filtros — dentro de la tabla', () => {
    conReporte(reporte())
    montar()

    const input = $('[data-testid="buscar-cartera"]') as HTMLInputElement
    escribir(input, 'ana pérez')
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(1)

    escribir(input, 'zzz')
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(0)
    // Los encabezados siguen: el vacío vive en el cuerpo de la tabla.
    expect($('[data-testid="cartera-tabla"]').textContent).toContain('cartera.tabla.inquilino')
    expect($('[data-testid="sin-datos"]').getAttribute('data-caso')).toBe('filtros')

    clic($('[data-testid="limpiar-filtros"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(5)
    expect(input.value).toBe('')
  })

  it('una cartera sin deudas es una buena noticia, no un error ni un «sin resultados»', () => {
    conReporte(
      reporte({
        items: [],
        siniestros: { cantidad: 0, totalCop: 0, diasParaSiniestro: 30, items: [] },
      }),
    )
    montar()
    expect($('[data-testid="sin-datos"]').getAttribute('data-caso')).toBe('vacio')
    expect(host.textContent).toContain('Nadie te debe nada')
    expect(host.querySelector('[data-testid="limpiar-filtros"]')).toBeNull()
    expect($('[data-testid="resumen-en-siniestro"]').textContent).toContain('Ningún caso')
  })

  it('si el back falla se ve el fallo, no una cartera en $0', () => {
    conReporte(null, { error: 'Se cayó la red.', errorCrudo: new Error('Se cayó la red.') })
    montar()
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('la cartera: Se cayó la red.')
    expect(host.querySelector('[data-testid="resumen-de-cartera"]')).toBeNull()
  })

  it('🔴 sin cobro emitido, la fila lleva al CONTRATO y no a un cobro que no existe', () => {
    conReporte(reporte())
    montar()

    clic(todos('[data-testid="cartera-fila"]')[0])
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/contratos/ct-1')
  })

  it('con cobro emitido, la fila lleva al cobro', () => {
    conReporte(reporte({ items: [deuda({ cobroId: 'cob-9' })] }))
    montar()

    clic(todos('[data-testid="cartera-fila"]')[0])
    expect(pushMock).toHaveBeenCalledWith(
      '/panel/inmobiliaria/pagos/cartera/cobros?cobro=cob-9',
    )
  })
})
