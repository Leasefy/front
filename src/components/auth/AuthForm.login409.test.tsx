/**
 * AuthForm — email/password login when the profile bootstrap fails without
 * throwing (409 duplicate identity).
 *
 * fetchUser's 409 branch resolves `{ user: null }` (no throw) after storing
 * the backend message in AUTH_BOOTSTRAP_ERROR_KEY and signing the Supabase
 * session out. `signInWithEmail` therefore RESOLVES with null, so
 * handleLoginSubmit's catch never fires. Regression under test: the spinner
 * must clear (finally), the backend message must appear in the inline error
 * banner (read+clear of the sessionStorage key), and no navigation happens.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pushMock, replaceMock, signInWithEmailMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: signInWithEmailMock,
    signUpWithEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    mfaRequired: false,
  }),
}))

// Keep the auth-context import (for AUTH_BOOTSTRAP_ERROR_KEY) side-effect
// light: it transitively imports supabase + firebase modules.
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))
vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthForm } from './AuthForm'
import { AUTH_BOOTSTRAP_ERROR_KEY } from '@/lib/auth/auth-context'

const BACKEND_MSG =
  'Ya existe una cuenta registrada con este correo. Inicia sesión con tu cuenta original.'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  sessionStorage.clear()
  pushMock.mockClear()
  replaceMock.mockClear()
  signInWithEmailMock.mockReset()
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

async function renderAndSubmitLogin() {
  await act(async () => {
    root.render(<AuthForm />)
  })
  const email = container.querySelector('input[type="email"]') as HTMLInputElement
  const password = container.querySelector('input[type="password"]') as HTMLInputElement
  expect(email).not.toBeNull()
  expect(password).not.toBeNull()
  await act(async () => {
    setInputValue(email, 'ana@example.com')
    setInputValue(password, 'secreta123')
  })
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

function submitButton(): HTMLButtonElement {
  return container.querySelector('button[type="submit"]') as HTMLButtonElement
}

describe('AuthForm — login resolves null (409 bootstrap failure)', () => {
  it('clears the spinner, shows the backend message inline, and does not navigate', async () => {
    signInWithEmailMock.mockImplementation(async () => {
      // fetchUser's 409 branch: message stored, session signed out, null user.
      sessionStorage.setItem(AUTH_BOOTSTRAP_ERROR_KEY, BACKEND_MSG)
      return null
    })

    await renderAndSubmitLogin()

    expect(signInWithEmailMock).toHaveBeenCalledTimes(1)
    // Spinner cleared: submit button re-enabled (disabled={isLoading}).
    expect(submitButton().disabled).toBe(false)
    // Backend message surfaced in the inline error banner…
    expect(container.textContent).toContain(BACKEND_MSG)
    // …and the handoff key was consumed.
    expect(sessionStorage.getItem(AUTH_BOOTSTRAP_ERROR_KEY)).toBeNull()
    // No navigation.
    expect(pushMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('falls back to a generic Spanish error when null is returned without a stored message', async () => {
    signInWithEmailMock.mockResolvedValue(null)

    await renderAndSubmitLogin()

    expect(submitButton().disabled).toBe(false)
    expect(container.textContent).toContain('Error al iniciar sesión. Intenta de nuevo.')
    expect(pushMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
