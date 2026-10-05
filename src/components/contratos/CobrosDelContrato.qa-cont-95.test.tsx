/**
 * QA-CONT-95 (B-40): los cobros ANTERIORES a la fecha de cartera no son deuda.
 * (Arnés copiado de `CobrosDelContrato.test.tsx`.)
 *
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
import { ApiError } from '@/lib/api/client'
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

describe('QA-CONT-95 · B-40 cobros anteriores a la cartera', () => {
  it('🔴 junio y julio sin cuota (anteriores a la cartera) no suman saldo ni dicen «Pendiente»', async () => {
    cobrosMock.mockResolvedValue([
      cobro({ id: 'oct', month: '2026-10', status: 'paid', paidAmount: 2_350_000, pendingAmount: 0 }),
      cobro({ id: 'jul', month: '2026-07', status: 'pending', paidAmount: 0, pendingAmount: 2_350_000, anteriorALaCartera: true }),
      cobro({ id: 'jun', month: '2026-06', status: 'pending', paidAmount: 0, pendingAmount: 2_350_000, anteriorALaCartera: true }),
    ])
    await render(contrato())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('saldo $')
    expect(texto).toContain('Antes de la cartera: no es deuda')
    expect(texto).not.toMatch(/Pendiente/)
  })
})

describe('QA-CONT-95 · I-09 la fila de cobro no lleva aria-expanded', () => {
  it('🔴 aria-expanded va en el botón del período (axe aria-conditional-attr), y abre', async () => {
    cobrosMock.mockResolvedValue([cobro({ id: 'oct', month: '2026-10', status: 'paid', paidAmount: 2_350_000, pendingAmount: 0 })])
    await render(contrato())
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    const fila = container.querySelector('[data-testid="cobro-2026-10"]')!
    expect(fila.hasAttribute('aria-expanded')).toBe(false)
    const boton = container.querySelector('[data-testid="abrir-cobro-2026-10"]') as HTMLButtonElement
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    await act(async () => { boton.click() })
    expect(boton.getAttribute('aria-expanded')).toBe('true')
  })
})
