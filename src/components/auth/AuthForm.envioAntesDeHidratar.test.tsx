/**
 * AuthForm — el correo y la contraseña no pueden terminar en la URL.
 *
 * Prueba en vivo, 2026-09-16: quien tocaba «Iniciar sesión» antes de que React
 * hidratara mandaba el `<form>` como GET nativo, y la pantalla quedaba en
 * `/auth?email=…&password=…` — en el historial, en el log del servidor y en
 * cualquier proxy.
 *
 * Acá se renderiza el formulario COMO LO MANDA EL SERVIDOR (`renderToString`,
 * sin un solo manejador de eventos) y se mira qué haría el navegador con él:
 * con qué método se enviaría y si el botón deja enviar. Después se hidrata y
 * se comprueba que el formulario vuelve a funcionar. Y aparte, que una URL que
 * ya trae la contraseña se limpia al montar sin usarla.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { signInWithEmailMock, signUpWithEmailMock } = vi.hoisted(() => ({
  signInWithEmailMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: signInWithEmailMock,
    signUpWithEmail: signUpWithEmailMock,
    resendSignUpEmail: vi.fn(),
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

/** Sin animaciones: cada `motion.x` es su etiqueta HTML, igual en servidor y cliente. */
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
let root: Root | null = null

beforeEach(() => {
  sessionStorage.clear()
  signInWithEmailMock.mockReset()
  signUpWithEmailMock.mockReset()
  window.history.replaceState(null, '', '/auth')
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(async () => {
  if (root) {
    const r = root
    await act(async () => r.unmount())
  }
  root = null
  container.remove()
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

/**
 * Lo que haría el navegador con este `<form>` sin JavaScript: el método (sin
 * `method`, GET) y la URL a la que iría. En GET los campos con `name` se pegan
 * a la URL; en POST viajan en el cuerpo.
 */
function envioNativo(form: HTMLFormElement): { metodo: string; url: string } {
  const metodo = (form.getAttribute('method') ?? 'get').toLowerCase()
  const destino = new URL(form.getAttribute('action') ?? window.location.href, window.location.href)
  if (metodo === 'get') {
    destino.search = ''
    for (const el of Array.from(form.elements) as HTMLInputElement[]) {
      if (el.name && !el.disabled) destino.searchParams.append(el.name, el.value)
    }
  }
  return { metodo, url: destino.toString() }
}

function botonDeEnviar(form: HTMLFormElement): HTMLButtonElement {
  const boton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
  expect(boton).not.toBeNull()
  return boton!
}

/**
 * react-hook-form elige `useLayoutEffect` cuando ve un `window`, y bajo
 * happy-dom lo ve aunque se esté renderizando «en el servidor». En Next no pasa
 * (en el servidor no hay `window`): se calla SÓLO esa advertencia del entorno de
 * prueba, no cualquier error.
 */
const ADVERTENCIA_DEL_ENTORNO = /useLayoutEffect does nothing on the server/

/** El HTML del servidor, pegado en el documento: todavía no hay React encima. */
function comoLoMandaElServidor(elemento: React.ReactElement): HTMLFormElement {
  const original = console.error
  const filtro = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && ADVERTENCIA_DEL_ENTORNO.test(args[0])) return
    original(...args)
  })
  try {
    container.innerHTML = renderToString(elemento)
  } finally {
    filtro.mockRestore()
  }
  const form = container.querySelector('form')
  expect(form).not.toBeNull()
  return form!
}

async function hidratar(elemento: React.ReactElement) {
  await act(async () => {
    root = hydrateRoot(container, elemento)
  })
}

describe('AuthForm antes de hidratar', () => {
  it('🔴 el login llega con method="post" y el botón apagado: ni clic ni Enter pueden mandar la contraseña en la URL', () => {
    const form = comoLoMandaElServidor(<AuthForm />)

    // El campo SÍ tiene `name`: sin la guarda, iría en la URL.
    expect(form.querySelector('input[name="password"][type="password"]')).not.toBeNull()

    const { metodo, url } = envioNativo(form)
    expect(metodo).toBe('post')
    expect(url).not.toContain('password')
    expect(url).not.toContain('email=')

    // Con el botón por defecto deshabilitado, el navegador no envía ni al
    // hacer clic ni al apretar Enter en un campo (envío implícito).
    expect(botonDeEnviar(form).disabled).toBe(true)
  })

  it('con ?mode=register el servidor igual manda el login (el modo se aplica en un efecto), y tampoco puede ir por GET', () => {
    comoLoMandaElServidor(<AuthForm defaultMode="register" />)

    const formularios = Array.from(container.querySelectorAll('form'))
    expect(formularios).toHaveLength(1)
    for (const cada of formularios) {
      expect(envioNativo(cada).metodo).toBe('post')
      expect(botonDeEnviar(cada).disabled).toBe(true)
    }
  })

  it('🔴 el registro —que sólo aparece ya hidratado— también va en POST: correo, contraseña y confirmación', async () => {
    await act(async () => {
      root = createRoot(container)
      root.render(<AuthForm defaultMode="register" />)
    })

    const form = container.querySelector('form')!
    expect(form.querySelector('input[name="confirmPassword"]')).not.toBeNull()
    const { metodo, url } = envioNativo(form)
    expect(metodo).toBe('post')
    expect(url).not.toContain('password')
  })

  it('un clic sobre el botón del HTML del servidor no dispara el envío', () => {
    const form = comoLoMandaElServidor(<AuthForm />)
    const envios = vi.fn((e: Event) => e.preventDefault())
    form.addEventListener('submit', envios)

    botonDeEnviar(form).click()
    expect(envios).not.toHaveBeenCalled()

    // Control: el mismo clic con el botón prendido SÍ envía. Sin esto la
    // prueba pasaría también en un entorno que nunca envía formularios.
    botonDeEnviar(form).disabled = false
    botonDeEnviar(form).click()
    expect(envios).toHaveBeenCalledTimes(1)
  })

  it('al hidratar el botón se prende, sin desajuste de hidratación, y el formulario sigue en POST', async () => {
    const errores = vi.spyOn(console, 'error').mockImplementation(() => {})
    comoLoMandaElServidor(<AuthForm />)

    await hidratar(<AuthForm />)

    const form = container.querySelector('form')!
    expect(botonDeEnviar(form).disabled).toBe(false)
    expect(envioNativo(form).metodo).toBe('post')
    const desajustes = errores.mock.calls.filter((args) =>
      args.some(
        (a) =>
          typeof a === 'string' &&
          /did not match|hydration failed|error occurred during hydration|does not match server/i.test(a),
      ),
    )
    expect(desajustes).toEqual([])
  })

  it('montado directo en el cliente (un modal) el botón arranca prendido', async () => {
    await act(async () => {
      root = createRoot(container)
      root.render(<AuthForm />)
    })

    const form = container.querySelector('form')!
    expect(envioNativo(form).metodo).toBe('post')
    expect(botonDeEnviar(form).disabled).toBe(false)
  })
})

describe('AuthForm con la contraseña ya en la URL', () => {
  it('🔴 la saca de la barra al montar y NO la usa: ni la precarga ni intenta entrar', async () => {
    window.history.replaceState(
      null,
      '',
      '/auth?email=nico%40gmail.com&password=Secreta.123&returnUrl=%2Fpanel%2Finmobiliaria',
    )

    await act(async () => {
      root = createRoot(container)
      root.render(<AuthForm />)
    })

    expect(window.location.pathname).toBe('/auth')
    expect(window.location.search).toBe('?returnUrl=%2Fpanel%2Finmobiliaria')
    expect(window.location.href).not.toContain('Secreta')

    const correo = container.querySelector('input[name="email"]') as HTMLInputElement
    const contrasena = container.querySelector('input[name="password"]') as HTMLInputElement
    expect(correo.value).toBe('')
    expect(contrasena.value).toBe('')
    expect(signInWithEmailMock).not.toHaveBeenCalled()
    expect(signUpWithEmailMock).not.toHaveBeenCalled()
  })
})
