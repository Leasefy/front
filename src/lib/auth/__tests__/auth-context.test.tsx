/**
 * auth-context.test.tsx — self-healing agency fetch.
 *
 * Bug under test: fetchAgency() only ever runs inside onAuthStateChange
 * handlers (one shot per auth event). If that single shot fails (network
 * blip, dev HMR partial reload), `agency` stays null for the rest of the
 * session with nothing ever re-requesting it — breaking useBetaChat and
 * the postulaciones panel, which both gate on `agency?.id`.
 *
 * This suite verifies AuthProvider:
 *   (1) self-heals: when `user` is agency-capable and `agency` is null,
 *       it retries `fetchAgencyProfile` with bounded backoff (0s/2s/8s)
 *       WITHOUT needing another Supabase auth event,
 *   (2) gives up after the backoff schedule is exhausted (no infinite loop),
 *   (3) exposes `refreshAgency()` to manually retry and re-arm the backstop,
 *   (4) never lets a failed fetch downgrade an already-loaded agency.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks — declared before importing the module under test.
// ---------------------------------------------------------------------------

type AuthEventHandler = (event: string, session: unknown) => void | Promise<void>

// `vi.mock` factories are hoisted above regular top-level declarations, so
// any mock fn referenced inside them must come from `vi.hoisted`.
const { fetchUserGetMock, fetchAgencyProfileMock, unsubscribeSpy } = vi.hoisted(() => ({
  fetchUserGetMock: vi.fn(),
  fetchAgencyProfileMock: vi.fn(),
  unsubscribeSpy: vi.fn(),
}))

let capturedHandler: AuthEventHandler | null = null

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (handler: AuthEventHandler) => {
        capturedHandler = handler
        return { data: { subscription: { unsubscribe: unsubscribeSpy } } }
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
      },
    },
  }),
}))

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...actual,
    // `post` mockeado: neutraliza el single-session claim (POST
    // /auth/session/claim) que corre en el bootstrap, para que los tests de
    // self-heal no dependan de la red real (si hay backend en :3000 el claim
    // real devolvía 401 y colgaba el test bajo fake timers).
    apiClient: {
      ...actual.apiClient,
      get: fetchUserGetMock,
      post: vi.fn().mockResolvedValue({ superseded: false }),
    },
    setAccessToken: vi.fn(),
  }
})

vi.mock('../agency-fetch', () => ({
  fetchAgencyProfile: (...args: unknown[]) => fetchAgencyProfileMock(...args),
}))

vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(null),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthProvider } from '../auth-context'
import { useAuth } from '../use-auth'
import type { AuthContextType } from '../types'

interface HarnessRef {
  current: AuthContextType | null
}

function mountHarness(): { ref: HarnessRef; root: Root; container: HTMLDivElement } {
  const ref: HarnessRef = { current: null }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  const Harness = () => {
    ref.current = useAuth()
    return null
  }

  act(() => {
    root.render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    )
  })

  return { ref, root, container }
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

const AGENT_USER_BACKEND = {
  id: 'user-1',
  email: 'agente@test.com',
  firstName: 'Agente',
  lastName: 'Test',
  role: 'AGENT',
}

const SESSION = {
  access_token: 'token-abc',
  user: { app_metadata: { providers: ['email'] }, email_confirmed_at: '2026-01-01T00:00:00Z' },
}

async function fireInitialSession() {
  await act(async () => {
    await capturedHandler?.('INITIAL_SESSION', SESSION)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  capturedHandler = null
  fetchUserGetMock.mockReset()
  fetchAgencyProfileMock.mockReset()
  fetchUserGetMock.mockResolvedValue(AGENT_USER_BACKEND)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/**
 * T-0082 WU-1 (F3) rewrote this suite: the self-heal backstop used to retry
 * with a 3-attempt backoff (`[0, 2000, 8000]` ms — up to 4 probes per
 * session) whenever the user was agency-capable, REGARDLESS of whether the
 * failure was transient or a confirmed "not a member". It now fires exactly
 * ONE guarded retry (at `AGENCY_SELF_HEAL_RETRY_DELAY_MS` = 2s), and only
 * when the previous probe result was `transientFailure: true` — for every
 * role, agency-capable included. A confirmed no-membership result is
 * terminal; `refreshAgency()` (the user's "Intentar de nuevo") is the only
 * way back from there.
 */
