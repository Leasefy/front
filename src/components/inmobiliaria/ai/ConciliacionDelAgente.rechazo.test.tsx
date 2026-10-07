/**
 * Rechazar un cruce del agente de conciliación (02-10-2026).
 *
 * El diálogo se cerraba al apretar «Rechazar», ANTES de mandar: si el micro
 * decía que no, el motivo escrito se perdía y el error quedaba en un toast.
 * Ahora el diálogo se queda abierto —con el botón ocupado— hasta que el back
 * confirme; si falla, el motivo sigue ahí y el error se ve: bajo el motivo si
 * es de ese campo, y si no, la frase del traductor.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toasts, cola } = vi.hoisted(() => ({
  toasts: { ok: [] as string[], error: [] as string[] },
  cola: { rejectMatch: null as null | ((id: string, reason: string) => Promise<unknown>) },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.ok.push(m),
    error: (m: string) => toasts.error.push(m),
  },
}))

const ITEM = {
  id: 'm-1',
  tenantId: 'a',
  movementId: 'mv-1',
  domain: 'Contrato 1686',
  matchedAmountCop: 1_250_000,
  confidenceScore: 0.92,
  matchLayer: 'reference_exact',
  status: 'suggested' as const,
  reason: null,
  decidedBy: null,
  decidedAt: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  movement: {
    id: 'mv-1',
    amountCop: 1_250_000,
    description: 'Transferencia',
    reference: 'REF-1',
    valueDate: '2026-10-01',
    status: 'unmatched',
    source: 'bancolombia_csv',
  },
}

vi.mock('@/lib/hooks/conciliacion/use-conciliacion-queue', () => ({
  useConciliacionQueue: () => ({
    items: [ITEM],
    summary: { total: 1, conciliados: 0, parciales: 0, duplicados: 0, noIdentificados: 0, diferencias: 0, fueraDeFecha: 0 },
    total: 1,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    confirmMatch: vi.fn(),
    rejectMatch: (id: string, reason: string) => cola.rejectMatch!(id, reason),
    reverseMatch: vi.fn(),
    ingestStatement: vi.fn(),
  }),
}))

import { ConciliacionDelAgente } from './ConciliacionDelAgente'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  toasts.ok = []
  toasts.error = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<ConciliacionDelAgente />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const dialogo = () => document.body.querySelector('[role="dialog"]') as HTMLElement | null
const motivo = () => dialogo()?.querySelector('textarea') as HTMLTextAreaElement
/** El «Rechazar» del pie del diálogo (por su texto: el de la fila vive afuera). */
const confirmar = () =>
  Array.from(dialogo()!.querySelectorAll('button')).find((b) => (b.textContent ?? '').trim() === 'Rechazar') as HTMLButtonElement

async function abrirYEscribir(texto: string) {
  const rechazar = Array.from(container.querySelectorAll('button')).find(
    (b) => b.getAttribute('aria-label') === 'Rechazar',
  ) as HTMLButtonElement
  act(() => rechazar.click())
  expect(dialogo()).not.toBeNull()
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(motivo(), texto)
    motivo().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const unCuadro = () => act(async () => { await new Promise((r) => setTimeout(r, 40)) })

describe('ConciliacionDelAgente — rechazar un cruce', () => {
  it('🔴 mientras va, el diálogo sigue abierto y el botón ocupado; al confirmar el back, se cierra', async () => {
    let responder: (r: unknown) => void = () => {}
    cola.rejectMatch = vi.fn(() => new Promise((r) => { responder = r }))
    await abrirYEscribir('No es de este contrato')

    await act(async () => confirmar().click())
    expect(cola.rejectMatch).toHaveBeenCalledWith('m-1', 'No es de este contrato')
    // Todavía no contestó: abierto, con lo escrito y ocupado.
    expect(dialogo()).not.toBeNull()
    expect(motivo().value).toBe('No es de este contrato')
    expect(confirmar().disabled).toBe(true)
    expect(confirmar().getAttribute('aria-busy')).toBe('true')

    await act(async () => { responder({ ok: true }) })
    await unCuadro()
    expect(toasts.ok).toEqual(['Movimiento rechazado.'])
    expect(dialogo()?.getAttribute('data-state') ?? 'closed').toBe('closed')
  })

  it('🔴 si el back dice que no por el motivo, el error va BAJO el motivo y lo escrito se queda', async () => {
    cola.rejectMatch = vi.fn(async () => ({
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['Escribe el motivo del rechazo.'],
          campos: [{ campo: 'reason', regla: 'requerido', mensaje: 'Escribe el motivo del rechazo.' }],
        }),
      }),
    }))
    await abrirYEscribir('x')
    await act(async () => confirmar().click())
    await unCuadro()

    expect(dialogo()).not.toBeNull()
    expect(motivo().value).toBe('x')
    expect(dialogo()!.querySelector('#rechazo-del-cruce-motivo-error')?.textContent).toContain('Escribe el motivo del rechazo.')
    expect(motivo().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(motivo())
    expect(confirmar().disabled).toBe(false)
    expect(toasts.ok).toEqual([])
  })

  it('🔴 si falla por otra cosa (un 409), el diálogo lo dice con las palabras del back y no se cierra', async () => {
    cola.rejectMatch = vi.fn(async () => ({
      ok: false,
      error: 'already_decided',
      fallo: await falloDelMicro({
        status: 409,
        json: async () => ({ code: 'MATCH_YA_DECIDIDO', message: 'Otra persona ya decidió este cruce.' }),
      }),
    }))
    await abrirYEscribir('No corresponde')
    await act(async () => confirmar().click())

    expect(dialogo()).not.toBeNull()
    expect(motivo().value).toBe('No corresponde')
    expect(dialogo()!.querySelector('[data-testid="rechazo-del-cruce-error"]')?.textContent).toBe(
      'Otra persona ya decidió este cruce.',
    )
  })

  it('un 5xx dice «de nuestro lado» con la referencia; la red, la conexión', async () => {
    cola.rejectMatch = vi.fn(async () => ({
      ok: false,
      fallo: await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: 'feed0042-cccc' }) }),
    }))
    await abrirYEscribir('No corresponde')
    await act(async () => confirmar().click())
    const aviso = dialogo()!.querySelector('[data-testid="rechazo-del-cruce-error"]')?.textContent ?? ''
    expect(aviso).toContain('No pudimos rechazar el cruce: algo falló de nuestro lado')
    expect(aviso).toContain('feed0042')

    cola.rejectMatch = vi.fn(async () => ({ ok: false, error: 'Failed to fetch', fallo: new TypeError('Failed to fetch') }))
    await act(async () => confirmar().click())
    expect(dialogo()!.querySelector('[data-testid="rechazo-del-cruce-error"]')?.textContent).toMatch(/conexión/)
    expect(motivo().value).toBe('No corresponde')
  })
})
