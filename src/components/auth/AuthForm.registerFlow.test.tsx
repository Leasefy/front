/**
 * AuthForm — register flow after the role picker was removed.
 *
 * UX decision: profile selection (Inquilino/Propietario/Inmobiliaria) happens
 * ONCE, at /onboarding/seleccionar-rol. AuthForm's register must therefore
 * start directly at the credentials step (no in-form role step) and route the
 * post-signup destination as:
 *   - no explicit role  → /onboarding/seleccionar-rol (the single picker)
 *   - explicit role      → /onboarding/<rol> (deep-link preserved)
 *   - returnUrl set      → returnUrl wins (unchanged precedence)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pushMock, replaceMock, signUpWithEmailMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: signUpWithEmailMock,
    sendPasswordReset: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    mfaRequired: false,
    agencyRole: null,
    agencyMembershipChecked: false,
    hasActiveAgencyMembership: false,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))
vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthForm } from './AuthForm'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  sessionStorage.clear()
  pushMock.mockClear()
  replaceMock.mockClear()
  signUpWithEmailMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

type RenderProps = React.ComponentProps<typeof AuthForm>

async function renderRegister(props: RenderProps = {}) {
  await act(async () => {
    root.render(<AuthForm defaultMode="register" {...props} />)
  })
}

async function submitRegister(props: RenderProps = {}) {
  await renderRegister(props)
  const email = container.querySelector('input[name="email"]') as HTMLInputElement
  const password = container.querySelector('input[name="password"]') as HTMLInputElement
  const confirm = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement
  expect(email).not.toBeNull()
  expect(password).not.toBeNull()
  expect(confirm).not.toBeNull()
  await act(async () => {
    setInputValue(email, 'nuevo@example.com')
    setInputValue(password, 'secreta123')
    setInputValue(confirm, 'secreta123')
  })
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

/** emailRedirectTo (3rd arg of signUpWithEmail) as passed to /auth/callback. */
function lastEmailRedirectTo(): string {
  const calls = signUpWithEmailMock.mock.calls
  expect(calls.length).toBeGreaterThan(0)
  return String(calls[calls.length - 1][2])
}

describe('AuthForm register — single-picker routing', () => {
  it('(a) starts on the credentials step, with no in-form role picker', async () => {
    await renderRegister()
    // Credentials step is present: email + password + confirm inputs.
    expect(container.querySelector('input[name="email"]')).not.toBeNull()
    expect(container.querySelector('input[name="password"]')).not.toBeNull()
    expect(container.querySelector('input[name="confirmPassword"]')).not.toBeNull()
    // No role picker copy anymore.
    expect(container.textContent).not.toContain('¿Cómo usarás Leasefy?')
    expect(container.textContent).not.toContain('Selecciona tu perfil')
    expect(container.textContent).not.toContain('Cambiar perfil')
  })

  it('(b) without an explicit role, routes to /onboarding/seleccionar-rol', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await submitRegister()
    expect(signUpWithEmailMock).toHaveBeenCalledTimes(1)
    expect(lastEmailRedirectTo()).toContain(
      `returnUrl=${encodeURIComponent('/onboarding/seleccionar-rol')}`,
    )
  })

  it('(b2) auto-confirmed without a role pushes to /onboarding/seleccionar-rol', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: false })
    await submitRegister()
    expect(pushMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('(c) with defaultRole=agency, routes straight to /onboarding/inmobiliaria', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await submitRegister({ defaultRole: 'agency' })
    expect(lastEmailRedirectTo()).toContain(
      `returnUrl=${encodeURIComponent('/onboarding/inmobiliaria')}`,
    )
  })

  it('(c2) auto-confirmed with defaultRole=landlord pushes to /onboarding/propietario', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: false })
    await submitRegister({ defaultRole: 'landlord' })
    expect(pushMock).toHaveBeenCalledWith('/onboarding/propietario')
  })

  it('(d) a returnUrl keeps precedence over the onboarding fallback', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await submitRegister({ returnUrl: '/panel/propiedades' })
    expect(lastEmailRedirectTo()).toContain(
      `returnUrl=${encodeURIComponent('/panel/propiedades')}`,
    )
  })
})
