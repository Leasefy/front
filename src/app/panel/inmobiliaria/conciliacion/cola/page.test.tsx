/**
 * «Por revisar» — la cola de conciliación, con los hooks mockeados.
 *
 * Lo que se prueba es lo que Nico pidió mirando la pantalla: que sea LA tabla
 * del panel (encabezados visibles incluso vacía, filtros dentro de la misma
 * tarjeta, pie con paginación) y que cada fila tenga sus dos acciones reales
 * — aprobar, que llama a `confirm`, y rechazar, que pide motivo antes de
 * llamar a `reject`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { ConciliacionQueueItem } from '@/lib/hooks/conciliacion/use-conciliacion-queue'

const { cola, bulk } = vi.hoisted(() => ({
  cola: {
    items: [] as ConciliacionQueueItem[],
    total: 0,
    isLoading: false,
    error: null as string | null,
    refetch: vi.fn(async () => undefined),
    confirmMatch: vi.fn(async () => ({ ok: true })),
    rejectMatch: vi.fn(async () => ({ ok: true })),
    reverseMatch: vi.fn(async () => ({ ok: true })),
    ingestStatement: vi.fn(async () => ({ ok: true })),
    summary: {
      total: 0,
      conciliados: 0,
      parciales: 0,
      duplicados: 0,
      noIdentificados: 0,
      diferencias: 0,
      fueraDeFecha: 0,
    },
  },
  bulk: { bulkConfirmByIds: vi.fn(async () => ({ ok: true, confirmados: 0, fallidos: [] })) },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-queue', () => ({
  useConciliacionQueue: () => cola,
}))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-bulk', () => ({
  useConciliacionBulk: () => bulk,
  BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR: 0.9,
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import ConciliacionColaPage from './page'

function item(sobre: Partial<ConciliacionQueueItem> = {}): ConciliacionQueueItem {
  return {
    id: 'q-1',
    tenantId: 't-1',
    movementId: 'mov-1',
    domain: 'Contrato 111',
    matchedAmountCop: 900_000,
    confidenceScore: 0.72,
    matchLayer: 'fuzzy_amount',
    status: 'suggested',
    reason: null,
    decidedBy: null,
    decidedAt: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    caseType: 'parcial',
    movement: {
      id: 'mov-1',
      amountCop: 1_800_000,
      description: 'TRANSFERENCIA PEREZ GOMEZ',
      reference: '0009812',
      valueDate: '2026-09-01T00:00:00.000Z',
      status: 'unmatched',
      source: 'bancolombia_csv',
    },
    ...sobre,
  }
}

let root: Root | null = null

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function montar() {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  await act(async () => {
    root!.render(<ConciliacionColaPage />)
  })
  await esperar()
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`No se encontró ${selector}`)
  return el
}

function botonConTexto(texto: string, dentro: ParentNode = document): HTMLButtonElement {
  const b = Array.from(dentro.querySelectorAll('button')).find((x) =>
    (x.textContent ?? '').includes(texto),
  )
  if (!b) throw new Error(`No hay botón con «${texto}»`)
  return b
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
  })
  await esperar()
}

beforeEach(() => {
  cola.items = []
  cola.total = 0
  cola.isLoading = false
  cola.error = null
  cola.confirmMatch.mockClear()
  cola.rejectMatch.mockClear()
})

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount()
    })
  }
  root = null
  document.body.innerHTML = ''
})

describe('Por revisar — la tabla', () => {
  it('vacía: el vacío va DENTRO del cuerpo, con los encabezados a la vista', async () => {
    await montar()
    expect(document.querySelectorAll('table thead th').length).toBe(7)
    expect($('[data-testid="sin-datos"]').closest('td')).not.toBeNull()
    // Sin filas no hay pie: el vacío ya lo dice.
    expect(document.body.textContent).not.toContain('Mostrando')
  })

  it('con filas pinta el movimiento, su tipo, la sugerencia y el pie de paginación', async () => {
    cola.items = [item()]
    cola.total = 1
    await montar()
    const fila = $('[data-testid="conciliacion-row-q-1"]')
    expect(fila.textContent).toContain('TRANSFERENCIA PEREZ GOMEZ')
    expect(fila.textContent).toContain('Ref. 0009812')
    expect(fila.textContent).toContain('Pago parcial')
    expect(fila.textContent).toContain('Contrato 111')
    expect(fila.textContent).toContain('72% de confianza')
    // El pie del design system se monta siempre que haya filas.
    expect(document.body.textContent).toContain('Mostrando 1–1 de 1')
  })

  it('«Aprobar» llama a confirm con el id de la fila', async () => {
    cola.items = [item()]
    cola.total = 1
    await montar()
    await clic(botonConTexto('Aprobar', $('[data-testid="conciliacion-row-q-1"]')))
    expect(cola.confirmMatch).toHaveBeenCalledWith('q-1')
  })

  it('«Rechazar» no manda nada hasta que hay un motivo de 5+ caracteres', async () => {
    cola.items = [item()]
    cola.total = 1
    await montar()
    await clic(botonConTexto('Rechazar', $('[data-testid="conciliacion-row-q-1"]')))
    expect(cola.rejectMatch).not.toHaveBeenCalled()

    const confirmar = $('[data-testid="conciliacion-confirmar-rechazo"]') as HTMLButtonElement
    expect(confirmar.disabled).toBe(true)

    const area = $('#motivo-rechazo') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(area, 'No es el pago de ese contrato.')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await esperar()

    await clic($('[data-testid="conciliacion-confirmar-rechazo"]'))
    expect(cola.rejectMatch).toHaveBeenCalledWith('q-1', 'No es el pago de ese contrato.')
  })

  it('un fallo del servicio no se pinta como «no hay nada»', async () => {
    cola.error = '500'
    await montar()
    // Nada de vacío: el vacío afirmaría que la cola está limpia, y no lo sabemos.
    expect(document.querySelector('[data-testid="sin-datos"]')).toBeNull()
    expect(document.body.textContent).toContain('No pudimos cargar esto')
    expect(document.body.textContent).toContain('Intentar de nuevo')
  })
})
