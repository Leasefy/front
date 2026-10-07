/**
 * /auth/update-password — lo que salió en producción (Nico, 30-09-2026):
 *
 *  1. Con segundo factor, «Guardar contraseña» mostraba «AAL2 session is
 *     required to update email or password when MFA is enabled.» y no había
 *     cómo seguir. Ahora pasa primero por el código y vuelve.
 *  2. El botón tenía dos flechas: la ↗ del botón y una → a mano.
 *  3. Al guardar, la sesión deja de ser «sólo para cambiar la contraseña».
 *
 * QA 01-10-2026: después de guardar iba a la landing con la sesión del enlace
 * viva, y los botones de la landing cambiaban solos. Ahora la sesión se cierra,
 * se espera, y recién entonces se va a entrar con la contraseña nueva.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, pushMock, authState, busqueda, pasos } = vi.hoisted(() => {
  const pasos: string[] = []
  return {
    replaceMock: vi.fn(),
    pushMock: vi.fn(),
    pasos,
    authState: {
      isLoading: false,
      isAuthenticated: true,
      mfaRequired: false,
      signOut: vi.fn(async () => {
        pasos.push('signOut:empieza')
        await new Promise((r) => setTimeout(r, 5))
        pasos.push('signOut:termina')
      }),
    },
    busqueda: { valor: '' },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  useSearchParams: () => new URLSearchParams(busqueda.valor),
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => authState }))
vi.mock('@/lib/api/client', () => ({ getAccessToken: () => 'token-aal1' }))
vi.mock('@/lib/hooks/use-hidratado', () => ({ useHidratado: () => true }))
vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import UpdatePasswordPage from './page'
import { COOKIE_DE_RECUPERACION, borrarMarcaDeRecuperacion, hayMarcaDeRecuperacion } from '@/lib/auth/sesion-de-recuperacion'
import { tomarAvisoDeCierre } from '@/lib/auth/session-terminal'

const realLocation = window.location
let locationReplace: ReturnType<typeof vi.fn>

const CLAVE = 'Otra-Clave#2026-segura'
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  authState.isLoading = false
  authState.isAuthenticated = true
  authState.mfaRequired = false
  busqueda.valor = ''
  pasos.length = 0
  sessionStorage.clear()
  borrarMarcaDeRecuperacion()
  locationReplace = vi.fn((url: string) => pasos.push(`navega:${url}`))
  Object.defineProperty(window, 'location', {
    value: { ...realLocation, pathname: '/auth/update-password', search: '', origin: 'http://localhost:3001', replace: locationReplace },
    writable: true,
    configurable: true,
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true })
})

function escribir(input: HTMLInputElement, valor: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function pintar() {
  await act(async () => {
    root.render(<UpdatePasswordPage />)
  })
}

async function guardar() {
  const [clave, confirmar] = [...container.querySelectorAll('input')] as HTMLInputElement[]
  await act(async () => {
    escribir(clave, CLAVE)
    escribir(confirmar, CLAVE)
  })
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('/auth/update-password', () => {
  it('con segundo factor pendiente lleva al código y vuelve acá, sin mostrar el formulario activo', async () => {
    authState.mfaRequired = true
    await pintar()
    expect(replaceMock).toHaveBeenCalledWith(`/auth/mfa-verify?returnUrl=${encodeURIComponent('/auth/update-password')}`)
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('conserva la consulta al volver del código (invitación con destino)', async () => {
    authState.mfaRequired = true
    busqueda.valor = 'next=%2Finquilino'
    await pintar()
    expect(replaceMock).toHaveBeenCalledWith(
      `/auth/mfa-verify?returnUrl=${encodeURIComponent('/auth/update-password?next=%2Finquilino')}`,
    )
  })

  it('si Supabase exige aal2 al guardar, va al código en vez de mostrar el error en inglés', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: 403, error_code: 'insufficient_aal', msg: 'AAL2 session is required to update email or password when MFA is enabled.' }),
          { status: 403 },
        ),
      ),
    )
    await pintar()
    await guardar()
    expect(replaceMock).toHaveBeenCalledWith(`/auth/mfa-verify?returnUrl=${encodeURIComponent('/auth/update-password')}`)
    expect(container.textContent).not.toContain('AAL2')
  })

  it('al guardar borra la marca de la sesión de recuperación', async () => {
    document.cookie = `${COOKIE_DE_RECUPERACION}=1; path=/`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    await pintar()
    await guardar()
    expect(container.textContent).toContain('Contraseña actualizada')
    expect(hayMarcaDeRecuperacion()).toBe(false)
    // Que el cierre de la sesión termine dentro de esta prueba.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
  })

  it('recuperación: cierra la sesión del enlace, ESPERA a que termine y recién entonces va a entrar con la nueva', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    await pintar()
    await guardar()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(authState.signOut).toHaveBeenCalledTimes(1)
    expect(pasos).toEqual([
      'signOut:empieza',
      'signOut:termina',
      'navega:/auth?reason=contrasena-actualizada',
    ])
    // Nunca a la landing, ni por el router.
    expect(pushMock).not.toHaveBeenCalled()
    // El aviso de /auth: «Tu contraseña quedó actualizada…».
    expect(tomarAvisoDeCierre(null)).toBe('contrasena-actualizada')
    // Mientras cierra no hay botón que navegue antes de tiempo.
    expect(container.querySelector('a button')).toBeNull()
    expect(container.textContent).not.toContain('Ir al inicio')
    expect(container.textContent).toContain('Te llevamos a iniciar sesión')
  })

  it('recuperación con destino propio (?next=): lo conserva para después de entrar', async () => {
    busqueda.valor = 'next=%2Fpanel%2Finmobiliaria'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    await pintar()
    await guardar()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(locationReplace).toHaveBeenCalledWith(
      `/auth?reason=contrasena-actualizada&returnUrl=${encodeURIComponent('/panel/inmobiliaria')}`,
    )
  })

  it('si el cierre falla, igual sale a entrar con la nueva (no se queda con la sesión del enlace en pantalla)', async () => {
    authState.signOut.mockRejectedValueOnce(new Error('red caída'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    await pintar()
    await guardar()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(locationReplace).toHaveBeenCalledWith('/auth?reason=contrasena-actualizada')
    // Y no pinta el fallo del cierre como si la contraseña no se hubiera guardado.
    expect(container.textContent).not.toContain('red caída')
  })

  it('la invitación (?nuevo=1) NO cierra la sesión: no tiene otra forma de entrar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    busqueda.valor = 'nuevo=1&next=%2Finquilino'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    await pintar()
    await guardar()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })
    expect(authState.signOut).not.toHaveBeenCalled()
    expect(locationReplace).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/inquilino')
  })

  it('«Guardar contraseña» lleva una sola flecha', async () => {
    await pintar()
    const boton = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(boton.textContent).toContain('Guardar contraseña')
    expect(boton.querySelectorAll('svg')).toHaveLength(1)
  })
})

/**
 * 02-10-2026 · Los errores de Supabase por código y con la regla de oro.
 * Antes: `enEspanol()` leía el texto en inglés, lo que no reconocía salía tal
 * cual, y un fallo de red decía «Failed to fetch».
 */
