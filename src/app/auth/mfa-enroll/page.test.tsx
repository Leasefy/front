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

const { replaceMock, signOutMock, authState, onEnrolledCapture } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
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
  useAuth: () => ({ ...authState, signOut: signOutMock }),
}))

vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/settings/MfaSetupSection', () => ({
  MfaSetupSection: ({ onEnrolled }: { onEnrolled?: () => void }) => {
    onEnrolledCapture.current = onEnrolled ?? null
    return <div data-testid="mfa-setup-section-stub" />
  },
}))

import MfaEnrollPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  replaceMock.mockClear()
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

  it('onEnrolled hands off to /auth/mfa-verify — this screen verified over raw REST, not the SDK', async () => {
    authState.user = { id: 'u1', role: 'agency' }
    authState.mfaEnrollRequired = true

    await render()

    expect(onEnrolledCapture.current).toBeTypeOf('function')
    await act(async () => {
      onEnrolledCapture.current?.()
    })

    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
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
