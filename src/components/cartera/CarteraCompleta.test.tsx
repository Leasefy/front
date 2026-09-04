/**
 * La cartera completa después del glow-up (Nico, 2026-09-03): fichas por edad
 * que filtran, UNA franja de resumen, UNA tarjeta con la tabla de la casa y
 * el agrupador (Por deuda · Por propietario · En siniestro) en su barra.
 *
 * Lo que se protege:
 *  - los tres agrupadores muestran LA tabla, con sus filas, dentro de la
 *    misma tarjeta;
 *  - tocar un propietario abre sus deudas y deja el filtro a la vista;
 *  - los dos vacíos siguen siendo dos (con filtros → «Quitar los filtros»);
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
    cobroId: 'c1',
    consignacionId: 'cons1',
    propertyTitle: 'Apartamento 302',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López',
    tenantPhone: '3010082450',
    propietarioId: 'p1',
    propietarioName: 'Marta Cifuentes',
    agenteId: null,
    agenteName: null,
    month: '2026-08',
    dueDate: '2026-08-05',
    totalAmount: 3_750_000,
    paidAmount: 0,
    pendingAmount: 3_750_000,
    daysLate: 12,
    status: 'PENDING',
    remindersSent: 2,
    lastReminderDate: '2026-08-20',
    ...p,
  }
}

function reporte(over: Partial<CarteraReport> = {}): CarteraReport {
  return {
    generatedAt: '2026-09-03T10:00:00Z',
    items: [
      deuda(),
      deuda({ cobroId: 'c2', consignacionId: 'cons2', tenantName: 'Ana Pérez', daysLate: 95, pendingAmount: 1_000_000 }),
      deuda({ cobroId: 'c3', consignacionId: 'cons3', tenantName: 'Luis Gómez', propietarioId: 'p2', propietarioName: 'Jorge Restrepo', daysLate: 0, pendingAmount: 2_000_000 }),
      deuda({ cobroId: 'c4', consignacionId: 'cons4', tenantName: 'Carla Ruiz', propietarioId: null, propietarioName: null, daysLate: 40, pendingAmount: 500_000 }),
    ],
    summary: { totalPending: 7_250_000, bucket0to30: 5_750_000, bucket31to60: 500_000, bucket61to90: 0, bucket90plus: 1_000_000 },
    siniestros: {
      cantidad: 1,
      totalCop: 900_000,
      diasParaSiniestro: 45,
      items: [
        {
          ...deuda({ cobroId: 's1', tenantName: 'Pedro Quiroga', daysLate: 60, pendingAmount: 900_000, status: 'DEFAULTED' }),
          siniestroAt: '2026-08-19',
          diasEnSiniestro: 15,
        },
      ],
    },
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
  it('fichas por edad, UNA franja de resumen y LA tabla con una fila por deuda', () => {
    conReporte(reporte())
    montar()

    expect($('[data-testid="tramo-1-30"]').textContent).toContain(formatCurrency(3_750_000))
    expect($('[data-testid="tramo-90+"]').textContent).toContain('1 deuda')
    expect($('[data-testid="tramo-por_vencer"]').textContent).toContain(formatCurrency(2_000_000))

    const mora = $('[data-testid="resumen-en-mora"]').textContent ?? ''
    expect(mora).toContain(formatCurrency(5_250_000))
    expect(mora).toContain('3 deudas vencidas')
    expect($('[data-testid="resumen-por-vencer"]').textContent).toContain('Todavía no es mora')
    const siniestro = $('[data-testid="resumen-en-siniestro"]').textContent ?? ''
    expect(siniestro).toContain(formatCurrency(900_000))
    expect(siniestro).toContain('1 caso')
    expect(siniestro).toContain('a los 45 días')
    expect($('[data-testid="resumen-total"]').textContent).toContain(formatCurrency(7_250_000))

    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(4)
    expect(host.querySelector('[data-testid="sin-datos"]')).toBeNull()
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
    expect(filas[2].textContent).toContain('Sin propietario registrado')

    clic(filas[0])
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(2)
    expect($('[data-testid="chip-propietario"]').textContent).toContain('Marta Cifuentes')

    clic($('[data-testid="chip-propietario"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(4)
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
  })

  it('una ficha filtra el tramo y explica qué significa; tocarla de nuevo lo quita', () => {
    conReporte(reporte())
    montar()

    clic($('[data-testid="tramo-90+"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(1)
    expect($('[data-testid="tramo-90+"]').getAttribute('aria-pressed')).toBe('true')
    expect($('[data-testid="que-significa"]').textContent).toContain('jurídico')

    clic($('[data-testid="tramo-90+"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(4)
    expect(host.querySelector('[data-testid="que-significa"]')).toBeNull()
  })

  it('la búsqueda filtra, y sin resultados ofrece quitar los filtros — dentro de la tabla', () => {
    conReporte(reporte())
    montar()

    const input = $('[data-testid="buscar-cartera"]') as HTMLInputElement
    escribir(input, 'ana')
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(1)

    escribir(input, 'zzz')
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(0)
    // Los encabezados siguen: el vacío vive en el cuerpo de la tabla.
    expect($('[data-testid="cartera-tabla"]').textContent).toContain('cartera.tabla.inquilino')
    expect($('[data-testid="sin-datos"]').getAttribute('data-caso')).toBe('filtros')

    clic($('[data-testid="limpiar-filtros"]'))
    expect(todos('[data-testid="cartera-fila"]')).toHaveLength(4)
    expect(input.value).toBe('')
  })

  it('una cartera sin deudas es una buena noticia, no un error ni un «sin resultados»', () => {
    conReporte(reporte({ items: [], siniestros: { cantidad: 0, totalCop: 0, diasParaSiniestro: 30, items: [] } }))
    montar()
    expect($('[data-testid="sin-datos"]').getAttribute('data-caso')).toBe('vacio')
    expect(host.textContent).toContain('Nadie te debe nada')
    expect(host.querySelector('[data-testid="limpiar-filtros"]')).toBeNull()
    expect($('[data-testid="resumen-en-siniestro"]').textContent).toContain('Ningún caso')
  })

  it('un back viejo sin `siniestros` no pinta ni el segmento ni la cifra', () => {
    conReporte(reporte({ siniestros: undefined }))
    montar()
    expect(host.querySelector('[data-testid="resumen-en-siniestro"]')).toBeNull()
    expect(todos('button').some((b) => (b.textContent ?? '').startsWith('En siniestro'))).toBe(false)
  })

  it('si el back falla se ve el fallo, no una cartera en $0', () => {
    conReporte(null, { error: 'Se cayó la red.', errorCrudo: new Error('Se cayó la red.') })
    montar()
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('la cartera: Se cayó la red.')
    expect(host.querySelector('[data-testid="resumen-de-cartera"]')).toBeNull()
  })
})
