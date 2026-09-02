/**
 * AuthProvider — backend-contract mapping and bootstrap error handling.
 *
 * Covers:
 * - onboardingCompleted maps from the backend `onboardingCompletedAt` flag
 *   (null → false even when Google metadata supplied a firstName; set → true);
 * - 409 on GET /users/me (duplicate identity: email belongs to another
 *   account) hands the backend message to the /auth screen via sessionStorage
 *   (AuthForm reads AUTH_BOOTSTRAP_ERROR_KEY on mount and shows its error
 *   banner), signs out of the Supabase session, and never falls back to the
 *   degraded session user (which would loop);
 * - 5xx still degrades to the session fallback with profileSource 'session'.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type AuthEventCallback = (event: string, session: unknown) => Promise<void> | void

const { getMock, postMock, supabaseSignOutMock, authCallbacks } = vi.hoisted(() => ({
  getMock: vi.fn(),
  // Resolves so the single-session claim (POST /auth/session/claim) in the
  // bootstrap path returns a promise (its .catch/await must not throw).
  postMock: vi.fn().mockResolvedValue({ superseded: false }),
  supabaseSignOutMock: vi.fn().mockResolvedValue({ error: null }),
  authCallbacks: [] as AuthEventCallback[],
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (cb: AuthEventCallback) => {
        authCallbacks.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signOut: supabaseSignOutMock,
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: null }),
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
    getAccessToken: () => 'jwt-token',
    setAccessToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
  }
})

vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthProvider, AuthContext, AUTH_BOOTSTRAP_ERROR_KEY, fetchAgencyWithTimeout } from './auth-context'
import { ApiError } from '@/lib/api/client'
import type { AuthContextType } from './types'

const fakeSession = {
  access_token: 'jwt-token',
  user: {
    id: 'sb-user-1',
    email: 'ana@example.com',
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    app_metadata: { providers: ['email'] },
    user_metadata: { full_name: 'Ana Pérez' },
  },
}

let container: HTMLDivElement
let root: Root
let captured: AuthContextType | null = null

function Probe() {
  captured = React.useContext(AuthContext)
  return null
}

async function renderProviderAndEmitInitialSession() {
  await act(async () => {
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
  })
  await act(async () => {
    await authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', fakeSession)
  })
  // The agency probe is fire-and-forget (isLoading no longer waits on it), so
  // flush microtasks to let it settle before asserting membership state. With
  // resolved/rejected mocks the probe wins its timeout race in microtasks.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  captured = null
  authCallbacks.length = 0
  getMock.mockReset()
  postMock.mockReset().mockResolvedValue({ superseded: false })
  supabaseSignOutMock.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('AuthProvider — onboardingCompletedAt flag mapping', () => {
  it('flag null + firstName present (Google metadata) → NOT onboardingCompleted', async () => {
    getMock.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Pérez',
      role: 'TENANT',
      onboardingCompletedAt: null,
    })
    await renderProviderAndEmitInitialSession()

    expect(captured!.user).not.toBeNull()
    expect(captured!.user!.firstName).toBe('Ana')
    expect(captured!.user!.onboardingCompleted).toBe(false)
    expect(captured!.user!.profileSource).toBe('backend')
  })

  it('flag set → onboardingCompleted', async () => {
    getMock.mockResolvedValue({
      id: 'u1',
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Pérez',
      role: 'TENANT',
      onboardingCompletedAt: '2026-06-01T12:00:00.000Z',
    })
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.onboardingCompleted).toBe(true)
    expect(captured!.user!.profileSource).toBe('backend')
  })
})

describe('AuthProvider — 409 duplicate identity on bootstrap', () => {
  it('hands the backend message to /auth via sessionStorage, signs out of Supabase, and does NOT fall back to a session user', async () => {
    const message =
      'Ya existe una cuenta registrada con este correo. Inicia sesión con tu cuenta original.'
    getMock.mockRejectedValue(new ApiError(409, message))
    await renderProviderAndEmitInitialSession()

    // AuthForm reads and clears this key on mount to show its error banner.
    expect(sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY)).toBe(message)
    expect(supabaseSignOutMock).toHaveBeenCalledWith({ scope: 'local' })
    // No degraded session fallback: the user stays null (no loop).
    expect(captured!.user).toBeNull()
    expect(captured!.needsOnboarding).toBe(false)
    expect(captured!.isLoading).toBe(false)
  })
})

describe('AuthProvider — degraded backend (5xx) still falls back to the session user', () => {
  it('maps a session-fallback user with profileSource "session"', async () => {
    getMock.mockRejectedValue(new ApiError(503, 'Service unavailable'))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user).not.toBeNull()
    expect(captured!.user!.profileSource).toBe('session')
    expect(supabaseSignOutMock).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY)).toBeNull()
  })
})

describe('AuthProvider — agency membership detection (personal-role coexistence)', () => {
  const TENANT = {
    id: 'u1',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    role: 'TENANT',
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  }

  /** Route apiClient.get by path: /inmobiliaria/agency → agencyResp, else userResp. */
  function routeGet(userResp: unknown, agencyResp: unknown | (() => Promise<unknown>)) {
    getMock.mockImplementation((path: string) => {
      if (path === '/inmobiliaria/agency') {
        return typeof agencyResp === 'function'
          ? (agencyResp as () => Promise<unknown>)()
          : Promise.resolve(agencyResp)
      }
      return Promise.resolve(userResp)
    })
  }

  it('ACTIVE membership on a TENANT → hasActiveAgencyMembership true, checked, default personal context', async () => {
    routeGet(TENANT, { id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE' })
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.role).toBe('tenant')
    expect(captured!.agencyMemberStatus).toBe('ACTIVE')
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    expect(captured!.agencyMembershipChecked).toBe(true)
    expect(captured!.agency?.id).toBe('ag-1')
    // Dual-context default is personal until the user switches.
    expect(captured!.activeContext).toBe('personal')
  })

  it('INVITED membership → hasActiveAgencyMembership false (not yet accepted)', async () => {
    routeGet(TENANT, { id: 'ag-1', name: 'ABC', memberStatus: 'INVITED' })
    await renderProviderAndEmitInitialSession()

    expect(captured!.agencyMemberStatus).toBe('INVITED')
    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMembershipChecked).toBe(true)
    expect(captured!.activeContext).toBe('personal')
  })

  it('no membership (404) → soft no-membership, no throw, checked true', async () => {
    routeGet(TENANT, () => Promise.reject(new ApiError(404, 'no membership')))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.role).toBe('tenant')
    expect(captured!.agencyMemberStatus).toBeNull()
    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMembershipChecked).toBe(true)
  })

  it('403 membership fetch is likewise treated as no membership', async () => {
    routeGet(TENANT, () => Promise.reject(new ApiError(403, 'forbidden')))
    await renderProviderAndEmitInitialSession()

    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMembershipChecked).toBe(true)
  })

  it('a pure-agency user resolves ACTIVE membership and an agency active-context', async () => {
    const AGENT = { ...TENANT, id: 'u2', role: 'AGENT' }
    routeGet(AGENT, { id: 'ag-9', name: 'Big', memberRole: 'ADMIN', memberStatus: 'ACTIVE' })
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.role).toBe('agency')
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    // Pure agency → context is always 'agency' (no switcher).
    expect(captured!.activeContext).toBe('agency')
  })

  it('confirmed 404 AFTER an ACTIVE membership → DOWNGRADES agency/status (revoked loses access)', async () => {
    let agencyCall = 0
    getMock.mockImplementation((path: string) => {
      if (path === '/inmobiliaria/agency') {
        agencyCall++
        return agencyCall === 1
          ? Promise.resolve({ id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE' })
          : Promise.reject(new ApiError(404, 'revoked'))
      }
      return Promise.resolve(TENANT)
    })
    await renderProviderAndEmitInitialSession()
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    expect(captured!.agency?.id).toBe('ag-1')

    await act(async () => {
      await captured!.refreshUser()
    })
    // Confirmed no-membership → downgraded.
    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMemberStatus).toBeNull()
    expect(captured!.agency).toBeNull()
  })

  it('transient 5xx AFTER an ACTIVE membership → KEEPS the last ACTIVE (no flap)', async () => {
    let agencyCall = 0
    getMock.mockImplementation((path: string) => {
      if (path === '/inmobiliaria/agency') {
        agencyCall++
        return agencyCall === 1
          ? Promise.resolve({ id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE' })
          : Promise.reject(new ApiError(503, 'down'))
      }
      return Promise.resolve(TENANT)
    })
    await renderProviderAndEmitInitialSession()
    expect(captured!.hasActiveAgencyMembership).toBe(true)

    await act(async () => {
      await captured!.refreshUser()
    })
    // Transient → keep the last known ACTIVE membership.
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    expect(captured!.agency?.id).toBe('ag-1')
  })

  it('CRITICAL: a hung probe flips agencyMembershipChecked via the PROBE timeout (8s), NOT the 5s net', async () => {
    vi.useFakeTimers()
    try {
      getMock.mockImplementation((path: string) =>
        path === '/inmobiliaria/agency'
          ? new Promise(() => {}) // never resolves — simulates a hung GET
          : Promise.resolve(TENANT),
      )
      await act(async () => {
        root.render(
          <AuthProvider>
            <Probe />
          </AuthProvider>,
        )
      })
      const handlerPromise = authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', fakeSession)

      // At t≈5.5s the 5s isLoading net has fired — but it must NOT touch the
      // membership gate: agencyMembershipChecked is still false (probe pending).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5500)
      })
      expect(captured!.agencyMembershipChecked).toBe(false)

      // Only the 8s probe timeout flips it (as a transient failure).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      await act(async () => {
        await handlerPromise
      })
      expect(captured!.agencyMembershipChecked).toBe(true)
      expect(captured!.hasActiveAgencyMembership).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a slow (5-8s) probe does NOT prematurely redirect a dual user — gate holds, then admits ACTIVE', async () => {
    vi.useFakeTimers()
    try {
      // The agency GET resolves ACTIVE at ~6s (cold serverless start), before
      // the 8s probe timeout.
      getMock.mockImplementation((path: string) =>
        path === '/inmobiliaria/agency'
          ? new Promise((resolve) =>
              setTimeout(
                () => resolve({ id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE' }),
                6000,
              ),
            )
          : Promise.resolve(TENANT),
      )
      await act(async () => {
        root.render(
          <AuthProvider>
            <Probe />
          </AuthProvider>,
        )
      })
      const handlerPromise = authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', fakeSession)

      // Past the 5s net but before the probe settles: the gate must still be
      // holding (checked=false) — NOT flipped to checked-without-membership.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5500)
      })
      expect(captured!.agencyMembershipChecked).toBe(false)
      expect(captured!.hasActiveAgencyMembership).toBe(false)

      // At ~6s the real ACTIVE result lands → admit (checked + membership true).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      await act(async () => {
        await handlerPromise
      })
      expect(captured!.agencyMembershipChecked).toBe(true)
      expect(captured!.hasActiveAgencyMembership).toBe(true)
      expect(captured!.agency?.id).toBe('ag-1')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('AuthProvider — sesión única: «otro dispositivo» tiene que ser otro dispositivo', () => {
  const usuario = {
    id: 'u1',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    role: 'TENANT',
    onboardingCompletedAt: '2026-06-01T12:00:00.000Z',
  }

  it('el claim manda el id estable de este navegador, el mismo en cada login', async () => {
    getMock.mockResolvedValue(usuario)
    await renderProviderAndEmitInitialSession()

    const claims = postMock.mock.calls.filter((c) => c[0] === '/auth/session/claim')
    expect(claims).toHaveLength(1)
    const body = claims[0][1] as { deviceId?: string }
    expect(body.deviceId).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(localStorage.getItem('leasefy:device-id')).toBe(body.deviceId)
    expect(claims[0][2]).toBe('jwt-token')
  })

  it('cerrar sesión revoca en el SERVIDOR con el token todavía vivo: el siguiente login no encuentra una sesión «de otro dispositivo»', async () => {
    getMock.mockResolvedValue(usuario)
    await renderProviderAndEmitInitialSession()

    await act(async () => {
      await captured!.signOut()
    })

    const revocaciones = postMock.mock.calls.filter((c) => c[0] === '/auth/session/revoke')
    expect(revocaciones).toHaveLength(1)
    expect(revocaciones[0][2]).toBe('jwt-token')
    // Y el id del navegador sobrevive al cierre: es lo que el próximo claim
    // tiene que volver a mandar para que sea «el mismo dispositivo».
    expect(localStorage.getItem('leasefy:device-id')).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })

  it('si la sesión ya fue desplazada, el revoke del cierre (401 SESSION_SUPERSEDED) NO encadena otro cierre', async () => {
    getMock.mockResolvedValue(usuario)
    await renderProviderAndEmitInitialSession()

    // El back rechaza el revoke como lo haría con una sesión desplazada, y el
    // cliente real dispara el backstop de 401 antes de tirar el error.
    const { setUnauthorizedHandler } = await import('@/lib/api/client')
    const handler = (setUnauthorizedHandler as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1)?.[0] as
      | ((code: string) => void)
      | undefined
    expect(handler).toBeTypeOf('function')
    postMock.mockImplementation((path: string) => {
      if (path === '/auth/session/revoke') {
        handler!('SESSION_SUPERSEDED')
        return Promise.reject(new ApiError(401, 'superseded'))
      }
      return Promise.resolve({ superseded: false })
    })

    await act(async () => {
      await captured!.signOut()
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const revocaciones = postMock.mock.calls.filter((c) => c[0] === '/auth/session/revoke')
    expect(revocaciones).toHaveLength(1)
    expect(captured!.user).toBeNull()
  })

  it('un back caído no traba el cierre de sesión', async () => {
    getMock.mockResolvedValue(usuario)
    await renderProviderAndEmitInitialSession()
    postMock.mockRejectedValue(new Error('backend caído'))

    await act(async () => {
      await captured!.signOut()
    })

    expect(captured!.user).toBeNull()
    expect(supabaseSignOutMock).toHaveBeenCalled()
  })
})

describe('fetchAgencyWithTimeout', () => {
  it('resolves as a transient failure when the fetch hangs past the timeout (bounds the probe)', async () => {
    vi.useFakeTimers()
    try {
      const p = fetchAgencyWithTimeout(() => new Promise(() => {}), undefined, 8000)
      await vi.advanceTimersByTimeAsync(8000)
      const result = await p
      expect(result.transientFailure).toBe(true)
      expect(result.confirmedNoMembership).toBe(false)
      expect(result.agency).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes through the underlying result when the fetch wins the race', async () => {
    const result = await fetchAgencyWithTimeout(
      () => Promise.resolve({ agency: { id: 'ag-1', name: 'X' }, role: 'ADMIN', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false }),
      'tok',
    )
    expect(result.agency?.id).toBe('ag-1')
    expect(result.memberStatus).toBe('ACTIVE')
  })
})
