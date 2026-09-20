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

const {
  getMock,
  postMock,
  supabaseSignOutMock,
  signInWithPasswordMock,
  authCallbacks,
  getAalMock,
  listFactorsMock,
  setAccessTokenMock,
  setMfaPendingFlagMock,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  // Resolves so the single-session claim (POST /auth/session/claim) in the
  // bootstrap path returns a promise (its .catch/await must not throw).
  postMock: vi.fn().mockResolvedValue({ superseded: false }),
  supabaseSignOutMock: vi.fn().mockResolvedValue({ error: null }),
  signInWithPasswordMock: vi.fn(),
  authCallbacks: [] as AuthEventCallback[],
  // T-0099: controllable per test — the default (no aal data) matches "MFA
  // not required", most tests don't care about it.
  getAalMock: vi.fn().mockResolvedValue({ data: null }),
  // T-0099: only consulted when segundoFactorExigidoRef is true AND
  // nextLevel isn't already 'aal2' — most tests never reach it.
  listFactorsMock: vi.fn().mockResolvedValue({ data: { totp: [] } }),
  setAccessTokenMock: vi.fn(),
  setMfaPendingFlagMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (cb: AuthEventCallback) => {
        authCallbacks.push(cb)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signOut: supabaseSignOutMock,
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => getAalMock(...args),
        listFactors: (...args: unknown[]) => listFactorsMock(...args),
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
    setAccessToken: (...args: unknown[]) => setAccessTokenMock(...args),
    setUnauthorizedHandler: vi.fn(),
    setTokenRefresher: vi.fn(),
    clearInFlightGets: vi.fn(),
    setMfaPendingFlag: (...args: unknown[]) => setMfaPendingFlagMock(...args),
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

/**
 * T-0082 WU-2b: `GET /users/me/bootstrap` replaced `GET /users/me` +
 * `GET /inmobiliaria/agency` as the login path's single call — `getMock` now
 * answers this ONE path, so every fixture below builds the composed envelope
 * (contract.md §3.2) instead of a flat `/users/me` body.
 */
function bootstrapEnvelope(
  user: Record<string, unknown>,
  role: string,
  agency: Record<string, unknown> | null = null,
  errors: string[] = [],
  // T-0099: omitted entirely by default — exercises the "older back build"
  // degradation path (getBootstrap defaults it to { exigido: false }).
  segundoFactor?: { exigido: boolean },
) {
  return { user, role, agency, subscription: null, onboarding: null, errors, segundoFactor }
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
  // El chequeo de MFA (y con él, soltar el loader en INITIAL_SESSION) corre en
  // un `setTimeout(0)`, después de que el callback devolvió y auth-js soltó su
  // lock — ver `alSoltarElLock` en auth-context.tsx. Un tick de macrotarea.
  await act(async () => {
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0)
    else await new Promise((resolve) => setTimeout(resolve, 0))
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
  signInWithPasswordMock.mockReset()
  getAalMock.mockReset().mockResolvedValue({ data: null })
  listFactorsMock.mockReset().mockResolvedValue({ data: { totp: [] } })
  setAccessTokenMock.mockClear()
  setMfaPendingFlagMock.mockClear()
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
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: null },
      'TENANT',
    ))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user).not.toBeNull()
    expect(captured!.user!.firstName).toBe('Ana')
    expect(captured!.user!.onboardingCompleted).toBe(false)
    expect(captured!.user!.profileSource).toBe('backend')
  })

  it('flag set → onboardingCompleted', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-06-01T12:00:00.000Z' },
      'TENANT',
    ))
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

/*
 * 🔴 Nico, 2026-09-11: se le cayó el back mientras trabajaba en el panel de la
 * inmobiliaria y la app lo mandó al portal del INQUILINO. La cadena empieza
 * acá: sin `/users/me`, este fallback fijaba `role: 'tenant'` para todo el
 * mundo, y ese rol inventado viajaba hasta el gate de navegación.
 */
