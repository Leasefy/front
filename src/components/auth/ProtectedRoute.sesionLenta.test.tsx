/**
 * 🔴 LOGIN-BUCLE (Nico, 06-10-2026 10:11): «quedó en un bucle: cuando aparece
 * eso de sigue con esta cuenta, uno le da continuar, dice verificando acceso y
 * luego sale el login y luego vuelve a aparecer el de sigue con esta cuenta».
 *
 * La cadena, con el `AuthProvider` y el `ProtectedRoute` DE VERDAD (sólo se
 * simulan Supabase, el back y el router):
 *   1. Recarga del panel con una sesión de Supabase guardada.
 *   2. El bootstrap (`claim` + `GET /users/me/bootstrap` + MFA) tarda más de
 *      5 s: máquina cargada, Next en dev compilando, `/users/me` lento.
 *   3. La red de 5 s soltaba `isLoading` con `user = null` y `ProtectedRoute`
 *      lo leía como «no hay sesión»: `router.replace('/auth?returnUrl=…')`.
 *   4. En /auth la sesión se resolvía segundos después y salía
 *      `SesionYaAbierta`; «Continuar» recarga el panel y vuelve al paso 1.
 *
 * Lo que tiene que quedar: un «todavía no sé» nunca expulsa al login. Sólo una
 * sesión que se SABE inexistente o muerta (Supabase lo dijo) manda allá.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type AuthEventCallback = (event: string, session: unknown) => Promise<void> | void

const { authCallbacks, getMock, postMock, replaceMock, getAalMock, ruta } = vi.hoisted(() => ({
  authCallbacks: [] as AuthEventCallback[],
  getMock: vi.fn(),
  postMock: vi.fn().mockResolvedValue({ superseded: false }),
  replaceMock: vi.fn(),
  getAalMock: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
  ruta: { actual: '/panel/inmobiliaria' },
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
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => getAalMock(...args),
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [] }, error: null }),
      },
    },
  }),
}))

vi.mock('@/lib/api/client', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    apiClient: {
      get: (...args: unknown[]) => getMock(...args),
      post: (...args: unknown[]) => postMock(...args),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => ruta.actual,
}))

import { AuthProvider } from '@/lib/auth/auth-context'
import { resetSessionTerminal } from '@/lib/auth/session-terminal'
import { ProtectedRoute } from './ProtectedRoute'

const COOKIE_DE_SESION = 'sb-jraqurdcjwnifzpdqtnm-auth-token'

const sesion = {
  access_token: 'jwt-de-prueba',
  user: {
    id: 'sb-user-1',
    email: 'nico@inmobiliaria.co',
    app_metadata: { providers: ['email'] },
    user_metadata: { full_name: 'Nico García' },
  },
}

const bootstrapDeInmobiliaria = {
  user: { id: 'u1', email: 'nico@inmobiliaria.co', firstName: 'Nico', lastName: 'García', onboardingCompletedAt: '2026-06-01T00:00:00.000Z' },
  role: 'AGENT',
  agency: { id: 'ag-1', name: 'Inmobiliaria', memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
  subscription: null,
  onboarding: null,
  errors: [],
  segundoFactor: { exigido: false },
}

function guardarCookieDeSesion() {
  document.cookie = `${COOKIE_DE_SESION}=base64-eyJzZXNpb24iOnRydWV9; path=/`
}

function borrarCookieDeSesion() {
  // `expires` y no `Max-Age=0`: happy-dom no borra con Max-Age (el navegador sí).
  document.cookie = `${COOKIE_DE_SESION}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

let container: HTMLDivElement
let root: Root
let locationReplace: ReturnType<typeof vi.fn>
const ubicacionOriginal = window.location

beforeEach(() => {
  vi.useFakeTimers()
  resetSessionTerminal()
  authCallbacks.length = 0
  getMock.mockReset()
  postMock.mockReset().mockResolvedValue({ superseded: false })
  replaceMock.mockClear()
  getAalMock.mockReset().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null })
  ruta.actual = '/panel/inmobiliaria'
  localStorage.clear()
  sessionStorage.clear()
  borrarCookieDeSesion()
  locationReplace = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...ubicacionOriginal,
      origin: 'http://localhost:3001',
      pathname: '/panel/inmobiliaria',
      search: '',
      replace: locationReplace,
      reload: vi.fn(),
      assign: vi.fn(),
    },
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  borrarCookieDeSesion()
  Object.defineProperty(window, 'location', { configurable: true, value: ubicacionOriginal })
  vi.useRealTimers()
  vi.clearAllMocks()
})

async function montarElPanel() {
  await act(async () => {
    root.render(
      <AuthProvider>
        <ProtectedRoute allowedRoles={['agency']} allowAgencyMembers>
          <div data-testid="panel-child">panel</div>
        </ProtectedRoute>
      </AuthProvider>,
    )
  })
}

async function emitir(evento: string, s: unknown) {
  await act(async () => {
    void authCallbacks[authCallbacks.length - 1](evento, s)
    await Promise.resolve()
  })
}

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const panelMontado = () => container.querySelector('[data-testid="panel-child"]') !== null
const mandoAlLogin = () =>
  replaceMock.mock.calls.some(([destino]) => String(destino).startsWith('/auth')) ||
  locationReplace.mock.calls.some(([destino]) => String(destino).includes('/auth'))

describe('ProtectedRoute + AuthProvider — la sesión tarda (LOGIN-BUCLE)', () => {
  it('🔴 sesión guardada y bootstrap de más de 5 s: NO manda al login; espera y entra', async () => {
    guardarCookieDeSesion()
    let soltarBootstrap!: (v: unknown) => void
    getMock.mockImplementation((path: string) => {
      if (path === '/users/me/bootstrap') return new Promise((resolve) => { soltarBootstrap = resolve })
      return Promise.reject(new Error(`no simulado: ${path}`))
    })

    await montarElPanel()
    await emitir('INITIAL_SESSION', sesion)

    // Pasan los 5 s de la red de seguridad (y más): el bootstrap sigue en vuelo.
    await avanzar(6000)
    expect(mandoAlLogin()).toBe(false)
    expect(panelMontado()).toBe(false)
    expect(container.textContent).toContain('Verificando acceso')

    // El back contesta a los ~9 s: entra, sin haber pasado por /auth.
    await avanzar(3000)
    await act(async () => {
      soltarBootstrap(bootstrapDeInmobiliaria)
      await Promise.resolve()
    })
    await avanzar(50)
    expect(mandoAlLogin()).toBe(false)
    expect(panelMontado()).toBe(true)
  })

  it('🔴 sesión guardada y Supabase nunca avisa: pasado el tope dice «No pudimos confirmar tu sesión», nunca redirige', async () => {
    guardarCookieDeSesion()

    await montarElPanel()
    // Ningún evento de auth: auth-js no soltó su candado.
    await avanzar(6000)
    expect(mandoAlLogin()).toBe(false)
    expect(container.textContent).toContain('Verificando acceso')

    await avanzar(30_000)
    expect(mandoAlLogin()).toBe(false)
    expect(panelMontado()).toBe(false)
    expect(container.querySelector('[data-testid="no-pudimos-confirmar-sesion"]')).not.toBeNull()

    // «Reintentar» recarga (vuelve a levantar auth-js); no manda al login.
    await act(async () => {
      ;(container.querySelector('[data-testid="reintentar-confirmar-sesion"]') as HTMLButtonElement).click()
      await Promise.resolve()
    })
    expect(window.location.reload).toHaveBeenCalledTimes(1)
    expect(mandoAlLogin()).toBe(false)
  })

  it('pasado el tope, «Entrar con otra cuenta» es una salida que la persona ELIGE: cierra la sesión y va a /auth con el destino', async () => {
    guardarCookieDeSesion()
    await montarElPanel()
    await avanzar(36_000)
    expect(replaceMock).not.toHaveBeenCalled()

    await act(async () => {
      ;(container.querySelector('[data-testid="sin-confirmar-otra-cuenta"]') as HTMLButtonElement).click()
    })
    await avanzar(2000)
    expect(window.location.assign).toHaveBeenCalledWith('/auth?returnUrl=%2Fpanel%2Finmobiliaria')
  })

  it('si la confirmación llega DESPUÉS del tope, el panel se monta solo (sin tocar «Reintentar»)', async () => {
    guardarCookieDeSesion()
    let soltarBootstrap!: (v: unknown) => void
    getMock.mockImplementation((path: string) => {
      if (path === '/users/me/bootstrap') return new Promise((resolve) => { soltarBootstrap = resolve })
      return Promise.reject(new Error(`no simulado: ${path}`))
    })
    await montarElPanel()
    await emitir('INITIAL_SESSION', sesion)
    await avanzar(25_000)
    expect(container.querySelector('[data-testid="no-pudimos-confirmar-sesion"]')).not.toBeNull()

    await act(async () => {
      soltarBootstrap(bootstrapDeInmobiliaria)
      await Promise.resolve()
    })
    await avanzar(50)
    expect(panelMontado()).toBe(true)
    expect(mandoAlLogin()).toBe(false)
  })

  it('🔴 sesión guardada pero INITIAL_SESSION llega vacío (renovar falló por red; la cookie sigue): no expulsa, y entra cuando se renueva', async () => {
    guardarCookieDeSesion()
    getMock.mockImplementation((path: string) => {
      if (path === '/users/me') return Promise.resolve({ ...bootstrapDeInmobiliaria.user, role: 'AGENT' })
      if (path === '/inmobiliaria/agency') return Promise.resolve(bootstrapDeInmobiliaria.agency)
      return Promise.reject(new Error(`no simulado: ${path}`))
    })

    await montarElPanel()
    await emitir('INITIAL_SESSION', null)
    await avanzar(6000)
    expect(mandoAlLogin()).toBe(false)
    expect(panelMontado()).toBe(false)

    // auth-js reintenta solo (su ticker) y esta vez renueva.
    await emitir('TOKEN_REFRESHED', sesion)
    await avanzar(50)
    expect(mandoAlLogin()).toBe(false)
    // `/users/me` dice AGENT: rol de inmobiliaria → entra.
    expect(panelMontado()).toBe(true)
  })

  it('sin sesión guardada (visitante): a los 5 s sin noticias sí va al login, como siempre', async () => {
    await montarElPanel()
    await avanzar(5000)
    await avanzar(10)
    expect(replaceMock).toHaveBeenCalledWith('/auth?returnUrl=%2Fpanel%2Finmobiliaria')
  })

  it('Supabase SABE que no hay sesión (INITIAL_SESSION vacío y sin cookie): al login', async () => {
    await montarElPanel()
    await emitir('INITIAL_SESSION', null)
    await avanzar(10)
    expect(replaceMock).toHaveBeenCalledWith('/auth?returnUrl=%2Fpanel%2Finmobiliaria')
  })

  it('sesión de verdad vencida (auth-js no pudo renovar: borra la cookie y emite SIGNED_OUT): al login con el aviso', async () => {
    guardarCookieDeSesion()
    await montarElPanel()
    // auth-js: `_removeSession` borra la cookie y avisa SIGNED_OUT, luego INITIAL_SESSION vacío.
    borrarCookieDeSesion()
    await emitir('SIGNED_OUT', null)
    await emitir('INITIAL_SESSION', null)
    await avanzar(10)
    expect(mandoAlLogin()).toBe(true)
    expect(locationReplace).toHaveBeenCalledWith(expect.stringContaining('reason=expirada'))
  })
})
