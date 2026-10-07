/**
 * 🔴 LOGIN-BUCLE (Nico, 06-10-2026) — el AuthProvider con una sesión GUARDADA
 * que tarda en confirmarse.
 *
 * - «Todavía no sé» no suelta `isLoading` (nadie decide «no hay sesión»).
 * - `confirmacionDeLaSesion`: `revisando` → (tope) `sin-confirmar` → `no-aplica`
 *   en cuanto se resuelve.
 * - `confirmarSesionVigente` (para «Continuar» de `SesionYaAbierta`).
 * - Entrar desde /auth después de que la sesión anterior se declaró muerta ahí
 *   mismo funciona sin recargar (la bandera de `session-terminal` se reabre).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type AuthEventCallback = (event: string, session: unknown) => Promise<void> | void

const { authCallbacks, getMock, postMock, getSessionMock, getAalMock } = vi.hoisted(() => ({
  authCallbacks: [] as AuthEventCallback[],
  getMock: vi.fn(),
  postMock: vi.fn().mockResolvedValue({ superseded: false }),
  getSessionMock: vi.fn(),
  getAalMock: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (cb: AuthEventCallback) => {
        authCallbacks.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signOut: vi.fn().mockResolvedValue({ error: null }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('muerta') }),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => getAalMock(...args),
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
      },
    },
  }),
}))

vi.mock('@/lib/api/client', async () => {
  // La bandera de sesión terminada es la REAL: es justo lo que se prueba.
  const { sesionTerminada } = await import('@/lib/auth/session-terminal')
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public code?: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  // Como el `request` de verdad: con la sesión declarada muerta no sale nada.
  const conLaBandera = (fn: (...a: unknown[]) => unknown) => (...args: unknown[]) => {
    if (sesionTerminada()) return Promise.reject(new ApiError(401, 'Tu sesión expiró.', 'SESSION_TERMINATED'))
    return fn(...args)
  }
  return {
    apiClient: {
      get: conLaBandera((...args: unknown[]) => getMock(...args)),
      post: conLaBandera((...args: unknown[]) => postMock(...args)),
      patch: vi.fn(),
    },
    ApiError,
    getAccessToken: () => null,
    setAccessToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
    setTokenRefresher: vi.fn(),
    clearInFlightGets: vi.fn(),
    setMfaPendingFlag: vi.fn(),
  }
})

vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthProvider, AuthContext, TOPE_PARA_CONFIRMAR_LA_SESION_MS } from './auth-context'
import { resetSessionTerminal, sesionTerminada } from './session-terminal'
import type { AuthContextType } from './types'

const COOKIE = 'sb-jraqurdcjwnifzpdqtnm-auth-token'
const guardarCookie = () => {
  document.cookie = `${COOKIE}=base64-eyJ4IjoxfQ; path=/`
}
const borrarCookie = () => {
  document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

const sesion = {
  access_token: 'jwt-de-prueba',
  user: { id: 'sb-1', email: 'nico@inmobiliaria.co', app_metadata: { providers: ['email'] }, user_metadata: {} },
}

const bootstrap = {
  user: { id: 'u1', email: 'nico@inmobiliaria.co', firstName: 'Nico', lastName: 'García', onboardingCompletedAt: '2026-06-01T00:00:00.000Z' },
  role: 'AGENT',
  agency: { id: 'ag-1', name: 'Inmobiliaria', memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
  subscription: null,
  onboarding: null,
  errors: [],
  segundoFactor: { exigido: false },
}

let container: HTMLDivElement
let root: Root
let captured: AuthContextType | null = null
const ubicacionOriginal = window.location

function Probe() {
  captured = React.useContext(AuthContext)
  return null
}

async function montar() {
  await act(async () => {
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
  })
}

async function emitir(evento: string, s: unknown) {
  await act(async () => {
    await authCallbacks[authCallbacks.length - 1](evento, s)
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function enLaRuta(pathname: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...ubicacionOriginal, origin: 'http://localhost:3001', pathname, search: '', replace: vi.fn(), reload: vi.fn() },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  resetSessionTerminal()
  authCallbacks.length = 0
  captured = null
  getMock.mockReset()
  postMock.mockReset().mockResolvedValue({ superseded: false })
  getSessionMock.mockReset()
  getAalMock.mockReset().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null })
  localStorage.clear()
  sessionStorage.clear()
  borrarCookie()
  enLaRuta('/panel/inmobiliaria')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  borrarCookie()
  Object.defineProperty(window, 'location', { configurable: true, value: ubicacionOriginal })
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('confirmacionDeLaSesion', () => {
  it('sin sesión guardada es «no-aplica» desde el principio', async () => {
    await montar()
    expect(captured!.confirmacionDeLaSesion).toBe('no-aplica')
    expect(captured!.isLoading).toBe(true)
  })

  it('con sesión guardada: «revisando», a los 5 s sigue cargando, al tope «sin-confirmar», y al resolverse «no-aplica» con el usuario', async () => {
    guardarCookie()
    let soltar!: (v: unknown) => void
    getMock.mockImplementation((path: string) =>
      path === '/users/me/bootstrap' ? new Promise((r) => { soltar = r }) : Promise.reject(new Error(path)),
    )
    await montar()
    expect(captured!.confirmacionDeLaSesion).toBe('revisando')

    await act(async () => {
      void authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', sesion)
      await Promise.resolve()
    })
    await avanzar(5000)
    expect(captured!.isLoading).toBe(true)
    expect(captured!.isAuthenticated).toBe(false)
    expect(captured!.confirmacionDeLaSesion).toBe('revisando')

    await avanzar(TOPE_PARA_CONFIRMAR_LA_SESION_MS)
    expect(captured!.isLoading).toBe(true)
    expect(captured!.confirmacionDeLaSesion).toBe('sin-confirmar')

    await act(async () => {
      soltar(bootstrap)
      await Promise.resolve()
    })
    await avanzar(10)
    expect(captured!.isLoading).toBe(false)
    expect(captured!.user?.email).toBe('nico@inmobiliaria.co')
    expect(captured!.confirmacionDeLaSesion).toBe('no-aplica')
  })

  it('el visitante sin sesión se suelta a los 5 s como siempre (nada que confirmar)', async () => {
    await montar()
    await avanzar(5000)
    expect(captured!.isLoading).toBe(false)
    expect(captured!.isAuthenticated).toBe(false)
    expect(captured!.confirmacionDeLaSesion).toBe('no-aplica')
  })
})

describe('confirmarSesionVigente', () => {
  it('Supabase devuelve la sesión → «viva»', async () => {
    getSessionMock.mockResolvedValue({ data: { session: sesion }, error: null })
    await montar()
    await expect(captured!.confirmarSesionVigente!()).resolves.toBe('viva')
  })

  it('sin sesión y ya no guardada (renovar falló de verdad: auth-js la borró) → «muerta»', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: { name: 'AuthApiError', status: 400 } })
    await montar()
    await expect(captured!.confirmarSesionVigente!()).resolves.toBe('muerta')
  })

  it('sin sesión pero todavía guardada (falló la red) → «sin-respuesta», nunca «muerta»', async () => {
    guardarCookie()
    getSessionMock.mockResolvedValue({ data: { session: null }, error: { name: 'AuthRetryableFetchError', status: 0 } })
    await montar()
    await expect(captured!.confirmarSesionVigente!()).resolves.toBe('sin-respuesta')
  })

  it('Supabase no contesta (candado tomado) → «sin-respuesta» al tope, sin colgarse', async () => {
    getSessionMock.mockReturnValue(new Promise(() => {}))
    await montar()
    let resultado: string | undefined
    void captured!.confirmarSesionVigente!().then((r) => { resultado = r })
    await avanzar(8000)
    expect(resultado).toBe('sin-respuesta')
  })
})

describe('entrar desde /auth después de que la sesión anterior murió ahí mismo', () => {
  it('🔴 el SIGNED_IN nuevo reabre la bandera: el claim y el bootstrap salen y entra', async () => {
    enLaRuta('/auth')
    guardarCookie()
    await montar()
    // auth-js no pudo renovar la sesión guardada: la borra y avisa.
    borrarCookie()
    await emitir('SIGNED_OUT', null)
    expect(sesionTerminada()).toBe(true)
    await emitir('INITIAL_SESSION', null)
    expect(captured!.isLoading).toBe(false)

    // La persona entra con el formulario, sin recargar.
    getMock.mockImplementation((path: string) =>
      path === '/users/me/bootstrap' ? Promise.resolve(bootstrap) : Promise.reject(new Error(path)),
    )
    await emitir('SIGNED_IN', sesion)
    await avanzar(10)

    expect(sesionTerminada()).toBe(false)
    expect(getMock).toHaveBeenCalledWith('/users/me/bootstrap', 'jwt-de-prueba')
    expect(captured!.user?.email).toBe('nico@inmobiliaria.co')
  })
})
