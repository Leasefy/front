/**
 * Los cobros del contrato en su ficha.
 *
 * Nico (2026-09-02): «que pueda ver los cobros que ha tenido ese contrato,
 * factura de ese contrato». Cada fila es un período; abierta, muestra el
 * desglose (canon, conceptos, IVA, retenciones, mora), los recibos y el enlace
 * a la cuenta de cobro imprimible.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { cobros: vi.fn() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/components/inmobiliaria/DesgloseAdeudado', () => ({
  DesgloseAdeudado: ({ conceptos }: { conceptos?: { nombre: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'desglose' },
      (conceptos ?? []).map((c) => c.nombre).join(' | '),
    ),
}))
vi.mock('@/components/inmobiliaria/RecibosDeCajaHistorial', () => ({
  RecibosDeCajaHistorial: ({ recibos }: { recibos: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'recibos' }, `${recibos.length} recibos`),
}))

import { contractsApi } from '@/lib/api/contracts.service'
import { CobrosDelContrato } from './CobrosDelContrato'
import type { Contract } from '@/lib/types/contract'
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types'

const cobrosMock = contractsApi.cobros as unknown as ReturnType<typeof vi.fn>

function contrato(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    propertyId: 'p-1',
    status: 'active',
    ...overrides,
  } as Contract
}

function cobro(overrides: Partial<CobroConDesglose> = {}): CobroConDesglose {
  return {
    id: 'cb-1',
    month: '2026-09',
    dueDate: '2026-09-05T00:00:00.000Z',
    status: 'pending',
    rentAmount: 2_100_000,
    adminAmount: 180_000,
    totalAmount: 2_280_000,
    lateFee: 0,
    totalWithFees: 2_280_000,
    paidAmount: 0,
    pendingAmount: 2_280_000,
    conceptos: [
      { id: 'l1', tipo: 'CANON', nombre: 'Canon', valorCop: 2_100_000, resta: false, reglaId: null, orden: 0 },
      { id: 'l2', tipo: 'CONCEPTO_DEL_CONTRATO', nombre: 'Parqueadero', valorCop: 180_000, resta: false, reglaId: null, orden: 1 },
    ],
    recibosDeCaja: [],
    ...overrides,
  } as CobroConDesglose
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  cobrosMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(c: Contract) {
  await act(async () => {
    root.render(<CobrosDelContrato contract={c} />)
  })
}

describe('<CobrosDelContrato>', () => {
  it('lista los períodos con total, pagado, saldo y estado', async () => {
    cobrosMock.mockResolvedValue([
      cobro(),
      cobro({ id: 'cb-0', month: '2026-08', status: 'paid', paidAmount: 2_280_000, pendingAmount: 0 }),
    ])
    await render(contrato())

    const filas = container.querySelectorAll('tbody tr')
    expect(filas.length).toBe(2)
    expect(container.textContent).toContain('Septiembre de 2026')
    expect(container.textContent).toContain('Agosto de 2026')
    // El DATE viaja como medianoche UTC; en Bogotá sigue siendo el 5, no el 4.
    expect(container.textContent).toContain('5 sept 2026')
    expect(container.textContent).toContain('Pendiente')
    expect(container.textContent).toContain('Pagado')
    // El resumen del encabezado: cuántos períodos y cuánto se debe.
    expect(container.querySelector('[data-testid="cobros-resumen"]')?.textContent).toContain('2 períodos')
    expect(container.querySelector('[data-testid="cobros-resumen"]')?.textContent).toContain('saldo')
  })

  it('abrir una fila muestra el desglose, los recibos y el enlace a la cuenta de cobro', async () => {
    cobrosMock.mockResolvedValue([cobro()])
    await render(contrato())

    expect(container.querySelector('[data-testid="desglose"]')).toBeNull()
    const fila = container.querySelector<HTMLTableRowElement>('[data-testid="cobro-2026-09"]')!
    act(() => fila.click())

    expect(container.querySelector('[data-testid="desglose"]')?.textContent).toBe('Canon | Parqueadero')
    expect(container.querySelector('[data-testid="recibos"]')?.textContent).toBe('0 recibos')
    const enlace = container.querySelector<HTMLAnchorElement>('[data-testid="cuenta-de-cobro-2026-09"]')!
    expect(enlace.getAttribute('href')).toContain('/panel/inmobiliaria/cobros/cb-1/cuenta-de-cobro')
    // Vuelve a la ficha del contrato, no a Cobros.
    expect(decodeURIComponent(enlace.getAttribute('href')!)).toContain('volver=/panel/inmobiliaria/contratos/c-1')
  })

  it('sin inmueble, explica por qué no hay cobros y a dónde ir', async () => {
    cobrosMock.mockResolvedValue([])
    await render(contrato({ propertyId: null }))

    expect(container.querySelector('[data-testid="cobros-vacio"]')?.textContent).toContain(
      'Sin inmueble vinculado no hay cobros',
    )
  })

  it('con inmueble y sin cobros, dice que todavía no se generó ninguno', async () => {
    cobrosMock.mockResolvedValue([])
    await render(contrato())

    expect(container.querySelector('[data-testid="cobros-vacio"]')?.textContent).toContain(
      'Todavía no se generó ningún cobro',
    )
  })

  it('un fallo NO se pinta como «sin cobros»: se dice y se puede reintentar', async () => {
    cobrosMock.mockRejectedValueOnce(new Error('Se cayó el back'))
    await render(contrato())

    expect(container.textContent).toContain('Se cayó el back')
    expect(container.querySelector('[data-testid="cobros-vacio"]')).toBeNull()

    cobrosMock.mockResolvedValueOnce([cobro()])
    const reintentar = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )!
    await act(async () => {
      reintentar.click()
    })
    expect(container.textContent).toContain('Septiembre de 2026')
  })
})