describe('AuthProvider — el perfil degradado no inventa un rol', () => {
  it('usa el perfil que la persona eligió al registrarse, no «tenant» a la fuerza', async () => {
    getMock.mockRejectedValue(new ApiError(503, 'Service unavailable'))
    const sesionDeAgencia = {
      ...fakeSession,
      user: { ...fakeSession.user, user_metadata: { full_name: 'Ana Pérez', intended_role: 'agency' } },
    }
    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', sesionDeAgencia)
    })
    await act(async () => {
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    })

    expect(captured!.user!.profileSource).toBe('session')
    expect(captured!.user!.role).toBe('agency')
  })

  it('sin perfil elegido sigue cayendo en «tenant» (comportamiento de siempre)', async () => {
    getMock.mockRejectedValue(new ApiError(503, 'Service unavailable'))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.role).toBe('tenant')
  })

  it('cuando el back vuelve, el perfil degradado se cura solo', async () => {
    vi.useFakeTimers()
    try {
      // Primero cae; después responde el perfil real de agencia.
      getMock.mockImplementation((path: string) => {
        if (path === '/inmobiliaria/agency') return Promise.reject(new ApiError(404, 'no membership'))
        return Promise.reject(new ApiError(503, 'Service unavailable'))
      })
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
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      expect(captured!.user!.profileSource).toBe('session')

      // El back vuelve.
      getMock.mockImplementation((path: string) => {
        if (path === '/inmobiliaria/agency') return Promise.reject(new ApiError(404, 'no membership'))
        return Promise.resolve({
          id: 'u1', email: 'ana@example.com', firstName: 'Ana', role: 'AGENT',
          onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
        })
      })
      await act(async () => { await vi.advanceTimersByTimeAsync(50) })

      expect(captured!.user!.profileSource).toBe('backend')
      expect(captured!.user!.role).toBe('agency')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('AuthProvider — agency membership detection (personal-role coexistence)', () => {
  const TENANT = {
    id: 'u1',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  }

  it('ACTIVE membership on a TENANT → hasActiveAgencyMembership true, checked, default personal context', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(TENANT, 'TENANT', {
      id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE', permissions: null,
    }))
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
    getMock.mockResolvedValue(bootstrapEnvelope(TENANT, 'TENANT', {
      id: 'ag-1', name: 'ABC', memberRole: null, memberStatus: 'INVITED', permissions: null,
    }))
    await renderProviderAndEmitInitialSession()

    expect(captured!.agencyMemberStatus).toBe('INVITED')
    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMembershipChecked).toBe(true)
    expect(captured!.activeContext).toBe('personal')
  })

  it('no membership (agency: null, errors: []) → soft no-membership, no throw, checked true', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(TENANT, 'TENANT', null, []))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.role).toBe('tenant')
    expect(captured!.agencyMemberStatus).toBeNull()
    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMembershipChecked).toBe(true)
  })

  it('a pure-agency user resolves ACTIVE membership and an agency active-context', async () => {
    const AGENT = { ...TENANT, id: 'u2' }
    getMock.mockResolvedValue(bootstrapEnvelope(AGENT, 'AGENT', {
      id: 'ag-9', name: 'Big', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null,
    }))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user!.role).toBe('agency')
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    // Pure agency → context is always 'agency' (no switcher).
    expect(captured!.activeContext).toBe('agency')
  })

  it('confirmed no-membership AFTER an ACTIVE membership (via refreshUser) → DOWNGRADES agency/status (revoked loses access)', async () => {
    let bootstrapCall = 0
    getMock.mockImplementation(() => {
      bootstrapCall++
      return Promise.resolve(
        bootstrapCall === 1
          ? bootstrapEnvelope(TENANT, 'TENANT', { id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE', permissions: null })
          : bootstrapEnvelope(TENANT, 'TENANT', null, []),
      )
    })
    await renderProviderAndEmitInitialSession()
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    expect(captured!.agency?.id).toBe('ag-1')

    await act(async () => {
      await captured!.refreshUser()
    })
    // Confirmed no-membership (second bootstrap's own composed verdict) → downgraded.
    expect(captured!.hasActiveAgencyMembership).toBe(false)
    expect(captured!.agencyMemberStatus).toBeNull()
    expect(captured!.agency).toBeNull()
  })

  it('transient agency_unavailable AFTER an ACTIVE membership (via refreshUser) → KEEPS the last ACTIVE (no flap)', async () => {
    let bootstrapCall = 0
    getMock.mockImplementation(() => {
      bootstrapCall++
      return Promise.resolve(
        bootstrapCall === 1
          ? bootstrapEnvelope(TENANT, 'TENANT', { id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE', permissions: null })
          : bootstrapEnvelope(TENANT, 'TENANT', null, ['agency_unavailable']),
      )
    })
    await renderProviderAndEmitInitialSession()
    expect(captured!.hasActiveAgencyMembership).toBe(true)

    await act(async () => {
      await captured!.refreshUser()
    })
    // Transient → keep the last known ACTIVE membership (applyAgencyFetchResult's
    // "never downgrade on a transient failure" rule, unchanged by WU-2b).
    expect(captured!.hasActiveAgencyMembership).toBe(true)
    expect(captured!.agency?.id).toBe('ag-1')
  })
})

/**
 * T-0082 WU-2b brief §4.5 — the six required TDD cases, verified directly
 * against `GET /users/me/bootstrap`. (a)-(c) and (f) here; (d) belongs to
 * `PermissionsContext.test.tsx` (the `permissions` seed only auth-context can
 * hand off, but only PermissionsContext consumes); (e) is covered by
 * `bootstrap.service.test.ts` (the `errors` default lives in that thin
 * client, one layer below auth-context).
 */
describe('AuthProvider — bootstrap contract cases (wu-2b-front-brief.md §4.5)', () => {
  const TENANT = {
    id: 'u1',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  }

  it('(a) one sign-in → exactly one GET /users/me/bootstrap; never the standalone /users/me or /inmobiliaria/agency', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(TENANT, 'TENANT', {
      id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE', permissions: null,
    }))
    await renderProviderAndEmitInitialSession()

    const bootstrapCalls = getMock.mock.calls.filter((c) => c[0] === '/users/me/bootstrap')
    const userMeCalls = getMock.mock.calls.filter((c) => c[0] === '/users/me')
    const agencyCalls = getMock.mock.calls.filter((c) => c[0] === '/inmobiliaria/agency')
    expect(bootstrapCalls).toHaveLength(1)
    expect(userMeCalls).toHaveLength(0)
    expect(agencyCalls).toHaveLength(0)
  })

  it('(b) agency: null + errors: [] → confirmed no membership, NO self-heal (no /inmobiliaria/agency call even after the retry window)', async () => {
    vi.useFakeTimers()
    try {
      getMock.mockResolvedValue(bootstrapEnvelope(TENANT, 'TENANT', null, []))
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
      expect(captured!.agencyMembershipChecked).toBe(true)
      expect(captured!.agency).toBeNull()

      // Past the self-heal retry delay (2s) and well beyond — still nothing.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      const agencyCalls = getMock.mock.calls.filter((c) => c[0] === '/inmobiliaria/agency')
      expect(agencyCalls).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('(c) agency: null + errors: ["agency_unavailable"] → exactly ONE self-heal retry via the standalone GET /inmobiliaria/agency', async () => {
    vi.useFakeTimers()
    try {
      getMock.mockImplementation((path: string) => {
        if (path === '/inmobiliaria/agency') {
          return Promise.resolve({ id: 'ag-1', name: 'Recovered', memberRole: 'ADMIN', memberStatus: 'ACTIVE' })
        }
        return Promise.resolve(bootstrapEnvelope(TENANT, 'TENANT', null, ['agency_unavailable']))
      })
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
      // Bootstrap resolved (200, transient section) — checked flips immediately,
      // no extra request yet.
      expect(captured!.agencyMembershipChecked).toBe(true)
      expect(captured!.agency).toBeNull()
      expect(getMock.mock.calls.filter((c) => c[0] === '/inmobiliaria/agency')).toHaveLength(0)

      // The self-heal retry fires after AGENCY_SELF_HEAL_RETRY_DELAY_MS (2s).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      const agencyCalls = getMock.mock.calls.filter((c) => c[0] === '/inmobiliaria/agency')
      expect(agencyCalls).toHaveLength(1)
      expect(captured!.agency?.id).toBe('ag-1')

      // No second automatic retry — single guarded retry only (WU-1, unchanged).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })
      expect(getMock.mock.calls.filter((c) => c[0] === '/inmobiliaria/agency')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('(f) plain 401 (no code) from bootstrap → same handling as fetchUser\'s 401 today: user stays null, loader settles, no crash', async () => {
    getMock.mockRejectedValue(new ApiError(401, 'No autorizado'))
    await renderProviderAndEmitInitialSession()

    expect(captured!.user).toBeNull()
    expect(captured!.needsOnboarding).toBe(false)
    expect(captured!.isLoading).toBe(false)
  })
})

describe('AuthProvider — sesión única: «otro dispositivo» tiene que ser otro dispositivo', () => {
  const usuario = {
    id: 'u1',
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    onboardingCompletedAt: '2026-06-01T12:00:00.000Z',
  }

  it('el claim manda el id estable de este navegador, el mismo en cada login', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(usuario, 'TENANT'))
    await renderProviderAndEmitInitialSession()

    const claims = postMock.mock.calls.filter((c) => c[0] === '/auth/session/claim')
    expect(claims).toHaveLength(1)
    const body = claims[0][1] as { deviceId?: string }
    expect(body.deviceId).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(localStorage.getItem('leasefy:device-id')).toBe(body.deviceId)
    expect(claims[0][2]).toBe('jwt-token')
  })

  it('cerrar sesión revoca en el SERVIDOR con el token todavía vivo: el siguiente login no encuentra una sesión «de otro dispositivo»', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(usuario, 'TENANT'))
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
    getMock.mockResolvedValue(bootstrapEnvelope(usuario, 'TENANT'))
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
    getMock.mockResolvedValue(bootstrapEnvelope(usuario, 'TENANT'))
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

/**
 * T-0082 WU-1 (F1) — `signInWithEmail` used to run its own claim/fetchUser/MFA
 * sequence IN ADDITION to the `onAuthStateChange` listener's SIGNED_IN
 * handling of the very same sign-in, doubling `/users/me` (both calls used an
 * explicit token, which bypassed `compartirGet`'s dedup — see client.ts). The
 * listener is now the bootstrap's single owner; `signInWithEmail` only
 * authenticates against Supabase and waits for the listener's own run.
 */
describe('AuthProvider — single bootstrap owner (signInWithEmail delegates to the SIGNED_IN listener)', () => {
  it('one sign-in produces exactly one GET /users/me/bootstrap and one POST /auth/session/claim — never the standalone /users/me or /inmobiliaria/agency', async () => {
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'TENANT',
      { id: 'ag-1', name: 'ABC', memberRole: 'AGENTE', memberStatus: 'ACTIVE', permissions: null },
    ))
    // Mimics supabase-js: signInWithPassword notifies onAuthStateChange
    // (SIGNED_IN) as part of establishing the session, before its own promise
    // settles.
    signInWithPasswordMock.mockImplementation(async () => {
      const cb = authCallbacks[authCallbacks.length - 1]
      await cb?.('SIGNED_IN', fakeSession)
      return { data: { session: fakeSession }, error: null }
    })

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    // No session yet — mirrors visiting /auth logged out.
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', null)
    })

    let signInResult: Awaited<ReturnType<AuthContextType['signInWithEmail']>> = null
    await act(async () => {
      const pending = captured!.signInWithEmail('ana@example.com', 'secret')
      // The SIGNED_IN handler's MFA check (and the waiter resolve after it)
      // runs on a `setTimeout(0)` — see `alSoltarElLock` in auth-context.tsx.
      await new Promise((resolve) => setTimeout(resolve, 0))
      signInResult = await pending
    })

    expect(signInResult).not.toBeNull()
    expect(signInResult!.role).toBe('tenant')

    const bootstrapCalls = getMock.mock.calls.filter((c) => c[0] === '/users/me/bootstrap')
    const userMeCalls = getMock.mock.calls.filter((c) => c[0] === '/users/me')
    const agencyCalls = getMock.mock.calls.filter((c) => c[0] === '/inmobiliaria/agency')
    const claimCalls = postMock.mock.calls.filter((c) => c[0] === '/auth/session/claim')
    expect(bootstrapCalls).toHaveLength(1)
    // Agency arrived bundled in the SAME bootstrap call — the whole point of
    // T-0082 WU-2b is that neither of these fires at all on this path.
    expect(userMeCalls).toHaveLength(0)
    expect(agencyCalls).toHaveLength(0)
    expect(claimCalls).toHaveLength(1)
    expect(captured!.agency?.id).toBe('ag-1')
  })

  it('signInWithEmail still resolves null on the 409 duplicate-identity bootstrap failure, without calling the bootstrap a second time', async () => {
    const message = 'Ya existe una cuenta registrada con este correo. Inicia sesión con tu cuenta original.'
    getMock.mockRejectedValue(new ApiError(409, message))
    signInWithPasswordMock.mockImplementation(async () => {
      const cb = authCallbacks[authCallbacks.length - 1]
      await cb?.('SIGNED_IN', fakeSession)
      return { data: { session: fakeSession }, error: null }
    })

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', null)
    })

    let signInResult: Awaited<ReturnType<AuthContextType['signInWithEmail']>> = null
    await act(async () => {
      const pending = captured!.signInWithEmail('ana@example.com', 'secret')
      await new Promise((resolve) => setTimeout(resolve, 0))
      signInResult = await pending
    })

    expect(signInResult).toBeNull()
    expect(sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY)).toBe(message)
    // Exactly one bootstrap call — the listener's, not a second one from
    // signInWithEmail (which no longer calls the bootstrap at all).
    const bootstrapCalls = getMock.mock.calls.filter((c) => c[0] === '/users/me/bootstrap')
    expect(bootstrapCalls).toHaveLength(1)
  })
})

