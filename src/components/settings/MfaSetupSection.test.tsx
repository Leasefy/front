/**
 * 2FA: los CUATRO pedidos van por HTTP y los cuatro tienen tope.
 *
 * `enroll`, `unenroll` y el listado de factores ya pasaban por `apiDeAuth`, que
 * aborta a los 15 s. `verify` no: hacía dos `fetch` sueltos —el desafío y la
 * verificación— sin `AbortController`. Con la red colgada el botón se quedaba
 * en «Verificando...» para siempre, que es exactamente el síntoma que el tope
 * existe para evitar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'token-vivo',
}))

const avisos: Array<{ tipo: string; texto: unknown }> = []
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (texto: unknown) => avisos.push({ tipo: 'success', texto }),
    error: (texto: unknown) => avisos.push({ tipo: 'error', texto }),
  },
}))

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ start: vi.fn(), stop: vi.fn() }),
}))

import { MfaSetupSection } from './MfaSetupSection'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

let container: HTMLDivElement
let root: Root
/** Las señales de aborto que recibió cada `fetch`, en orden. */
let señales: Array<AbortSignal | undefined>

function respuesta(body: unknown) {
  return { ok: true, json: async () => body } as unknown as Response
}

beforeEach(() => {
  avisos.length = 0
  señales = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

/** Monta la pantalla ya en el paso de «escaneá el QR y escribí el código». */
async function montarEnVerificacion() {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    señales.push(init?.signal ?? undefined)
    const url = String(_url)
    if (url.endsWith('/user')) return respuesta({ factors: [] })
    if (url.endsWith('/factors')) {
      return respuesta({ id: 'f1', totp: { qr_code: '<svg/>', secret: 'S3CR3T' } })
    }
    if (url.endsWith('/challenge')) return respuesta({ id: 'ch1' })
    if (url.endsWith('/verify')) return respuesta({})
    return respuesta({})
  })
  vi.stubGlobal('fetch', fetchMock)

  await act(async () => {
    root.render(<MfaSetupSection />)
  })

  const activar = [...container.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes('Activar'),
  )
  await act(async () => {
    activar?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  return fetchMock
}

describe('MfaSetupSection', () => {
  it('el alta pide el factor por HTTP, con señal de aborto', async () => {
    await montarEnVerificacion()
    expect(container.querySelector('img[alt="Código QR para autenticación"]')).not.toBeNull()
    // `/user` y `/factors`, los dos con AbortSignal.
    expect(señales.length).toBeGreaterThanOrEqual(1)
    expect(señales.every((s) => s instanceof AbortSignal)).toBe(true)
  })

  it('🔴 verificar también lleva tope: el desafío y la verificación van con AbortSignal', async () => {
    const fetchMock = await montarEnVerificacion()
    señales.length = 0

    const input = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(input, '123456')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const verificar = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Verificar'),
    )
    await act(async () => {
      verificar?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.endsWith('/challenge'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/verify'))).toBe(true)
    // Los DOS pedidos de la verificación llevan señal: ninguno puede colgarse.
    expect(señales).toHaveLength(2)
    expect(señales.every((s) => s instanceof AbortSignal)).toBe(true)
  })

  it('no deja rastros de depuración en la consola', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await montarEnVerificacion()

    // Con el código puesto: el botón deja de estar deshabilitado y el click
    // llega al handler, que era donde estaban los tres rastros
    // (`[MFA] Button clicked!`, `[MFA] Verify skipped`, `[MFA] Verify error`).
    const input = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(input, '123456')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const verificar = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Verificar'),
    )
    await act(async () => {
      verificar?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
