/**
 * «Al continuar, aceptas nuestros Términos…» sólo al CREAR la cuenta (Nico,
 * 07-10: «eso solo debe estar en crear cuenta»). Quien inicia sesión ya los
 * aceptó al registrarse.
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

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('la nota legal', () => {
  it('no está al iniciar sesión', () => {
    act(() => root.render(<AuthForm defaultMode="login" />))
    expect(container.textContent).toContain('Bienvenido de vuelta')
    expect(container.querySelector('[data-testid="auth-nota-legal"]')).toBeNull()
    expect(container.textContent).not.toMatch(/Al continuar, aceptas/)
  })

  it('sí está al crear la cuenta', async () => {
    // El modo «registro» lo pone un efecto al montar.
    await act(async () => root.render(<AuthForm defaultMode="register" />))
    expect(container.textContent).toContain('Crea tu cuenta')
    expect(container.querySelector('[data-testid="auth-nota-legal"]')).not.toBeNull()
  })
})
