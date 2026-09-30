/**
 * /auth/mfa-enroll — T-0099 enroll-pending destination.
 *
 * Reached only via ProtectedRoute's `mfaEnrollRequired` redirect: the back's
 * role policy requires aal2 (segundoFactor.exigido) but there is no verified
 * TOTP factor to step up to yet. This screen reuses `MfaSetupSection` (mocked
 * here — its own behavior is covered by MfaSetupSection.test.tsx) and, once
 * a factor is enrolled, hands off to /auth/mfa-verify for the
 * SDK-recognized step-up.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, signOutMock, setMfaVerifiedMock, authState, onEnrolledCapture, propsCapture } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  setMfaVerifiedMock: vi.fn(),
  propsCapture: { current: {} as Record<string, unknown> },
  signOutMock: vi.fn().mockResolvedValue(undefined),
  authState: {
    user: null as Record<string, unknown> | null,
    mfaEnrollRequired: true,
  },
  onEnrolledCapture: { current: null as (() => void) | null },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ ...authState, signOut: signOutMock, setMfaVerified: setMfaVerifiedMock }),
}))

vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/settings/MfaSetupSection', () => ({
  MfaSetupSection: (props: { onEnrolled?: () => void }) => {
    propsCapture.current = props as Record<string, unknown>
    onEnrolledCapture.current = props.onEnrolled ?? null
    return <div data-testid="mfa-setup-section-stub" />
  },
}))

import MfaEnrollPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  replaceMock.mockClear()
  setMfaVerifiedMock.mockClear()
  signOutMock.mockClear()
  authState.user = null
  authState.mfaEnrollRequired = true
  onEnrolledCapture.current = null
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
    root.render(<MfaEnrollPage />)
  })
}

describe('/auth/mfa-enroll', () => {
  it('renders the enroll section while mfaEnrollRequired is true', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaEnrollRequired = true

    await render()

    expect(container.querySelector('[data-testid="mfa-setup-section-stub"]')).not.toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redirects to the role dashboard when mfaEnrollRequired is already false — never strands the user here', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaEnrollRequired = false

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
  })

  it('T-0123: verifies through the SDK (enElIngreso) so the session really becomes aal2', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    await render()

    expect(propsCapture.current.enElIngreso).toBe(true)
  })

  it('T-0123: after a fresh enroll+verify it releases the gate and lands on the panel ONCE — never bounces to /auth/mfa-verify', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaEnrollRequired = true

    await render()
    await act(async () => {
      onEnrolledCapture.current?.()
    })

    expect(setMfaVerifiedMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-verify')
    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')

    // The flags clearing afterwards must not navigate a second time.
    authState.mfaEnrollRequired = false
    await render()
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it('T-0123: a verified factor found on mount (session still aal1) goes to the verify challenge (step-up), not to the panel', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaEnrollRequired = true

    await render()
    const yaInscrito = propsCapture.current.onYaInscrito as (() => void) | undefined
    expect(yaInscrito).toBeTypeOf('function')
    await act(async () => {
      yaInscrito?.()
    })

    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
    expect(setMfaVerifiedMock).not.toHaveBeenCalled()
  })

  it('sign-out link signs out and returns to /auth', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaEnrollRequired = true
    await render()

    const salir = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Cerrar sesion'),
    )
    await act(async () => {
      salir?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(signOutMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })
})
