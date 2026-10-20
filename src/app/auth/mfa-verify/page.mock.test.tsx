/**
 * T-0172 r2 — `123456` en /auth/mfa-verify con un factor que NO se inscribió
 * con el mock: el back libera los factores (sólo no-prod) y el mock inscribe y
 * verifica uno nuevo. Con el mock apagado, `123456` viaja tal cual.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, sdk, liberarMock, toastError, setMfaVerifiedMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  sdk: { verify: vi.fn(), challenge: vi.fn() },
  liberarMock: vi.fn(),
  toastError: vi.fn(),
  setMfaVerifiedMock: vi.fn(),
}))

function tokenDe(sub: string) {
  return `cab.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.firma`
}
const TOKEN = tokenDe('u1')
const SECRETO = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

vi.mock('@/lib/api/segundo-factor.service', () => ({
  segundoFactorApi: { liberarFactoresDelMock: liberarMock },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'agency', email: 'nico@inmobiliaria.co' },
    mfaRequired: true,
    mfaEnrollRequired: false,
    isLoading: false,
    setMfaVerified: setMfaVerifiedMock,
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            access_token: TOKEN,
            user: { id: 'u1', email: 'nico@inmobiliaria.co' },
          },
        },
      })),
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
import { MENSAJE_SIN_SECRETO_DEL_MOCK, clavePorFactor } from '@/lib/auth/mock-del-segundo-factor'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

let container: HTMLDivElement
let root: Root

const casilla = (i: number) => container.querySelector(`[data-testid="casilla-${i}"]`) as HTMLInputElement

async function vaciar() {
  await act(async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve()
  })
}

async function escribir(codigo: string) {
  const primera = casilla(0)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(primera, codigo)
    primera.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await vaciar()
}

beforeEach(() => {
  window.localStorage.clear()
  replaceMock.mockClear()
  toastError.mockClear()
  setMfaVerifiedMock.mockClear()
  liberarMock.mockReset().mockResolvedValue({ factoresBorrados: 1 })
  sdk.challenge.mockReset().mockResolvedValue({ data: { id: 'ch1' }, error: null })
  sdk.verify.mockReset().mockResolvedValue({ data: { access_token: 'token-aal2' }, error: null })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).endsWith('/factors')) {
        return { ok: true, status: 200, json: async () => ({ id: 'f-nuevo', totp: { qr_code: '<svg/>', secret: SECRETO } }) } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
    }),
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function abrir() {
  await act(async () => {
    root.render(<MfaVerifyPage />)
  })
  await vaciar()
}

describe('/auth/mfa-verify — 123456 con el mock', () => {
  it('factor sin secreto guardado: libera, inscribe uno nuevo, verifica y entra', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    await abrir()
    await escribir('123456')

    expect(liberarMock).toHaveBeenCalledTimes(1)
    expect(sdk.verify).toHaveBeenCalledTimes(1)
    const enviado = sdk.verify.mock.calls[0]![0] as { factorId: string; code: string }
    expect(enviado.factorId).toBe('f-nuevo')
    expect(enviado.code).toMatch(/^\d{6}$/)
    expect(enviado.code).not.toBe('123456')
    expect(window.localStorage.getItem(clavePorFactor('u1', 'f-nuevo'))).toBe(SECRETO)
    expect(setMfaVerifiedMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalled()
  })

  it('el back contesta 404: el mensaje de siempre, sin reintentos ni verificación', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    liberarMock.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
    await abrir()
    await escribir('123456')

    expect(liberarMock).toHaveBeenCalledTimes(1)
    expect(sdk.verify).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(MENSAJE_SIN_SECRETO_DEL_MOCK)
  })

  it('con el mock apagado 123456 viaja tal cual y el back no se toca', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production')
    await abrir()
    await escribir('123456')

    expect(liberarMock).not.toHaveBeenCalled()
    expect(sdk.verify).toHaveBeenCalledWith({ factorId: 'f1', challengeId: 'ch1', code: '123456' })
  })
})
