/**
 * 🔴 LOGIN-BUCLE r2 (06-10-2026): un arranque de sesión por carga, y la red
 * fuera del candado de auth-js.
 *
 * Medido en el navegador con un back de 7 s: cada carga con sesión corría el
 * `claim` + `GET /users/me/bootstrap` DOS veces seguidas —el SIGNED_IN que
 * auth-js emite mientras se inicializa (`_recoverAndRefresh`) y el
 * INITIAL_SESSION de enseguida— y los esperaba ADENTRO del callback, con el
 * candado de auth-js (que es entre pestañas) tomado. La sesión se confirmaba a
 * los ~15 s.
 *
 * - El callback de auth-js devuelve sin esperar la red (SIGNED_IN,
 *   INITIAL_SESSION y TOKEN_REFRESHED).
 * - INITIAL_SESSION de la MISMA sesión que el SIGNED_IN de la misma carga no
 *   repite el `claim` ni el bootstrap, y no descarta el arranque en vuelo.
 * - Otra sesión, o un SIGNED_OUT de por medio, sí arranca de nuevo.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type AuthEventCallback = (event: string, session: unknown) => Promise<void> | void

const { authCallbacks, getMock, postMock, getAalMock } = vi.hoisted(() => ({
  authCallbacks: [] as AuthEventCallback[],
  getMock: vi.fn(),
  postMock: vi.fn(),
  getAalMock: vi.fn(),
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

import { AuthProvider, AuthContext } from './auth-context'
import { resetSessionTerminal } from './session-terminal'
import type { AuthContextType } from './types'

function sesion(token: string, userId = 'sb-1', expiraEn = 2_000_000_000) {
  return {
    access_token: token,
    expires_at: expiraEn,
    user: { id: userId, email: `${userId}@inmobiliaria.co`, app_metadata: { providers: ['email'] }, user_metadata: {} },
  }
}

function bootstrapDe(email: string) {
  return {
    user: { id: 'u-' + email, email, firstName: 'Nico', lastName: 'García', onboardingCompletedAt: '2026-06-01T00:00:00.000Z' },
    role: 'AGENT',
    agency: { id: 'ag-1', name: 'Inmobiliaria', memberRole: 'ADMIN', memberStatus: 'ACTIVE' },
    subscription: null,
    onboarding: null,
    errors: [],
    segundoFactor: { exigido: false },
  }
}

let container: HTMLDivElement
let root: Root
let captured: AuthContextType | null = null

function Probe() {
  captured = React.useContext(AuthContext)
  return null
}

const callback = () => authCallbacks[authCallbacks.length - 1]
const bootstraps = () => getMock.mock.calls.filter((c) => c[0] === '/users/me/bootstrap')
const claims = () => postMock.mock.calls.filter((c) => c[0] === '/auth/session/claim')

/** Deja correr todo lo pendiente (microtareas y un par de turnos de reloj). */
async function vaciar() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      for (let j = 0; j < 20; j++) await Promise.resolve()
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

/** ¿La promesa del callback ya se resolvió? (sin esperarla de verdad) */
async function yaDevolvio(p: Promise<void> | void): Promise<boolean> {
  let devolvio = false
  void Promise.resolve(p).then(() => { devolvio = true })
  await act(async () => {
    for (let j = 0; j < 20; j++) await Promise.resolve()
  })
  return devolvio
}

beforeEach(async () => {
  resetSessionTerminal()
  authCallbacks.length = 0
  captured = null
  getMock.mockReset().mockImplementation((path: string, token?: string) =>
    path === '/users/me/bootstrap'
      ? Promise.resolve(bootstrapDe(`${token}@x.co`))
      : path === '/users/me'
        ? Promise.resolve({ ...bootstrapDe(`${token}@x.co`).user, role: 'AGENT' })
        : Promise.reject(new Error(`no simulado: ${path}`)),
  )
  postMock.mockReset().mockResolvedValue({ superseded: false })
  getAalMock.mockReset().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null })
  localStorage.clear()
  sessionStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('el callback de auth-js no espera la red (el candado se suelta enseguida)', () => {
  const nuncaContesta = () => new Promise(() => {})

  it('SIGNED_IN devuelve con el bootstrap todavía en vuelo', async () => {
    getMock.mockImplementation(nuncaContesta)
    const p = callback()('SIGNED_IN', sesion('tok-a'))
    expect(await yaDevolvio(p)).toBe(true)
    expect(bootstraps()).toHaveLength(1)
  })

  it('INITIAL_SESSION devuelve con el bootstrap todavía en vuelo', async () => {
    getMock.mockImplementation(nuncaContesta)
    const p = callback()('INITIAL_SESSION', sesion('tok-a'))
    expect(await yaDevolvio(p)).toBe(true)
    expect(bootstraps()).toHaveLength(1)
  })

  it('INITIAL_SESSION devuelve aunque el claim no conteste', async () => {
    postMock.mockImplementation(nuncaContesta)
    const p = callback()('INITIAL_SESSION', sesion('tok-a'))
    expect(await yaDevolvio(p)).toBe(true)
  })

  it('TOKEN_REFRESHED devuelve con `/users/me` todavía en vuelo', async () => {
    getMock.mockImplementation(nuncaContesta)
    const p = callback()('TOKEN_REFRESHED', sesion('tok-a'))
    expect(await yaDevolvio(p)).toBe(true)
    expect(getMock).toHaveBeenCalledWith('/users/me', 'tok-a')
  })
})

