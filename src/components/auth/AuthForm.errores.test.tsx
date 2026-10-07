/**
 * AuthForm — los errores de Supabase con la regla de oro (02-10-2026).
 *
 * Antes se leían por el TEXTO en inglés («Invalid login credentials», «User
 * already registered», «Password should be») y todo lo demás decía «Error al
 * iniciar sesión. Intenta de nuevo.» o «Ocurrió un error», hubiera red o no.
 * Ahora:
 *  · se lee el `code` y el `status` (`lib/auth/errores-de-supabase.ts`);
 *  · «conexión» SÓLO cuando el pedido no salió;
 *  · un 5xx dice que falló de nuestro lado, sin culpar a nadie;
 *  · lo que es de un campo (contraseña débil) va a SU campo, con el foco.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { signUpWithEmailMock, signInWithEmailMock, resendMock, resetMock, googleMock } = vi.hoisted(() => ({
  signUpWithEmailMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
  resendMock: vi.fn(),
  resetMock: vi.fn(),
  googleMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: googleMock,
    signInWithEmail: signInWithEmailMock,
    signUpWithEmail: signUpWithEmailMock,
    resendSignUpEmail: resendMock,
    sendPasswordReset: resetMock,
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

vi.mock('@/lib/api/correo-tiene-cuenta.service', () => ({
  correoTieneCuentaApi: { consultar: vi.fn().mockResolvedValue(true) },
}))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))
vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthForm } from './AuthForm'

/** Un error de Supabase como lo arma el SDK (`AuthApiError`, `AuthRetryableFetchError`…). */
const errorDeSupabase = (nombre: string, mensaje: string, status: number, code?: string, extra: object = {}) =>
  Object.assign(new Error(mensaje), { name: nombre, status, code, ...extra })

const sinRed = () => errorDeSupabase('AuthRetryableFetchError', 'Failed to fetch', 0)
const falloDeSupabase = () =>
  errorDeSupabase('AuthApiError', 'Database error saving new user', 500, 'unexpected_failure')

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  sessionStorage.clear()
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
const texto = () => container.textContent ?? ''

async function click(el: Element | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

async function submit() {
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

const botonConTexto = (t: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(t)) ?? null

async function entrar(error: unknown) {
  signInWithEmailMock.mockRejectedValue(error)
  await act(async () => {
    root.render(<AuthForm />)
  })
  await act(async () => {
    setInputValue(input('email'), 'ana@correo.com')
    setInputValue(input('password'), 'loquesea')
  })
  await submit()
}

async function registrar(error: unknown) {
  signUpWithEmailMock.mockRejectedValue(error)
  await act(async () => {
    root.render(<AuthForm defaultMode="register" />)
  })
  await act(async () => {
    setInputValue(input('email'), 'nuevo@correo.com')
    setInputValue(input('password'), 'Secreta#2026')
    setInputValue(input('confirmPassword'), 'Secreta#2026')
  })
  await submit()
}

describe('AuthForm — iniciar sesión', () => {
  it('🔴 un 5xx de Supabase dice que falló de nuestro lado, sin culpar a la conexión ni mostrar el inglés', async () => {
    await entrar(falloDeSupabase())
    expect(texto()).toMatch(/No pudimos iniciar tu sesión: algo falló de nuestro lado/)
    expect(texto()).not.toMatch(/conexi[oó]n|Database error/)
  })

  it('🔴 sin respuesta (el pedido no salió): ahí sí habla de la conexión', async () => {
    await entrar(sinRed())
    expect(texto()).toMatch(/conexión/)
  })

  it('🔴 un 4xx sin código conocido no muestra el inglés de Supabase', async () => {
    await entrar(errorDeSupabase('AuthApiError', 'Something new from GoTrue', 400))
    expect(texto()).toContain('Error al iniciar sesión. Intenta de nuevo.')
    expect(texto()).not.toContain('Something new')
  })

  it('la cuenta bloqueada se dice como tal (por su código)', async () => {
    await entrar(errorDeSupabase('AuthApiError', 'User is banned', 400, 'user_banned'))
    expect(texto()).toMatch(/cuenta está bloqueada/)
  })

  it('Google sin red: la conexión; Google con un 5xx: nuestro', async () => {
    googleMock.mockRejectedValueOnce(sinRed())
    await act(async () => {
      root.render(<AuthForm />)
    })
    await click(botonConTexto('Continuar con Google'))
    expect(texto()).toMatch(/conexión/)

    googleMock.mockRejectedValueOnce(falloDeSupabase())
    await click(botonConTexto('Continuar con Google'))
    expect(texto()).toMatch(/No pudimos conectarte con Google: algo falló de nuestro lado/)
  })
})

describe('AuthForm — crear la cuenta', () => {
  it('🔴 la contraseña débil va a SU campo, con el foco, y no al cartel de arriba', async () => {
    await registrar(
      errorDeSupabase('AuthWeakPasswordError', 'Password is known to be weak and easy to guess', 422, 'weak_password', {
        reasons: ['pwned'],
      }),
    )
    const clave = input('password')
    expect(clave.getAttribute('aria-invalid')).toBe('true')
    const id = clave.getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)?.textContent).toMatch(/filtraciones de datos/)
    expect(document.activeElement).toBe(clave)
    expect(texto()).not.toMatch(/Password is known/)
  })

  it('🔴 un 5xx dice que falló de nuestro lado', async () => {
    await registrar(falloDeSupabase())
    expect(texto()).toMatch(/No pudimos crear tu cuenta: algo falló de nuestro lado/)
    expect(texto()).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta: la conexión', async () => {
    await registrar(sinRed())
    expect(texto()).toMatch(/conexión/)
  })

  it('el límite de correos de Supabase, por su código', async () => {
    await registrar(errorDeSupabase('AuthApiError', 'Email rate limit exceeded', 429, 'over_email_send_rate_limit'))
    expect(texto()).toMatch(/Espera unos minutos/)
  })
})

describe('AuthForm — recuperar la contraseña', () => {
  async function pedirEnlace(error: unknown) {
    resetMock.mockRejectedValue(error)
    await act(async () => {
      root.render(<AuthForm />)
    })
    await click(botonConTexto('¿Olvidaste tu contraseña?'))
    await act(async () => {
      setInputValue(input('email'), 'ana@correo.com')
    })
    await submit()
  }

  it('🔴 sin respuesta: la conexión (antes «Ocurrió un error» a todo)', async () => {
    await pedirEnlace(sinRed())
    expect(texto()).toMatch(/conexión/)
  })

  it('🔴 un 5xx: nuestro', async () => {
    await pedirEnlace(falloDeSupabase())
    expect(texto()).toMatch(/No pudimos enviarte el enlace: algo falló de nuestro lado/)
  })

  it('el límite de envíos, por su código (no por el texto)', async () => {
    await pedirEnlace(errorDeSupabase('AuthApiError', 'For security purposes, you can only request this after 42 seconds.', 429, 'over_email_send_rate_limit'))
    expect(texto()).toContain('Límite de envíos alcanzado')
  })
})