describe('/auth/update-password — los errores', () => {
  const respuesta = (status: number, cuerpo: object) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }))

  it('🔴 sin respuesta (el fetch no salió): habla de la conexión, no «Failed to fetch»', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await pintar()
    await guardar()
    expect(container.textContent).toMatch(/conexión/)
    expect(container.textContent).not.toContain('Failed to fetch')
  })

  it('🔴 un 5xx dice que falló de nuestro lado, sin el inglés de Supabase', async () => {
    vi.stubGlobal('fetch', respuesta(500, { code: 500, error_code: 'unexpected_failure', msg: 'Database error updating user' }))
    await pintar()
    await guardar()
    expect(container.textContent).toMatch(/No pudimos guardar tu contraseña: algo falló de nuestro lado/)
    expect(container.textContent).not.toMatch(/Database|conexi[oó]n/)
  })

  it('🔴 la contraseña débil va debajo del campo, con el foco', async () => {
    vi.stubGlobal(
      'fetch',
      respuesta(422, { code: 422, error_code: 'weak_password', msg: 'Password is known to be weak', weak_password: { reasons: ['pwned'] } }),
    )
    await pintar()
    await guardar()
    const clave = container.querySelectorAll('input')[0] as HTMLInputElement
    expect(clave.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(clave.getAttribute('aria-describedby')!)?.textContent).toMatch(/filtraciones/)
    expect(document.activeElement).toBe(clave)
    expect(container.textContent).not.toMatch(/Password is known/)
  })

  it('la misma contraseña de antes, por su código, debajo del campo', async () => {
    vi.stubGlobal(
      'fetch',
      respuesta(422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' }),
    )
    await pintar()
    await guardar()
    expect(container.textContent).toContain('Esa contraseña ya la usaste antes. Elige otra.')
    expect(container.textContent).not.toMatch(/should be different/)
  })

  it('un 4xx sin código conocido no muestra el inglés', async () => {
    vi.stubGlobal('fetch', respuesta(400, { code: 400, msg: 'Something new from GoTrue' }))
    await pintar()
    await guardar()
    expect(container.textContent).toContain('No pudimos guardar tu contraseña. Intenta de nuevo.')
    expect(container.textContent).not.toContain('Something new')
  })

  it('las contraseñas que no coinciden se dicen debajo de la confirmación, enlazadas al campo', async () => {
    await pintar()
    const [clave, confirmar] = [...container.querySelectorAll('input')] as HTMLInputElement[]
    await act(async () => {
      escribir(clave, CLAVE)
      escribir(confirmar, 'otra')
    })
    expect(confirmar.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(confirmar.getAttribute('aria-describedby')!)?.textContent).toBe('Las contraseñas no coinciden')
  })
})