describe('AuthProvider — agency self-healing (single guarded retry)', () => {
  it('retries ONCE, after the retry delay, when the initial probe fails TRANSIENTLY — and adopts a later success', async () => {
    fetchAgencyProfileMock
      .mockResolvedValueOnce({ agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: true }) // direct fetch inside INITIAL_SESSION handler
      .mockResolvedValueOnce({ agency: { id: 'AGY-1', name: 'Test Agency' }, role: 'ADMIN', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false }) // the single retry

    const { ref, root, container } = mountHarness()
    await fireInitialSession()

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toBeNull()

    // The single retry fires after the retry delay (2s) — never at +0ms.
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Test Agency' })
    expect(ref.current?.agencyRole).toBe('ADMIN')

    act(() => root.unmount())
    container.remove()
  })

  it('does NOT retry a second time even if the single retry also fails transiently — no infinite loop', async () => {
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: true })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    // 1 direct + 1 single retry = 2 — no further attempt scheduled.
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)
    expect(ref.current?.agency).toBeNull()

    // Advancing well past the old (removed) 8s attempt must not trigger a
    // third automatic call.
    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)

    act(() => root.unmount())
    container.remove()
  })

  it('a CONFIRMED no-membership result on a pure-agency (AGENT) user is NOT retried either', async () => {
    // Old behavior: an agency-capable role retried on ANY missing agency,
    // including a confirmed 404/403/410 — this could storm a revoked or
    // never-a-member AGENT indefinitely. That special case is gone: only
    // `transientFailure` arms a retry, for every role.
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null, memberStatus: null, confirmedNoMembership: true, transientFailure: false })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    const callsAfterInitial = fetchAgencyProfileMock.mock.calls.length
    expect(callsAfterInitial).toBe(1)

    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchAgencyProfileMock.mock.calls.length).toBe(callsAfterInitial)
    expect(ref.current?.agency).toBeNull()

    act(() => root.unmount())
    container.remove()
  })

  it('refreshAgency() reuses a fresh probe and re-arms one more guarded retry when the result is still transient', async () => {
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: true })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()

    // Exhaust the single automatic retry.
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)

    // Manual refresh — still transient, so it re-arms one more retry.
    await act(async () => {
      await (ref.current as AuthContextType & { refreshAgency: () => Promise<void> }).refreshAgency()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(3)
    expect(ref.current?.agency).toBeNull()

    // The re-armed retry succeeds.
    fetchAgencyProfileMock.mockResolvedValueOnce({ agency: { id: 'AGY-2', name: 'Recovered' }, role: 'VIEWER', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(4)
    expect(ref.current?.agency).toEqual({ id: 'AGY-2', name: 'Recovered' })

    act(() => root.unmount())
    container.remove()
  })

  it('preserves an already-loaded agency when a later fetch fails (never downgrade)', async () => {
    fetchAgencyProfileMock.mockResolvedValueOnce({ agency: { id: 'AGY-1', name: 'Loaded Agency' }, role: 'ADMIN' })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Loaded Agency' })

    // A subsequent TOKEN_REFRESHED event whose agency fetch fails must not wipe it.
    fetchAgencyProfileMock.mockResolvedValueOnce({ agency: null, role: null })
    await act(async () => {
      await capturedHandler?.('TOKEN_REFRESHED', SESSION)
    })

    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Loaded Agency' })
    expect(ref.current?.agencyRole).toBe('ADMIN')

    act(() => root.unmount())
    container.remove()
  })
})

