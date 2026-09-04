/**
 * El cajón del inquilino. Nico (2026-09-03): «al dar clic se abra un drawer y
 * muestre todo el detalle del inquilino… pagos, etc.»
 *
 * Lo que se protege acá es que el cajón no MIENTA:
 *   - un saldo que no llegó se muestra «—», nunca «$0» (que se lee «al día»);
 *   - la mora y los recordatorios salen del cobro, no de una cuenta propia;
 *   - cuando falta el detalle de un contrato se dice, en vez de sumar a medias;
 *   - los arriendos terminados también aparecen.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Inquilino, ArriendoDeInquilino } from '@/lib/api/inquilinos.service'
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types'
import type { DetalleDeInquilino } from '@/lib/hooks/use-inquilino-detalle'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
    locale: 'es',
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { CuerpoDelCajon, resumirPagos } from './InquilinoDrawer'

function arriendo(p: Partial<ArriendoDeInquilino> = {}): ArriendoDeInquilino {
  return {
    leaseId: 'l1',
    contractId: 'c1',
    estado: 'ACTIVE',
    desde: '2025-09-04',
    hasta: '2026-09-04',
    canonCop: 3_750_000,
    inmueble: { id: 'i1', title: 'Apto', address: 'Carrera 30a #25A-20', city: 'Bogotá' },
    ...p,
  }
}

function persona(p: Partial<Inquilino> = {}): Inquilino {
  return {
    tenantId: 't1',
    nombre: 'Esteban López Quintero',
    email: 'esteban.lopez@example.com',
    telefono: '3010082450',
    documento: '1020304050',
    arriendos: [arriendo()],
    ...p,
  }
}

function cobro(p: Partial<CobroConDesglose> = {}): CobroConDesglose {
  return {
    id: 'co1',
    leaseId: 'l1',
    consignacionId: 'cs1',
    propertyId: 'i1',
    propietarioId: 'p1',
    tenantId: 't1',
    agenteId: 'a1',
    propertyTitle: 'Apto',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López Quintero',
    tenantEmail: 'esteban.lopez@example.com',
    tenantPhone: '3010082450',
    month: '2026-08',
    rentAmount: 3_750_000,
    adminAmount: 0,
    totalAmount: 3_750_000,
    lateFee: 0,
    totalWithFees: 3_750_000,
    status: 'paid',
    dueDate: '2026-08-05',
    paidDate: '2026-08-03',
    paidAmount: 3_750_000,
    pendingAmount: 0,
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-03',
    ...p,
  }
}

function detalle(p: Partial<DetalleDeInquilino> = {}): DetalleDeInquilino {
  return {
    persona: persona(),
    cargandoArriendos: false,
    arriendosIncompletos: false,
    cobros: [],
    cargandoPagos: false,
    errorPagos: false,
    pagosIncompletos: false,
    reintentar: vi.fn(),
    ...p,
  }
}

// Los tests de la función pura no montan nada: el desmontaje lo tolera.
let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  root = undefined
  container = undefined
})

function montar(d: DetalleDeInquilino) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(<CuerpoDelCajon detalle={d} />)
  })
}

const texto = () => container!.textContent ?? ''

describe('resumirPagos', () => {
  it('suma el saldo, cuenta la mora y se queda con el atraso MAYOR', () => {
    const r = resumirPagos([
      cobro({ id: 'a', status: 'late', pendingAmount: 1_000_000, daysLate: 12 }),
      cobro({ id: 'b', status: 'defaulted', pendingAmount: 2_000_000, daysLate: 95 }),
      cobro({ id: 'c', status: 'paid', pendingAmount: 0, daysLate: 0 }),
    ])
    expect(r.saldoPendiente).toBe(3_000_000)
    // `late` y `defaulted` son los dos estados de mora, como en el panel de cobros.
    expect(r.enMora).toBe(2)
    // El que importa es el más viejo sin pagar, no el promedio ni el último.
    expect(r.diasDeMora).toBe(95)
  })

  it('el último pago y el último recordatorio son los MÁS RECIENTES, no el último de la lista', () => {
    const r = resumirPagos([
      cobro({ id: 'a', paidDate: '2026-08-03', remindersSent: 2, lastReminderDate: '2026-08-01' }),
      cobro({ id: 'b', paidDate: '2026-06-02', remindersSent: 1, lastReminderDate: '2026-06-01' }),
    ])
    expect(r.ultimoPago).toBe('2026-08-03')
    expect(r.recordatorios).toBe(3)
    expect(r.ultimoRecordatorio).toBe('2026-08-01')
  })

  it('sin cobros no inventa nada', () => {
    expect(resumirPagos([])).toEqual({
      saldoPendiente: 0,
      enMora: 0,
      diasDeMora: 0,
      ultimoPago: null,
      recordatorios: 0,
      ultimoRecordatorio: null,
    })
  })
})

describe('<CuerpoDelCajon>', () => {
  it('la cabecera trae nombre, correo y teléfono', () => {
    montar(detalle())
    expect(texto()).toContain('Esteban López Quintero')
    expect(texto()).toContain('esteban.lopez@example.com')
    expect(texto()).toContain('3010082450')
  })

  it('sin correo ni teléfono lo dice en la cabecera: es a quién no se le puede cobrar', () => {
    montar(detalle({ persona: persona({ email: null, telefono: null }) }))
    expect(texto()).toContain('inquilinos.sinContacto')
  })

  it('muestra TODOS los arriendos, también los terminados, con enlace a su contrato', () => {
    montar(
      detalle({
        persona: persona({
          arriendos: [
            arriendo({ leaseId: 'vivo', contractId: 'c-vivo' }),
            arriendo({
              leaseId: 'viejo',
              contractId: 'c-viejo',
              estado: 'ENDED',
              inmueble: { id: 'i2', title: 'Casa', address: 'Calle 80 #10-20', city: 'Cali' },
            }),
          ],
        }),
      }),
    )
    expect(texto()).toContain('inquilinos.cajon.arriendos:2')
    expect(texto()).toContain('Carrera 30a #25A-20')
    expect(texto()).toContain('Calle 80 #10-20')
    expect(texto()).toContain('inquilinos.estados.terminado')
    const enlaces = Array.from(container!.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(enlaces).toContain('/panel/inmobiliaria/contratos/c-vivo')
    expect(enlaces).toContain('/panel/inmobiliaria/contratos/c-viejo')
  })

  it('pinta los cobros con su estado, su mora y lo que se debe', () => {
    montar(
      detalle({
        cobros: [
          cobro({ id: 'a', month: '2026-08', status: 'late', pendingAmount: 1_200_000, daysLate: 12, paidDate: undefined, totalWithFees: 3_900_000 }),
          cobro({ id: 'b', month: '2026-07' }),
        ],
      }),
    )
    const pagos = container!.querySelector('[data-testid="inquilino-cajon-pagos"]')!.textContent ?? ''
    expect(pagos).toContain('inmobiliaria.cobros.status.late')
    expect(pagos).toContain('inmobiliaria.cobros.status.paid')
    expect(pagos).toContain('inquilinos.cajon.diasDeMora:12')
    expect(pagos).toContain('inquilinos.cajon.debe:$1.200.000')
    // El total incluye la mora ya causada, no el canon pelado.
    expect(pagos).toContain('$3.900.000')
  })

  it('🔴 con los pagos sin llegar el saldo es «—», nunca $0 — un cero se lee «al día»', () => {
    montar(detalle({ cargandoPagos: true }))
    expect(texto()).toContain('inquilinos.cajon.saldoPendiente')
    expect(texto()).toContain('—')
    expect(texto()).not.toContain('inquilinos.cajon.saldoPendiente$0')

    // Y con el pedido caído, tampoco.
    act(() => root!.render(<CuerpoDelCajon detalle={detalle({ errorPagos: true })} />))
    expect(texto()).toContain('inquilinos.cajon.errorPagos')
    expect(texto()).toContain('—')
  })

  it('el error de pagos ofrece reintentar, y reintentar llama al hook', () => {
    const reintentar = vi.fn()
    montar(detalle({ errorPagos: true, reintentar }))
    const boton = Array.from(container!.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('inquilinos.cajon.reintentar'),
    )
    expect(boton).toBeDefined()
    act(() => boton!.click())
    expect(reintentar).toHaveBeenCalledTimes(1)
  })

  it('si un contrato no contestó, lo dice en vez de dejar creer que ése es todo el saldo', () => {
    montar(detalle({ cobros: [cobro()], pagosIncompletos: true }))
    expect(texto()).toContain('inquilinos.cajon.pagosIncompletos')
  })

  it('si el detalle de la persona falló, avisa que puede faltar un arriendo terminado', () => {
    montar(detalle({ arriendosIncompletos: true }))
    expect(texto()).toContain('inquilinos.cajon.arriendosIncompletos')
  })

  it('sin cobros distingue «no tiene contratos» de «no hay cobros todavía»', () => {
    montar(detalle())
    expect(texto()).toContain('inquilinos.cajon.sinPagos')

    act(() =>
      root!.render(
        <CuerpoDelCajon detalle={detalle({ persona: persona({ arriendos: [] }) })} />,
      ),
    )
    expect(texto()).toContain('inquilinos.cajon.sinContratos')
  })

  it('con más cobros de los que caben, dice cuántos quedaron y enlaza al contrato', () => {
    const muchos = Array.from({ length: 15 }, (_, i) =>
      cobro({ id: `co${i}`, month: `2026-${String(12 - (i % 12)).padStart(2, '0')}` }),
    )
    montar(detalle({ cobros: muchos }))
    expect(texto()).toContain('inquilinos.cajon.yMasCobros:3')
    expect(texto()).toContain('inquilinos.cajon.verCobrosDelContrato')
  })
})
