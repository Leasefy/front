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
    apiClient: { ...actual.apiClient, get: fetchUserGetMock },
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

describe('AuthProvider — agency self-healing', () => {
  it('retries automatically (no new auth event) when the initial agency fetch fails, and succeeds on a later attempt', async () => {
    fetchAgencyProfileMock
      .mockResolvedValueOnce({ agency: null, role: null }) // direct fetch inside INITIAL_SESSION handler
      .mockResolvedValueOnce({ agency: null, role: null }) // self-heal attempt 0 (0s)
      .mockResolvedValueOnce({ agency: { id: 'AGY-1', name: 'Test Agency' }, role: 'ADMIN' }) // self-heal attempt 1 (2s)

    const { ref, root, container } = mountHarness()
    await fireInitialSession()

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)
    expect(ref.current?.agency).toBeNull()

    // Self-heal attempt 0 fires at +0ms — no new auth event dispatched.
    await act(async () => {
      vi.advanceTimersByTime(0)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(2)
    expect(ref.current?.agency).toBeNull()

    // Self-heal attempt 1 fires at +2s
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(3)
    expect(ref.current?.agency).toEqual({ id: 'AGY-1', name: 'Test Agency' })
    expect(ref.current?.agencyRole).toBe('ADMIN')

    act(() => root.unmount())
    container.remove()
  })

  it('stops retrying once the backoff schedule (0s/2s/8s) is exhausted — no infinite loop', async () => {
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(0)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(8000)
      await Promise.resolve()
      await Promise.resolve()
    })
    // 1 direct + 3 self-heal attempts (0s, 2s, 8s) = 4
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(4)
    expect(ref.current?.agency).toBeNull()

    // Advancing well past the schedule must not trigger further calls.
    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(4)

    act(() => root.unmount())
    container.remove()
  })

  it('refreshAgency() manually retries and re-arms the backstop after retries were exhausted', async () => {
    fetchAgencyProfileMock.mockResolvedValue({ agency: null, role: null })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()

    // Exhaust the automatic backoff schedule.
    await act(async () => {
      vi.advanceTimersByTime(0)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(8000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(4)

    // Manual refresh — succeeds immediately.
    fetchAgencyProfileMock.mockResolvedValueOnce({ agency: { id: 'AGY-2', name: 'Recovered' }, role: 'VIEWER' })
    await act(async () => {
      await (ref.current as AuthContextType & { refreshAgency: () => Promise<void> }).refreshAgency()
    })

    expect(fetchAgencyProfileMock).toHaveBeenCalledTimes(5)
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
      // self-heal attempt 0 → ACTIVE
      .mockResolvedValueOnce({ agency: { id: 'AGY-9', name: 'Recovered' }, role: 'AGENTE', memberStatus: 'ACTIVE', confirmedNoMembership: false, transientFailure: false })

    const { ref, root, container } = mountHarness()
    await fireInitialSession()
    await flushPromises()

    // A TENANT is NOT agency-capable, so only the transient signal armed self-heal.
    expect(ref.current?.user?.role).toBe('tenant')
    expect(ref.current?.agency).toBeNull()

    // Self-heal attempt 0 fires at +0ms.
    await act(async () => {
      vi.advanceTimersByTime(0)
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

    // Advance well past the entire backoff schedule.
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