/**
 * T-0099: the back requires aal2 for ADMIN/CONTADOR agency roles. `isLoading`
 * starts `true` at mount and is released by whichever auth event fires
 * FIRST. Two branches released it BEFORE the deferred MFA check
 * (`alSoltarElLock`, a setTimeout(0) — auth-js holds its session lock across
 * the callback, so `checkMfaLevel` can never run synchronously inside it)
 * had a chance to set `mfaRequired`:
 *
 *  - `TOKEN_REFRESHED`, which the file's own comment already documents as
 *    able to be "the very first event on page load" (Supabase auto-refreshed
 *    an expired token before ever emitting INITIAL_SESSION — the classic
 *    "left the panel tab open overnight, came back" case);
 *  - `SIGNED_IN` when it is the first event a fresh AuthProvider mount ever
 *    sees (`setSession` from `/auth/enlace`'s magic-link code exchange, not
 *    behind a prior INITIAL_SESSION on the same mount).
 *
 * In that one-macrotask window ProtectedRoute saw isLoading=false +
 * mfaRequired=false (stale default) and mounted the agency panel — firing
 * every protected hook/provider under it with an aal1 token, all 403ing with
 * SEGUNDO_FACTOR_REQUERIDO — before the MFA check landed a tick later and
 * redirected to /auth/mfa-verify. INITIAL_SESSION never had this bug (it
 * already deferred isLoading's release until after the MFA check); both
 * branches are now aligned with it.
 */
