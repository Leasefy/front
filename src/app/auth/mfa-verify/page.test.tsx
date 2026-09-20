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
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ ...authState, setMfaVerified: vi.fn(), signOut: signOutMock }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: { mfa: { listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }) } },
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

  it('redirects to the dashboard when neither pending state applies', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaRequired = false
    authState.mfaEnrollRequired = false

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
  })
})
