/**
 * /auth/mfa-verify — T-0099 addition: a defensive redirect to
 * /auth/mfa-enroll when mfaEnrollRequired turns out to be the state that's
 * actually pending (the two states are meant to be mutually exclusive per
 * contract.md T-0099 §3, but this screen must not strand the user on a
 * "verify" form with nothing to verify if that ever slips).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, signOutMock, authState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  signOutMock: vi.fn().mockResolvedValue(undefined),
  authState: {
    user: null as Record<string, unknown> | null,
    mfaRequired: true,
    mfaEnrollRequired: false,
    isLoading: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ ...authState, setMfaVerified: vi.fn(), signOut: signOutMock }),
}))

const { factoresDelSdk } = vi.hoisted(() => ({
  factoresDelSdk: { totp: [] as Array<{ id: string; status: string }> },
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: { mfa: { listFactors: vi.fn(async () => ({ data: { totp: factoresDelSdk.totp } })) } },
  }),
}))

vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import MfaVerifyPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  replaceMock.mockClear()
  signOutMock.mockClear()
  authState.user = null
  authState.mfaRequired = true
  authState.mfaEnrollRequired = false
  authState.isLoading = false
  factoresDelSdk.totp = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function render() {
  await act(async () => {
    root.render(<MfaVerifyPage />)
  })
}

describe('/auth/mfa-verify', () => {
  it('stays on the verify form while mfaRequired is true and mfaEnrollRequired is false', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaRequired = true
    authState.mfaEnrollRequired = false

    await render()

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('T-0099: redirects to /auth/mfa-enroll when mfaEnrollRequired is the pending state instead', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaRequired = false
    authState.mfaEnrollRequired = true

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-enroll')
  })

  it('T-0123: a stale mfaEnrollRequired WITH a verified factor never bounces to /auth/mfa-enroll — it stays on the challenge (step-up)', async () => {
    factoresDelSdk.totp = [{ id: 'f1', status: 'verified' }]
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaRequired = false
    authState.mfaEnrollRequired = true

    await render()
    await act(async () => {
      await Promise.resolve()
    })

    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-enroll')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redirects to the dashboard when neither pending state applies', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaRequired = false
    authState.mfaEnrollRequired = false

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
  })

  it('🔴 no se va mientras la sesión todavía carga (Nico, 29-09: el rebote al panel borraba lo que tocaba)', async () => {
    // Recién llegado del login: el usuario ya está, pero el chequeo del segundo
    // factor no terminó y `mfaRequired` sigue en su valor de fábrica (false).
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaRequired = false
    authState.mfaEnrollRequired = false
    authState.isLoading = true

    await render()

    expect(replaceMock).not.toHaveBeenCalled()
  })
})
