/**
 * AuthForm — el SEGUNDO correo del registro (Nico, 30-09-2026, producción).
 *
 * Con un primer correo el formulario pasa a «Revisa tu correo»; «Corregirlo»
 * vuelve al paso de credenciales y el siguiente «Crear cuenta» hace OTRO
 * `signUp`, que manda otro correo de confirmación. Supabase lo frena con su
 * tope de correos por hora (429 `over_email_send_rate_limit`) y la pantalla
 * decía sólo «Error al crear la cuenta. Intenta de nuevo.». Acá se reproduce
 * el recorrido entero con el error real de la librería.
 *
 * (Cabecera de mocks copiada de AuthForm.registerFlow.test.tsx.)
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

/*
 * Sin animaciones (igual que AuthForm.correoYContrasena.test.tsx): con
 * `AnimatePresence mode="wait"` «Revisa tu correo» no monta en el primer tick.
 */
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const cache = new Map<string, unknown>()
  const motion = new Proxy(
    {},
    {
      get: (_objetivo, etiqueta: string) => {
        if (!cache.has(etiqueta)) {
          const Pasar = React.forwardRef<HTMLElement, Record<string, unknown>>(function Pasar(props, ref) {
            const { initial, animate, exit, transition, whileHover, whileTap, layout, ...resto } = props
            void initial
            void animate
            void exit
            void transition
            void whileHover
            void whileTap
            void layout
            return React.createElement(etiqueta, { ...resto, ref })
          })
          cache.set(etiqueta, Pasar)
        }
        return cache.get(etiqueta)
      },
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  }
})

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
    // «secreta123» ya no alcanza: está entre las más usadas y no tiene
    // mayúscula ni símbolo (medidor de contraseña, 2026-09-07).
    setInputValue(password, 'Secreta#2026')
    setInputValue(confirm, 'Secreta#2026')
  })
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

import { AuthApiError } from '@supabase/supabase-js'

async function escribirCredenciales(correo: string) {
  const email = container.querySelector('input[name="email"]') as HTMLInputElement
  const password = container.querySelector('input[name="password"]') as HTMLInputElement
  const confirm = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement
  await act(async () => {
    setInputValue(email, correo)
    setInputValue(password, 'Secreta#2026')
    setInputValue(confirm, 'Secreta#2026')
  })
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

function botonDeGoogle(): HTMLButtonElement {
  const boton = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Registrarse con Google'))
  expect(boton).toBeTruthy()
  return boton as HTMLButtonElement
}

describe('AuthForm register — el segundo correo', () => {
  it('con el tope de correos de Supabase dice qué pasó, no el genérico', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
    signUpWithEmailMock
      .mockResolvedValueOnce({ requiresConfirmation: true })
      .mockRejectedValueOnce(new AuthApiError('email rate limit exceeded', 429, 'over_email_send_rate_limit'))

    await renderRegister()
    await escribirCredenciales('primero@example.com')
    expect(container.querySelector('[data-testid="corregir-correo"]')).not.toBeNull()

    await act(async () => {
      ;(container.querySelector('[data-testid="corregir-correo"]') as HTMLButtonElement).click()
    })
    await escribirCredenciales('hola+10@example.com')

    expect(signUpWithEmailMock).toHaveBeenCalledTimes(2)
    expect(signUpWithEmailMock.mock.calls[0][0]).toBe('primero@example.com')
    expect(signUpWithEmailMock.mock.calls[1][0]).toBe('hola+10@example.com')
    expect(container.textContent).toContain('muchos correos de confirmación')
    expect(container.textContent).not.toContain('Error al crear la cuenta. Intenta de nuevo.')
    // El botón vuelve a quedar usable para intentar después.
    const crear = [...container.querySelectorAll('button[type="submit"]')].find((b) => b.textContent?.includes('Crear cuenta')) as HTMLButtonElement
    expect(crear.disabled).toBe(false)
    expect(espia).toHaveBeenCalledWith('[registro] AuthForm: signUp falló', expect.objectContaining({ status: 429, codigo: 'over_email_send_rate_limit' }))
    espia.mockRestore()
  })

  it('mientras se crea la cuenta con correo, Google queda quieto (deshabilitado y sin spinner)', async () => {
    let soltar: (v: { requiresConfirmation: boolean }) => void = () => {}
    signUpWithEmailMock.mockReturnValueOnce(new Promise((r) => (soltar = r)))

    await renderRegister()
    await escribirCredenciales('nuevo@example.com')

    const google = botonDeGoogle()
    expect(google.disabled).toBe(true)
    expect(google.querySelector('.animate-spin')).toBeNull()
    expect(container.textContent).toContain('Creando cuenta...')

    await act(async () => soltar({ requiresConfirmation: true }))
  })
})
