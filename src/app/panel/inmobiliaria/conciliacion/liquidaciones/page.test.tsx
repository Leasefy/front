/**
 * Generar y aprobar una liquidación, cuando no sale (tanda 2 de errores,
 * 02-10-2026). Antes: «No se pudo generar la liquidación (403).», y una cifra
 * de once dígitos viajaba al micro, que la guardaba en una columna `Int` y
 * respondía un 500.
 *
 *  · lo que la columna no aguanta se ataja ANTES de enviar, en su campo;
 *  · un 400 con `campos` va a su campo, con el foco, sin toast;
 *  · un 5xx dice «de nuestro lado» con la referencia;
 *  · un pedido que ni salió habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { liq, toasts } = vi.hoisted(() => ({
  liq: {
    generateSettlement: vi.fn(
      async (_input: unknown): Promise<{ ok: boolean; error?: string; fallo?: unknown }> => ({ ok: true }),
    ),
    approveSettlement: vi.fn(async (): Promise<{ ok: boolean; error?: string; fallo?: unknown }> => ({ ok: true })),
  },
  toasts: { ok: [] as string[], error: [] as string[] },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-settlements', () => ({
  useConciliacionSettlements: () => ({
    items: [],
    total: 0,
    isLoading: false,
    error: null,
    refetch: async () => {},
    generateSettlement: liq.generateSettlement,
    approveSettlement: liq.approveSettlement,
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.ok.push(m),
    error: (m: string) => toasts.error.push(m),
  },
}))

import ConciliacionLiquidacionesPage from './page'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

let host: HTMLDivElement
let root: Root

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(async () => {
  liq.generateSettlement.mockReset().mockResolvedValue({ ok: true })
  toasts.ok = []
  toasts.error = []
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<ConciliacionLiquidacionesPage />)
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => {
  const el = document.querySelector<T>(sel)
  if (!el) throw new Error(`No se encontró ${sel}`)
  return el
}

async function escribir(id: string, valor: string) {
  const el = $<HTMLInputElement>(`#${id}`)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return el
}

async function abrirYLlenar(canon: string) {
  await act(async () => $('[data-testid="liquidacion-generar-cta"]').click())
  await esperar()
  await escribir('liq-period', '2026-09')
  await escribir('liq-gross', canon)
}

async function generar() {
  const boton = Array.from(document.querySelectorAll('button')).find((b) =>
    (b.textContent ?? '').includes('Generar borrador'),
  )!
  await act(async () => boton.click())
  await esperar()
}

describe('Generar liquidación — lo que no sale', () => {
  it('🔴 un canon que la columna no aguanta se ataja en su campo, con el foco, sin enviar', async () => {
    await abrirYLlenar('25000000000')
    await generar()
    expect(liq.generateSettlement).not.toHaveBeenCalled()
    expect($('#liq-gross-error').textContent).toBe(
      'El canon recaudado no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
    )
    expect($('#liq-gross').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe($('#liq-gross'))
    expect(toasts.error).toEqual([])
  })

  it('🔴 un 400 con `campos` va a su campo, con el foco y sin toast', async () => {
    liq.generateSettlement.mockResolvedValue({
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['El periodo ya tiene una liquidación para este propietario.'],
          campos: [{ campo: 'period', regla: 'unico', mensaje: 'El periodo ya tiene una liquidación para este propietario.' }],
        }),
      }),
    })
    await abrirYLlenar('1500000')
    await generar()
    expect(liq.generateSettlement).toHaveBeenCalledTimes(1)
    expect($('#liq-period-error').textContent).toBe('El periodo ya tiene una liquidación para este propietario.')
    expect($('#liq-period').getAttribute('aria-describedby')).toBe('liq-period-error')
    expect(document.activeElement).toBe($('#liq-period'))
    expect(toasts.error).toEqual([])

    // Al corregir el campo, su error se va.
    await escribir('liq-period', '2026-10')
    expect(document.querySelector('#liq-period-error')?.textContent ?? '').toBe('')
  })

  it('un 5xx dice «de nuestro lado» con la referencia, nunca el status', async () => {
    liq.generateSettlement.mockResolvedValue({
      ok: false,
      error: '500',
      fallo: await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: 'ab12cd34-0' }) }),
    })
    await abrirYLlenar('1500000')
    await generar()
    expect(toasts.error).toHaveLength(1)
    expect(toasts.error[0]).toContain('No pudimos generar la liquidación: algo falló de nuestro lado')
    expect(toasts.error[0]).toContain('ab12cd34')
    expect(toasts.error[0]).not.toMatch(/conexi|500/i)
  })

  it('si el pedido ni salió (status 0) habla de la conexión', async () => {
    const red = new TypeError('Failed to fetch')
    liq.generateSettlement.mockResolvedValue({ ok: false, error: red.message, fallo: red })
    await abrirYLlenar('1500000')
    await generar()
    expect(toasts.error[0]).toMatch(/conexión/)
  })
})
