/**
 * Registrar una conexión, cuando no sale (tanda 2 de errores, 02-10-2026).
 * Antes: «No se pudo registrar la conexión (403).» para todo.
 *
 *  · un 400 con `campos` va a su campo (la ayuda y el error se cruzan), con
 *    el foco, sin toast;
 *  · un 5xx dice «de nuestro lado» con la referencia;
 *  · un pedido que ni salió habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { conexiones, toasts } = vi.hoisted(() => ({
  conexiones: {
    createConnection: vi.fn(
      async (_input: unknown): Promise<{ ok: boolean; error?: string; fallo?: unknown }> => ({ ok: true }),
    ),
  },
  toasts: { ok: [] as string[], error: [] as string[] },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/use-auto-refresh', () => ({ useAutoRefresh: () => {} }))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-connections', async () => {
  const real = await vi.importActual<typeof import('@/lib/hooks/conciliacion/use-conciliacion-connections')>(
    '@/lib/hooks/conciliacion/use-conciliacion-connections',
  )
  return {
    ...real,
    useConciliacionConnections: () => ({
      items: [],
      isLoading: false,
      error: null,
      notAvailable: false,
      refetch: async () => {},
      createConnection: conexiones.createConnection,
      patchConnection: async () => ({ ok: true }),
    }),
  }
})
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.ok.push(m),
    error: (m: string) => toasts.error.push(m),
  },
}))

import ConciliacionConexionesPage from './page'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

let host: HTMLDivElement
let root: Root

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(async () => {
  conexiones.createConnection.mockReset().mockResolvedValue({ ok: true })
  toasts.ok = []
  toasts.error = []
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<ConciliacionConexionesPage />)
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

async function registrar() {
  await act(async () => $('[data-testid="conexiones-abrir-registro"]').click())
  await esperar()
  await escribir('conexion-provider', 'bancolombia')
  await escribir('conexion-nombre', 'Cuenta de recaudo')
  await act(async () => $('[data-testid="conexiones-registrar-submit"]').click())
  await esperar()
}

describe('Registrar una conexión — lo que no sale', () => {
  it('🔴 un 400 con `campos` va a su campo, con el foco y sin toast', async () => {
    conexiones.createConnection.mockResolvedValue({
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['El nombre visible ya lo usa otra conexión.'],
          campos: [{ campo: 'displayName', regla: 'unico', mensaje: 'El nombre visible ya lo usa otra conexión.' }],
        }),
      }),
    })
    await registrar()
    expect(conexiones.createConnection).toHaveBeenCalledTimes(1)
    expect($('#conexion-nombre-error').textContent).toBe('El nombre visible ya lo usa otra conexión.')
    expect($('#conexion-nombre').getAttribute('aria-invalid')).toBe('true')
    expect($('#conexion-nombre').getAttribute('aria-describedby')).toBe('conexion-nombre-error')
    expect(document.activeElement).toBe($('#conexion-nombre'))
    expect(toasts.error).toEqual([])
    // El cajón sigue abierto con lo escrito.
    expect($<HTMLInputElement>('#conexion-provider').value).toBe('bancolombia')
  })

  it('un 5xx dice «de nuestro lado» con la referencia, nunca el status', async () => {
    conexiones.createConnection.mockResolvedValue({
      ok: false,
      error: '500',
      fallo: await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: '5ca1ab1e-00' }) }),
    })
    await registrar()
    expect(toasts.error).toHaveLength(1)
    expect(toasts.error[0]).toContain('No pudimos registrar la conexión: algo falló de nuestro lado')
    expect(toasts.error[0]).toContain('5ca1ab1e')
    expect(toasts.error[0]).not.toMatch(/conexión a internet|500/i)
  })

  it('si el pedido ni salió (status 0) habla de la conexión', async () => {
    const red = new TypeError('Failed to fetch')
    conexiones.createConnection.mockResolvedValue({ ok: false, error: red.message, fallo: red })
    await registrar()
    expect(toasts.error[0]).toMatch(/Revisa tu conexión|No tienes conexión/)
  })
})