describe('AuthProvider — dual-context TENANT self-heal (lastProbeTransient path)', () => {
  const TENANT_BACKEND = {
    id: 'u-tenant',
    email: 'tenant@test.com',
    firstName: 'Tina',
    lastName: 'Tenant',
    role: 'TENANT',
    onboardingCompletedAt: '2026-01-01T00:00:00Z',
  }

  it('a TRANSIENT probe failure arms self-heal for a personal-role TENANT and resolves ACTIVE', async () => {
    fetchUserGetMock.mockResolvedValue(TENANT_BACKEND)
    fetchAgencyProfileMock
      // INITIAL_SESSION probe → transient failure (arms lastProbeTransient)
      .mockResolvedValueOnce({ agency: null, role: null, memberStatus: null, confirmedNoMembership: false, transientFailure: true })
      // the single guarded retry → ACTIVE
      .mockResolvedValueOnce({ agency: { id: 'AGY-9', name: 'Recovered' }, role: 'AGENTE', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    await flushPromises()

    // A TENANT is NOT agency-capable, so only the transient signal armed self-heal.
    expect(ref.current?.user?.role).toBe('tenant')
    expect(ref.current?.agency).toBeNull()

    // The single retry fires after the retry delay (2s), not at +0ms.
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(ref.current?.agency).toEqual({ id: 'AGY-9', name: 'Recovered' })
    expect(ref.current?.hasActiveAgencyMembership).toBe(true)

    act(() => root.unmount())
    container.remove()
  })

  it('a CONFIRMED no-membership TENANT is NOT retried (no self-heal storm)', async () => {
    fetchUserGetMock.mockResolvedValue(TENANT_BACKEND)
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null, memberStatus: null, confirmedNoMembership: true, transientFailure: false })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    await flushPromises()
    const callsAfterInitial = fetchAgencyProfileMock.mock.calls.length

    // Advance well past the single retry delay.
    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    // Confirmed no-membership does NOT arm lastProbeTransient → zero retries.
    expect(fetchAgencyProfileMock.mock.calls.length).toBe(callsAfterInitial)
    expect(ref.current?.agency).toBeNull()
    expect(ref.current?.hasActiveAgencyMembership).toBe(false)

    act(() => root.unmount())
    container.remove()
  })
})

/**
 * T-0082 WU-1 (F3) — `refreshUser` used to always start its own
 * `/inmobiliaria/agency` probe, even while an auth-event probe for the exact
 * same session was still in flight (F3: up to 4 probes/session). Both now go
 * through the same `probeAgencyMembership`, which shares its in-flight
 * promise with any overlapping caller.
 */
describe('AuthProvider — probeAgencyMembership de-dup (refreshUser reuses an in-flight probe)', () => {
  it('refreshUser reuses the INITIAL_SESSION probe instead of firing a second /inmobiliaria/agency request', async () => {
    let resolveProbe!: (v: unknown) => void
    fetchAgencyProfileMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve
        }),
    )

    const { ref, root, container } = mountHarness()

    await act(async () => {
      await capturedHandler?.('INITIAL_SESSION', SESSION)
    })
    // INITIAL_SESSION's probe is fire-and-forget — its own handling finishes
    // without waiting on it, and the probe is still pending.
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agencyMembershipChecked).toBe(false)

    let refreshUserSettled = false
    const refreshPromise = ref.current!.refreshUser().then(() => {
      refreshUserSettled = true
    })
    await flushPromises()
    // refreshUser's fetchUser() resolved and it called probeAgencyMembership,
    // which found the INITIAL_SESSION probe still in flight — no second call.
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(refreshUserSettled).toBe(false)

    await act(async () => {
      resolveProbe({ agency: { id: 'AGY-1', name: 'X' }, role: 'ADMIN', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })
      await refreshPromise
    })

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'X' })

    act(() => root.unmount())
    container.remove()
  })
})
