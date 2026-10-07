/**
 * Nico, 02-10-2026: si la consulta del segundo factor no respondió ni
 * reintentando, /auth no ofrece «Continuar como…» ni sigue al destino: muestra
 * «No pudimos confirmar tu sesión» con «Reintentar». La sesión no se cierra.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado, signOut } = vi.hoisted(() => ({
  signOut: vi.fn(),
  estado: { mfaCheckStatus: 'failed' as 'pending' | 'verified' | 'failed' },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'returnUrl' ? '/onboarding/seleccionar-rol' : null) }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    signOut,
    retryMfaCheck: vi.fn().mockResolvedValue(undefined),
    user: { name: 'Ana', email: 'ana@example.com', role: 'tenant', onboardingCompleted: false },
    isAuthenticated: true,
    isLoading: false,
    needsOnboarding: false,
    mfaRequired: false,
    mfaEnrollRequired: false,
    mfaCheckStatus: estado.mfaCheckStatus,
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
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('AuthForm — sesión abierta cuyo segundo factor no se pudo verificar', () => {
  it('«failed»: pide reintentar en vez de «Continuar como…», y no cierra la sesión', async () => {
    estado.mfaCheckStatus = 'failed'
    await act(async () => {
      root.render(<AuthForm />)
    })
    expect(container.querySelector('[data-testid="no-pudimos-confirmar-sesion"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="sesion-continuar"]')).toBeNull()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('«verified»: la de siempre, «¿Sigues con esta cuenta?»', async () => {
    estado.mfaCheckStatus = 'verified'
    await act(async () => {
      root.render(<AuthForm />)
    })
    expect(container.querySelector('[data-testid="sesion-continuar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="no-pudimos-confirmar-sesion"]')).toBeNull()
  })
})