describe('AuthProvider — T-0099: MFA-pending gate (isLoading must not release before mfaRequired is known)', () => {
  // Fake timers make the "callback returned, but the setTimeout(0) hasn't
  // fired yet" window deterministic. Under real timers this window is only
  // ONE macrotask wide — a single extra microtask hop inside `fetchUser`/
  // `fetchBootstrap`'s mock resolution (V8/event-loop scheduling, not
  // anything this test controls) was enough to occasionally let the
  // setTimeout(0) fire before the assertion ran, flaking the test both ways.
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TOKEN_REFRESHED as the very first event (documented page-load edge case) with a pending step-up: isLoading stays true until the deferred MFA check resolves', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } })
    getMock.mockResolvedValue({
      id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', role: 'AGENT',
    })

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })

    // isLoading is still the default `true` — no prior auth event has fired
    // on this mount.
    expect(captured!.isLoading).toBe(true)

    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('TOKEN_REFRESHED', fakeSession)
    })

    // The callback already returned — auth-js's lock is free — but the
    // deferred MFA check (next macrotask) has not run yet. This is EXACTLY
    // the window ProtectedRoute reads via `isLoading`/`mfaRequired`.
    expect(captured!.isLoading).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(captured!.isLoading).toBe(false)
    expect(captured!.mfaRequired).toBe(true)
  })

  it('SIGNED_IN as the very first event (e.g. /auth/enlace magic-link exchange) with a pending step-up: isLoading stays true until the deferred MFA check resolves', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })

    expect(captured!.isLoading).toBe(true)

    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
    })

    expect(captured!.isLoading).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(captured!.isLoading).toBe(false)
    expect(captured!.mfaRequired).toBe(true)
  })

  it('TOKEN_REFRESHED with no MFA requirement (aal1→aal1): releases isLoading normally, no regression for non-MFA users', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    getMock.mockResolvedValue({
      id: 'u2', email: 'ines@example.com', firstName: 'Inés', lastName: 'Gómez', role: 'TENANT',
    })

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('TOKEN_REFRESHED', fakeSession)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(captured!.isLoading).toBe(false)
    expect(captured!.mfaRequired).toBe(false)
    expect(captured!.user?.role).toBe('tenant')
  })
})

