/**
 * AuthForm — el correo y la contraseña del registro (Nico, 2026-09-07).
 *
 * Tres pedidos en una tarde, mirando la pantalla de «Crea tu cuenta»:
 *  - «¿Para qué el botón de iniciar sesión si debe ir al correo?» — la
 *    pantalla de «Revisa tu correo» ahora abre el correo, reenvía el enlace y
 *    deja corregir la dirección; el login queda abajo, para quien confirmó
 *    desde otro dispositivo.
 *  - Un medidor de contraseña con mínimo real: «123456» ya no crea cuenta.
 *  - El correo se valida diciendo QUÉ está mal, se normaliza (minúsculas, sin
 *    espacios) y los dominios mal escritos se atajan antes de mandar el enlace
 *    a ningún lado.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pushMock, signUpWithEmailMock, signInWithEmailMock, resendMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
  resendMock: vi.fn(),
}))

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

async function click(el: Element | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

async function submit() {
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function renderRegister() {
  await act(async () => {
    root.render(<AuthForm defaultMode="register" />)
  })
}

async function llenarRegistro(email: string, password = 'Secreta#2026') {
  await act(async () => {
    setInputValue(input('email'), email)
    setInputValue(input('password'), password)
    setInputValue(input('confirmPassword'), password)
  })
}

describe('AuthForm — registro: el correo', () => {
  it('registra con el correo normalizado: sin espacios y en minúsculas', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await renderRegister()
    await llenarRegistro('  Nico@Gmail.com ')
    await submit()
    expect(signUpWithEmailMock).toHaveBeenCalledTimes(1)
    expect(signUpWithEmailMock.mock.calls[0][0]).toBe('nico@gmail.com')
  })

  it('dice qué está mal en el correo en vez de «email inválido»', async () => {
    await renderRegister()
    await llenarRegistro('nicogmail.com')
    await submit()
    expect(signUpWithEmailMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Falta la @')
  })

  it('con un dominio mal escrito frena y ofrece la corrección; tocarla corrige el campo', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await renderRegister()
    await llenarRegistro('nico@gmail.con')
    await submit()
    expect(signUpWithEmailMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('parece que quisiste escribir nico@gmail.com')

    const sugerencia = porTestId('sugerencia-de-correo')
    expect(sugerencia?.textContent).toContain('nico@gmail.com')
    await click(sugerencia!.querySelector('button'))
    expect(input('email').value).toBe('nico@gmail.com')

    await submit()
    expect(signUpWithEmailMock).toHaveBeenCalledTimes(1)
    expect(signUpWithEmailMock.mock.calls[0][0]).toBe('nico@gmail.com')
  })

  it('«Está bien así» deja pasar el dominio raro tal cual', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await renderRegister()
    await llenarRegistro('nico@gmail.con')
    await submit()
    expect(signUpWithEmailMock).not.toHaveBeenCalled()

    await click(porTestId('correo-esta-bien-asi'))
    expect(porTestId('sugerencia-de-correo')).toBeNull()
    await submit()
    expect(signUpWithEmailMock).toHaveBeenCalledTimes(1)
    expect(signUpWithEmailMock.mock.calls[0][0]).toBe('nico@gmail.con')
  })
})

describe('AuthForm — registro: la contraseña', () => {
  it('muestra el medidor con las cinco barras antes de escribir', async () => {
    await renderRegister()
    expect(porTestId('medidor-de-contrasena')).not.toBeNull()
    expect(container.querySelectorAll('[data-testid="medidor-barra"]')).toHaveLength(5)
    expect(container.textContent).toContain('Mínimo 8 caracteres')
  })

  it('no crea la cuenta con «123456» y lo dice', async () => {
    await renderRegister()
    await llenarRegistro('nico@gmail.com', '123456')
    await submit()
    expect(signUpWithEmailMock).not.toHaveBeenCalled()
    expect(porTestId('medidor-de-contrasena')?.getAttribute('data-nivel')).toBe('muy-debil')
    expect(container.textContent).toContain('Todavía es débil')
    expect(container.textContent).toContain('más usadas')
  })

  it('con una contraseña aceptable sí crea la cuenta', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await renderRegister()
    await llenarRegistro('nico@gmail.com', 'Casaazul9')
    await submit()
    expect(signUpWithEmailMock).toHaveBeenCalledTimes(1)
  })
})

describe('AuthForm — «Revisa tu correo»', () => {
  it('ofrece abrir Gmail, reenviar y corregir; ya no «Ir a iniciar sesión»', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    resendMock.mockResolvedValue(undefined)
    await renderRegister()
    await llenarRegistro('nico@gmail.com')
    await submit()

    expect(container.textContent).toContain('Revisa tu correo')
    expect(container.textContent).not.toContain('Ir a iniciar sesión')
    expect(container.textContent).not.toContain('Vuelve aquí e inicia sesión')
    expect(container.textContent).toContain('con la sesión ya abierta')

    const abrir = porTestId<HTMLAnchorElement>('abrir-correo')
    expect(abrir?.textContent).toContain('Abrir Gmail')
    expect(abrir?.getAttribute('href')).toContain('mail.google.com')
    expect(abrir?.getAttribute('target')).toBe('_blank')

    await click(porTestId('reenviar-confirmacion'))
    expect(resendMock).toHaveBeenCalledTimes(1)
    expect(resendMock.mock.calls[0][0]).toBe('nico@gmail.com')
    // El mismo destino que el primer enlace, o el reenvío pierde el onboarding.
    expect(String(resendMock.mock.calls[0][1])).toContain('/auth/callback?returnUrl=')
    expect(container.textContent).toContain('te lo reenviamos')

    // Quien confirmó desde el celular sí necesita entrar acá: queda abajo.
    expect(container.textContent).toContain('¿Ya confirmaste desde otro dispositivo?')
  })

  it('«Corregirlo» vuelve al formulario con el correo escrito, sin borrarlo', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await renderRegister()
    await llenarRegistro('nico@gmail.com')
    await submit()
    await click(porTestId('corregir-correo'))
    expect(input('email')).not.toBeNull()
    expect(input('email').value).toBe('nico@gmail.com')
  })

  it('con un dominio propio no hay botón de abrir el correo', async () => {
    signUpWithEmailMock.mockResolvedValue({ requiresConfirmation: true })
    await renderRegister()
    await llenarRegistro('ana@empresa.com.co')
    await submit()
    expect(container.textContent).toContain('Revisa tu correo')
    expect(porTestId('abrir-correo')).toBeNull()
    expect(porTestId('reenviar-confirmacion')).not.toBeNull()
  })
})

describe('AuthForm — login: el correo', () => {
  async function renderLogin() {
    await act(async () => {
      root.render(<AuthForm defaultMode="login" />)
    })
  }

  it('con espacios adentro no intenta entrar y lo dice', async () => {
    await renderLogin()
    await act(async () => {
      setInputValue(input('email'), 'nico garcia@gmail.com')
      setInputValue(input('password'), 'loquesea')
    })
    await submit()
    expect(signInWithEmailMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('no puede tener espacios')
  })

  it('entra con el correo en minúsculas y sin espacios, escriba como escriba', async () => {
    signInWithEmailMock.mockResolvedValue({ id: 'u1', role: 'tenant' })
    await renderLogin()
    await act(async () => {
      setInputValue(input('email'), ' Ana@Example.com')
      setInputValue(input('password'), 'loquesea')
    })
    await submit()
    expect(signInWithEmailMock).toHaveBeenCalledTimes(1)
    expect(signInWithEmailMock.mock.calls[0][0]).toBe('ana@example.com')
  })

  it('con el correo sin confirmar (enlace vencido) ofrece reenviar el enlace desde el login', async () => {
    signInWithEmailMock.mockRejectedValue(new Error('Email not confirmed'))
    resendMock.mockResolvedValue(undefined)
    await renderLogin()
    await act(async () => {
      setInputValue(input('email'), 'Nico@Gmail.com')
      setInputValue(input('password'), 'loquesea')
    })
    await submit()
    expect(container.textContent).toContain('todavía no está confirmado')

    await click(porTestId('reenviar-confirmacion'))
    expect(resendMock).toHaveBeenCalledTimes(1)
    expect(resendMock.mock.calls[0][0]).toBe('nico@gmail.com')
    expect(String(resendMock.mock.calls[0][1])).toContain('/auth/callback?returnUrl=')
    expect(container.textContent).toContain('te lo reenviamos')
    // Sin «Corregirlo»: el correo del login es el que escribió, no hay nada que corregir acá.
    expect(porTestId('corregir-correo')).toBeNull()
  })

  it('con la contraseña mal no ofrece reenviar nada', async () => {
    signInWithEmailMock.mockRejectedValue(new Error('Invalid login credentials'))
    await renderLogin()
    await act(async () => {
      setInputValue(input('email'), 'nico@gmail.com')
      setInputValue(input('password'), 'loquesea')
    })
    await submit()
    expect(container.textContent).toContain('Correo o contraseña incorrectos')
    expect(porTestId('reenviar-confirmacion')).toBeNull()
  })

  it('el dominio mal escrito se ofrece pero no bloquea (la contraseña vieja sigue valiendo)', async () => {
    signInWithEmailMock.mockResolvedValue({ id: 'u1', role: 'tenant' })
    await renderLogin()
    await act(async () => {
      setInputValue(input('email'), 'ana@hotmial.com')
      setInputValue(input('password'), 'loquesea')
    })
    expect(porTestId('sugerencia-de-correo')?.textContent).toContain('ana@hotmail.com')
    expect(porTestId('correo-esta-bien-asi')).toBeNull()
    await submit()
    expect(signInWithEmailMock).toHaveBeenCalledTimes(1)
  })
})
