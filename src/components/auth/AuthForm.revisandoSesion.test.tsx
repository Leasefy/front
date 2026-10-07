/**
 * 🔴 LOGIN-BUCLE (Nico, 06-10-2026): «vuelve a salir el login y luego de unos
 * segundos se cambia al de sigue con tu cuenta porque la identifica».
 *
 * - Con una sesión guardada que todavía se confirma y un destino (`returnUrl`),
 *   /auth dice «Revisando tu sesión…» en vez de un formulario vacío que dice
 *   algo falso; la salida a otra cuenta queda a la mano.
 * - Pasado el tope (`sin-confirmar`) o sin destino: el formulario de siempre.
 * - «Continuar» que descubre la sesión vencida pasa al formulario con «Tu
 *   sesión expiró».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { params, auth } = vi.hoisted(() => ({
  params: { returnUrl: '/panel/inmobiliaria' as string | null },
  auth: {
    signInWithGoogle: () => Promise.resolve(),
    signInWithEmail: () => Promise.resolve(null),
    signUpWithEmail: () => Promise.resolve({ requiresConfirmation: true }),
    sendPasswordReset: () => Promise.resolve(),
    resendSignUpEmail: () => Promise.resolve(),
    signOut: (() => Promise.resolve()) as () => Promise<void>,
    user: null as Record<string, unknown> | null,
    isAuthenticated: false,
    isLoading: true,
    needsOnboarding: false,
    mfaRequired: false,
    mfaEnrollRequired: false,
    mfaCheckStatus: 'verified' as const,
    confirmacionDeLaSesion: 'revisando' as 'no-aplica' | 'revisando' | 'sin-confirmar',
    confirmarSesionVigente: (() => Promise.resolve('muerta')) as () => Promise<'viva' | 'muerta' | 'sin-respuesta'>,
    agencyMembershipChecked: true,
    hasActiveAgencyMembership: false,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => (k === 'returnUrl' ? params.returnUrl : null) }),
}))

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => auth }))
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
  params.returnUrl = '/panel/inmobiliaria'
  auth.user = null
  auth.isAuthenticated = false
  auth.isLoading = true
  auth.confirmacionDeLaSesion = 'revisando'
  auth.signOut = vi.fn(() => Promise.resolve())
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(<AuthForm />)
  })
}

const hayFormulario = () => container.querySelector('input[type="password"]') !== null
const revisando = () => container.querySelector('[data-testid="revisando-sesion"]') !== null

describe('AuthForm con una sesión guardada por confirmar', () => {
  it('con destino: «Revisando tu sesión…», no el formulario vacío', async () => {
    await render()
    expect(revisando()).toBe(true)
    expect(container.textContent).toContain('Revisando tu sesión')
    expect(hayFormulario()).toBe(false)
  })

  it('«Entrar con otra cuenta» desde la espera cierra la sesión y muestra el formulario', async () => {
    await render()
    await act(async () => {
      ;(container.querySelector('[data-testid="revisando-sesion-otra-cuenta"]') as HTMLButtonElement).click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(revisando()).toBe(false)
    expect(hayFormulario()).toBe(true)
  })

  it('sin destino (entrar a /auth a secas): el formulario de siempre', async () => {
    params.returnUrl = null
    await render()
    expect(revisando()).toBe(false)
    expect(hayFormulario()).toBe(true)
  })

  it('pasado el tope (`sin-confirmar`): vuelve el formulario', async () => {
    auth.confirmacionDeLaSesion = 'sin-confirmar'
    await render()
    expect(revisando()).toBe(false)
    expect(hayFormulario()).toBe(true)
  })

  it('sin sesión guardada (`no-aplica`): el formulario de siempre aunque cargue', async () => {
    auth.confirmacionDeLaSesion = 'no-aplica'
    await render()
    expect(revisando()).toBe(false)
    expect(hayFormulario()).toBe(true)
  })
})

describe('«Continuar» con la sesión vencida', () => {
  it('pasa al formulario con «Tu sesión expiró»', async () => {
    auth.isLoading = false
    auth.confirmacionDeLaSesion = 'no-aplica'
    auth.isAuthenticated = true
    auth.user = { id: 'u1', name: 'Nico García', email: 'nico@inmobiliaria.co', role: 'agency', onboardingCompleted: true }
    await render()
    expect(container.querySelector('[data-testid="sesion-ya-abierta"]')).not.toBeNull()

    await act(async () => {
      ;(container.querySelector('[data-testid="sesion-continuar"]') as HTMLButtonElement).click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="sesion-ya-abierta"]')).toBeNull()
    expect(hayFormulario()).toBe(true)
    expect(container.textContent).toContain('Tu sesión expiró')
  })
})