/**
 * T-0099: `supabase.auth.mfa.verify()` (called from /auth/mfa-verify)
 * upgrades the session to aal2 and notifies subscribers with
 * `MFA_CHALLENGE_VERIFIED` (see @supabase/auth-js GoTrueClient#_verify) —
 * an event `onAuthStateChange` did not handle at all before this fix. The
 * in-memory token `apiClient` uses (`setAccessToken`) was therefore never
 * updated to the fresh aal2 token: the panel's very first post-verify
 * fetches could still 403 with a token that LOOKED released
 * (`mfaRequired` had been flipped by the page's own optimistic
 * `setMfaVerified()`) but was still aal1 under the hood.
 */
describe('AuthProvider — T-0099: MFA_CHALLENGE_VERIFIED releases the gate with the NEW aal2 token', () => {
  it('updates the access token synchronously within the event, then clears mfaRequired once the deferred recheck confirms aal2', async () => {
    getAalMock.mockResolvedValueOnce({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', null)
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(captured!.mfaRequired).toBe(true)

    setAccessTokenMock.mockClear()
    getAalMock.mockResolvedValueOnce({ data: { currentLevel: 'aal2', nextLevel: 'aal2' } })
    const verifiedSession = { ...fakeSession, access_token: 'jwt-token-aal2' }

    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('MFA_CHALLENGE_VERIFIED', verifiedSession)
    })

    // Synchronous within the event — no `await` needed to see it, matching
    // every other branch's `setAccessToken(session.access_token)`.
    expect(setAccessTokenMock).toHaveBeenCalledWith('jwt-token-aal2')
    // mfaRequired has NOT been recomputed yet — checkMfaLevel is deferred,
    // same reason as everywhere else (auth-js's session lock).
    expect(captured!.mfaRequired).toBe(true)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(captured!.mfaRequired).toBe(false)
  })
})

