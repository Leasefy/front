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

const { getMock, supabaseSignOutMock, authCallbacks } = vi.hoisted(() => ({
  getMock: vi.fn(),
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
      post: vi.fn(),
      patch: vi.fn(),
    },
    ApiError,
    setAccessToken: vi.fn(),
  }
})

vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthProvider, AuthContext, AUTH_BOOTSTRAP_ERROR_KEY } from './auth-context'
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
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  captured = null
  authCallbacks.length = 0
  getMock.mockReset()
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
