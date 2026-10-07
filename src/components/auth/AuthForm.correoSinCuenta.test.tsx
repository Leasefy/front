/**
 * AuthForm — «Correo o contraseña incorrectos» con un correo SIN cuenta
 * (Nico, 01-10-2026).
 *
 * Supabase contesta «Invalid login credentials» igual para una contraseña mala
 * y para un correo que no existe. Tras ESE error (y sólo ahí) el login le
 * pregunta al back (`POST /auth/correo-tiene-cuenta`):
 *  - no tiene cuenta → «No hay una cuenta con este correo.» + «Crear una
 *    cuenta con este correo», que abre el registro con el correo puesto;
 *  - tiene cuenta, o la consulta falla → el mensaje de siempre (fail-closed).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pushMock, signUpWithEmailMock, signInWithEmailMock, resendMock, postMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
  resendMock: vi.fn(),
  postMock: vi.fn(),
}))

/*
 * Sólo se dobla `apiClient.post`: el servicio real corre, así que la prueba
 * también cubre que una caída se lea como «no se sabe».
 */
vi.mock('@/lib/api/client', async (original) => {
  const real = await original<typeof import('@/lib/api/client')>()
  return { ...real, apiClient: { ...real.apiClient, post: postMock } }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: signInWithEmailMock,
    signUpWithEmail: signUpWithEmailMock,
    resendSignUpEmail: resendMock,
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
 * Sin animaciones: `AnimatePresence mode="wait"` espera a que el paso anterior
 * termine de irse antes de montar el siguiente, y en la prueba eso deja
 * «Revisa tu correo» sin cuerpo durante el primer tick.
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
  signUpWithEmailMock.mockReset()
  signInWithEmailMock.mockReset()
  resendMock.mockReset()
  postMock.mockReset()
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
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

const input = (name: string) => container.querySelector(`input[name="${name}"]`) as HTMLInputElement
const porTestId = <T extends HTMLElement>(id: string) => container.querySelector(`[data-testid="${id}"]`) as T | null
const texto = () => container.textContent ?? ''

async function click(el: Element | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

async function entrarCon(email: string, password = 'Secreta#2026') {
  await act(async () => {
    root.render(<AuthForm />)
  })
  await act(async () => {
    setInputValue(input('email'), email)
    setInputValue(input('password'), password)
  })
  // Escribir no consulta nada: la pregunta sólo sale tras intentar entrar.
  expect(postMock).not.toHaveBeenCalled()
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

/** Un `AuthApiError` de Supabase como lo arma el SDK: `code` + `status` (el texto en inglés no decide). */
const errorDeSupabase = (mensaje: string, status: number, code?: string) =>
  Object.assign(new Error(mensaje), { name: 'AuthApiError', status, code })

const credencialesInvalidas = () => errorDeSupabase('Invalid login credentials', 400, 'invalid_credentials')

describe('AuthForm — login con un correo sin cuenta', () => {
  it('sin cuenta: lo dice y ofrece crearla con ESE correo', async () => {
    signInWithEmailMock.mockRejectedValue(credencialesInvalidas())
    postMock.mockResolvedValue({ tieneCuenta: false })

    await entrarCon('  Nueva@Correo.com ')

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/auth/correo-tiene-cuenta', { email: 'nueva@correo.com' })
    expect(texto()).toContain('No hay una cuenta con este correo.')
    expect(texto()).not.toContain('Correo o contraseña incorrectos.')

    const crear = porTestId<HTMLButtonElement>('crear-cuenta-con-este-correo')
    expect(crear?.textContent).toBe('Crear una cuenta con este correo')
    await click(crear)

    expect(texto()).toContain('Crea tu cuenta')
    expect(input('email').value).toBe('nueva@correo.com')
    // La contraseña del intento fallido no viaja al registro.
    expect(input('password').value).toBe('')
    expect(input('confirmPassword').value).toBe('')
  })

  it('con cuenta: el mensaje de siempre, sin ofrecer crear otra', async () => {
    signInWithEmailMock.mockRejectedValue(credencialesInvalidas())
    postMock.mockResolvedValue({ tieneCuenta: true })

    await entrarCon('persona@correo.com', 'mala-clave')

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(texto()).toContain('Correo o contraseña incorrectos.')
    expect(texto()).toContain('¿Olvidaste tu contraseña?')
    expect(porTestId('crear-cuenta-con-este-correo')).toBeNull()
  })

  it('la consulta falla (caída, 429, 503): el mensaje de siempre', async () => {
    signInWithEmailMock.mockRejectedValue(credencialesInvalidas())
    postMock.mockRejectedValue(new Error('503 consulta_no_disponible'))

    await entrarCon('nadie@correo.com')

    expect(texto()).toContain('Correo o contraseña incorrectos.')
    expect(texto()).toContain('¿Olvidaste tu contraseña?')
    expect(texto()).not.toContain('No hay una cuenta con este correo.')
    expect(porTestId('crear-cuenta-con-este-correo')).toBeNull()
  })

  it('una respuesta sin el booleano también se lee como «no se sabe»', async () => {
    signInWithEmailMock.mockRejectedValue(credencialesInvalidas())
    postMock.mockResolvedValue({})

    await entrarCon('nadie@correo.com')

    expect(texto()).toContain('Correo o contraseña incorrectos.')
    expect(porTestId('crear-cuenta-con-este-correo')).toBeNull()
  })

  it('otro error de Supabase (correo sin confirmar) no consulta nada', async () => {
    signInWithEmailMock.mockRejectedValue(errorDeSupabase('Email not confirmed', 400, 'email_not_confirmed'))

    await entrarCon('pendiente@correo.com')

    expect(postMock).not.toHaveBeenCalled()
    expect(texto()).toContain('Tu correo todavía no está confirmado.')
  })
})
