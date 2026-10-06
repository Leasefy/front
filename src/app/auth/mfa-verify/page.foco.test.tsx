/**
 * 🔴 Nico, 06-10-2026 16:23: «Verificación de seguridad · Abre tu app de
 * autenticación y escribe el código de seis dígitos»: el PRIMER cuadro tiene
 * que quedar seleccionado, con foco, para escribir de una. También después de
 * un código rechazado: foco al primero y cuadros limpios.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, sdk } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  sdk: {
    verify: vi.fn(),
    challenge: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'agency', email: 'nico@inmobiliaria.co' },
    mfaRequired: true,
    mfaEnrollRequired: false,
    isLoading: false,
    setMfaVerified: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600, user: { email: 'nico@inmobiliaria.co' } } } })),
      refreshSession: vi.fn(async () => ({ error: null })),
      mfa: {
        listFactors: vi.fn(async () => ({ data: { totp: [{ id: 'f1', status: 'verified' }] } })),
        challenge: (...a: unknown[]) => sdk.challenge(...a),
        verify: (...a: unknown[]) => sdk.verify(...a),
      },
    },
  }),
}))

vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import MfaVerifyPage from './page'

let container: HTMLDivElement
let root: Root

const casilla = (i: number) => container.querySelector(`[data-testid="casilla-${i}"]`) as HTMLInputElement
const valores = () => Array.from({ length: 6 }, (_, i) => casilla(i).value).join('')

async function vaciar() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  })
}

/** En Chrome una casilla deshabilitada pierde el foco; happy-dom no lo hace solo. */
function soltarElFocoComoElNavegador() {
  const activo = document.activeElement as HTMLInputElement | null
  if (activo?.disabled) activo.blur()
}

async function escribir(codigo: string) {
  const primera = casilla(0)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(primera, codigo)
    primera.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  replaceMock.mockClear()
  sdk.challenge.mockReset().mockResolvedValue({ data: { id: 'ch1' }, error: null })
  sdk.verify.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe('/auth/mfa-verify — el primer cuadro con foco', () => {
  it('al abrir la pantalla, el primer cuadro tiene el foco', async () => {
    await act(async () => {
      root.render(<MfaVerifyPage />)
    })
    await vaciar()
    expect(document.activeElement).toBe(casilla(0))
  })

  it('🔴 después de un código rechazado: foco al primero y cuadros limpios', async () => {
    let contestar!: (r: unknown) => void
    sdk.verify.mockImplementation(() => new Promise((r) => { contestar = r }))
    await act(async () => {
      root.render(<MfaVerifyPage />)
    })
    await vaciar()

    // Escribe los seis (el último cuadro se queda con el foco) y se envía solo.
    act(() => casilla(5).focus())
    await escribir('000000')
    await vaciar()
    expect(sdk.verify).toHaveBeenCalledTimes(1)
    expect(casilla(0).disabled).toBe(true)
    soltarElFocoComoElNavegador()

    await act(async () => {
      contestar({ data: null, error: { status: 422, code: 'mfa_verification_failed', message: 'Invalid TOTP code entered' } })
    })
    await vaciar()

    expect(valores()).toBe('')
    expect(casilla(0).disabled).toBe(false)
    expect(document.activeElement).toBe(casilla(0))
  })
})
