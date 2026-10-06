/**
 * 🔴 Nico, 06-10-2026 16:23: en el enrolamiento (/auth/mfa-enroll, paso «Escribe
 * el código») los mismos cuadros: el primero con foco al llegar, y después de
 * un código rechazado, foco al primero y cuadros limpios.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { challengeMock, verifyMock } = vi.hoisted(() => ({
  challengeMock: vi.fn(),
  verifyMock: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'token-aal1',
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: { challenge: challengeMock, verify: verifyMock } } }),
}))

import { ActivarSegundoFactorPasoAPaso } from './ActivarSegundoFactorPasoAPaso'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

let container: HTMLDivElement
let root: Root

function respuesta(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response
}

const porTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const casilla = (i: number) => porTestId(`casilla-${i}`) as HTMLInputElement
const valores = () => Array.from({ length: 6 }, (_, i) => casilla(i).value).join('')

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function vaciar() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  })
}

async function escribir(codigo: string) {
  const primera = casilla(0)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(primera, codigo)
    primera.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** En Chrome una casilla deshabilitada pierde el foco; happy-dom no lo hace solo. */
function soltarElFocoComoElNavegador() {
  const activo = document.activeElement as HTMLInputElement | null
  if (activo?.disabled) activo.blur()
}

beforeEach(() => {
  challengeMock.mockReset().mockResolvedValue({ data: { id: 'ch1' }, error: null })
  verifyMock.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.endsWith('/user')) return respuesta({ factors: [] })
      if (u.endsWith('/factors')) {
        return respuesta({ id: 'f-nuevo', totp: { qr_code: '<svg/>', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Leasefy' } })
      }
      return respuesta({})
    }),
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

async function alPasoDelCodigo() {
  await act(async () => {
    root.render(<ActivarSegundoFactorPasoAPaso onActivado={vi.fn()} onYaTeniaFactor={vi.fn()} />)
  })
  await clic(porTestId('ya-tengo-la-app'))
  await clic(porTestId('ya-lo-agregue'))
  await vaciar()
}

describe('/auth/mfa-enroll — el primer cuadro con foco', () => {
  it('al llegar al paso del código, el primer cuadro tiene el foco', async () => {
    await alPasoDelCodigo()
    expect(document.activeElement).toBe(casilla(0))
  })

  it('🔴 después de un código rechazado: foco al primero y cuadros limpios', async () => {
    let contestar!: (r: unknown) => void
    verifyMock.mockImplementation(() => new Promise((r) => { contestar = r }))
    await alPasoDelCodigo()

    act(() => casilla(5).focus())
    await escribir('000000')
    await vaciar()
    expect(verifyMock).toHaveBeenCalledTimes(1)
    expect(casilla(0).disabled).toBe(true)
    soltarElFocoComoElNavegador()

    await act(async () => {
      contestar({ data: null, error: { status: 422, code: 'mfa_verification_failed', message: 'Invalid TOTP code entered' } })
    })
    await vaciar()

    expect(valores()).toBe('')
    expect(document.activeElement).toBe(casilla(0))
  })
})