describe('un arranque por carga: INITIAL_SESSION reusa el del SIGNED_IN de la misma sesión', () => {
  it('🔴 SIGNED_IN y luego INITIAL_SESSION de la misma sesión: un claim, un bootstrap, y entra', async () => {
    void callback()('SIGNED_IN', sesion('tok-a'))
    void callback()('INITIAL_SESSION', sesion('tok-a'))
    await vaciar()
    expect(claims()).toHaveLength(1)
    expect(bootstraps()).toHaveLength(1)
    expect(captured!.isLoading).toBe(false)
    expect(captured!.user?.email).toBe('tok-a@x.co')
    expect(captured!.mfaCheckStatus).toBe('verified')
  })

  it('la misma sesión leída en otro objeto (mismo usuario y misma expiración) también se reusa', async () => {
    void callback()('SIGNED_IN', sesion('tok-a', 'sb-1', 1_900_000_000))
    void callback()('INITIAL_SESSION', sesion('tok-a-otra-copia', 'sb-1', 1_900_000_000))
    await vaciar()
    expect(bootstraps()).toHaveLength(1)
    expect(captured!.user?.email).toBe('tok-a@x.co')
  })

  it('no descarta el arranque en vuelo: el bootstrap del SIGNED_IN contesta DESPUÉS del INITIAL_SESSION y se entra con él', async () => {
    let soltar!: (v: unknown) => void
    getMock.mockImplementation((path: string) =>
      path === '/users/me/bootstrap' ? new Promise((r) => { soltar = r }) : Promise.reject(new Error(path)),
    )
    void callback()('SIGNED_IN', sesion('tok-a'))
    await vaciar()
    void callback()('INITIAL_SESSION', sesion('tok-a'))
    await vaciar()
    expect(captured!.isLoading).toBe(true)
    await act(async () => {
      soltar(bootstrapDe('del-signed-in@x.co'))
    })
    await vaciar()
    expect(bootstraps()).toHaveLength(1)
    expect(captured!.isLoading).toBe(false)
    expect(captured!.user?.email).toBe('del-signed-in@x.co')
  })

  it('INITIAL_SESSION de OTRA sesión sí arranca de nuevo y gana', async () => {
    void callback()('SIGNED_IN', sesion('tok-a', 'sb-1'))
    void callback()('INITIAL_SESSION', sesion('tok-b', 'sb-2'))
    await vaciar()
    // Dos claims (uno por sesión); el arranque de la vieja se corta tras su
    // claim (la generación cambió) y el de la nueva hace su bootstrap.
    expect(claims()).toHaveLength(2)
    expect(bootstraps().map((c) => c[1])).toEqual(['tok-b'])
    expect(captured!.user?.email).toBe('tok-b@x.co')
  })

  it('con un SIGNED_OUT de por medio, INITIAL_SESSION con sesión arranca de nuevo', async () => {
    void callback()('SIGNED_IN', sesion('tok-a'))
    await vaciar()
    await act(async () => {
      await callback()('SIGNED_OUT', null)
    })
    void callback()('INITIAL_SESSION', sesion('tok-a'))
    await vaciar()
    expect(bootstraps()).toHaveLength(2)
    expect(captured!.user?.email).toBe('tok-a@x.co')
  })

  it('sin SIGNED_IN antes (la suscripción llegó tarde), INITIAL_SESSION arranca como siempre', async () => {
    void callback()('INITIAL_SESSION', sesion('tok-a'))
    await vaciar()
    expect(claims()).toHaveLength(1)
    expect(bootstraps()).toHaveLength(1)
    expect(captured!.isLoading).toBe(false)
    expect(captured!.user?.email).toBe('tok-a@x.co')
  })
})