/**
 * T-0099: `clasificar.ts` cannot read React context — it mirrors
 * `mfaRequired` into `apiClient`'s module state (`setMfaPendingFlag`) so a
 * SEGUNDO_FACTOR_REQUERIDO 403 that slips through during the pending window
 * can be told apart from a user who genuinely never enabled MFA.
 */
describe('AuthProvider — T-0099: mirrors mfaRequired into apiClient (setMfaPendingFlag)', () => {
  it('pushes true once the pending step-up is known, and false once MFA_CHALLENGE_VERIFIED releases it', async () => {
    getAalMock.mockResolvedValueOnce({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('INITIAL_SESSION', null)
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(setMfaPendingFlagMock).toHaveBeenLastCalledWith(true)

    getAalMock.mockResolvedValueOnce({ data: { currentLevel: 'aal2', nextLevel: 'aal2' } })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1](
        'MFA_CHALLENGE_VERIFIED',
        { ...fakeSession, access_token: 'jwt-token-aal2' },
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(setMfaPendingFlagMock).toHaveBeenLastCalledWith(false)
  })
})

/**
 * T-0099 contract (`.orchestration/tasks/T-0099-mfa-pending-gate/contract.md`
 * §3): the back's `segundoFactor.exigido` (bootstrap) tells the front a role
 * requires aal2 even when Supabase's own aal pair can't — a user with NO
 * enrolled factor has `nextLevel: 'aal1'`, identical to "no requirement at
 * all". `mfaEnrollRequired` covers exactly that gap; `mfaRequired` keeps
 * covering "has a factor, hasn't stepped up this sign-in".
 */
describe('AuthProvider — T-0099: mfaEnrollRequired (segundoFactor.exigido, no factor enrolled)', () => {
  it('exigido:true + no verified TOTP factor + aal1 → enroll-pending (mfaEnrollRequired), NOT verify-pending', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    listFactorsMock.mockResolvedValue({ data: { totp: [] } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
      [],
      { exigido: true },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(captured!.mfaEnrollRequired).toBe(true)
    expect(captured!.mfaRequired).toBe(false)
    expect(listFactorsMock).toHaveBeenCalled()
  })

  it('exigido:true + a verified TOTP factor exists + aal1 → verify-pending (mfaRequired), NOT enroll-pending — no listFactors needed', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
      [],
      { exigido: true },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(captured!.mfaRequired).toBe(true)
    expect(captured!.mfaEnrollRequired).toBe(false)
    // nextLevel already proved a factor exists — asking again is redundant.
    expect(listFactorsMock).not.toHaveBeenCalled()
  })

  it('bootstrap omits `segundoFactor` entirely (older back build) → treated as exigido:false, no pre-emptive gate at all', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
      // no segundoFactor arg — omitted, exactly like an older back build
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(captured!.mfaEnrollRequired).toBe(false)
    expect(captured!.mfaRequired).toBe(false)
    expect(listFactorsMock).not.toHaveBeenCalled()
  })

  it('exigido:true + aal2 already (verified this session): releases both pending states, no listFactors call', async () => {
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
      [],
      { exigido: true },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(captured!.mfaRequired).toBe(false)
    expect(captured!.mfaEnrollRequired).toBe(false)
    expect(listFactorsMock).not.toHaveBeenCalled()
  })
})

/**
 * T-0099 WU-4 (verify caveat): SIGNED_OUT reset `mfaRequired` but never
 * `mfaEnrollRequired` or `segundoFactorExigidoRef` — an asymmetry. Inert
 * today (isLoading gating + hard redirects mean nothing reads the stale
 * value before the next sign-in's own bootstrap overwrites it), but a
 * logout while enroll-pending followed by a DIFFERENT user logging in must
 * start from a clean slate, not carry over the previous member's pending
 * state for even one render.
 */
describe('AuthProvider — T-0099 WU-4: SIGNED_OUT clears MFA pending state (mfaRequired, mfaEnrollRequired)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sign in exigido:true + no factor → enroll-pending; SIGNED_OUT clears it; sign in as a DIFFERENT user with exigido:false → no gate at all', async () => {
    // Arrange: first user, enroll-pending.
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    listFactorsMock.mockResolvedValue({ data: { totp: [] } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'agency',
      { id: 'ag-1', name: 'ABC', memberRole: 'ADMIN', memberStatus: 'ACTIVE', permissions: null },
      [],
      { exigido: true },
    ))

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', fakeSession)
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(captured!.mfaEnrollRequired).toBe(true)

    // Act: sign out.
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_OUT', null)
    })

    // Assert: BOTH pending flags are clean, not just mfaRequired.
    expect(captured!.mfaRequired).toBe(false)
    expect(captured!.mfaEnrollRequired).toBe(false)

    // Act: a DIFFERENT user signs in, no requirement at all.
    getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    getMock.mockResolvedValue(bootstrapEnvelope(
      { id: 'u2', email: 'ines@example.com', firstName: 'Inés', lastName: 'Gómez', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
      'tenant',
      null,
      [],
      { exigido: false },
    ))
    const secondSession = { ...fakeSession, access_token: 'jwt-token-2', user: { ...fakeSession.user, id: 'sb-user-2' } }
    await act(async () => {
      await authCallbacks[authCallbacks.length - 1]('SIGNED_IN', secondSession)
      await vi.advanceTimersByTimeAsync(0)
    })

    // If segundoFactorExigidoRef had survived SIGNED_OUT uncleared, this
    // assertion would still pass here (the new bootstrap overwrites it) —
    // the REAL assertion is the SIGNED_OUT check above; this just confirms
    // the second sign-in ends up correct too.
    expect(captured!.mfaEnrollRequired).toBe(false)
    expect(captured!.mfaRequired).toBe(false)
    expect(captured!.user?.role).toBe('tenant')
  })
})
