import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  terminarSesion,
  sesionTerminada,
  motivoDeSesionTerminada,
  purgarSesionLocal,
  haySesionGuardada,
  registrarCierreDeSesion,
  resetSessionTerminal,
} from './session-terminal'
import { TENANT_ONBOARDING_STORAGE_KEY } from '@/lib/onboarding/tenant-onboarding-status'

/**
 * Este módulo decide cuándo echar a alguien de la app. Los tests van sobre las
 * dos formas en que eso puede salir mal: echar a quien NO había que echar
 * (visitante anónimo, cierre voluntario, pantalla de login) y no echar —o echar
 * ocho veces— a quien sí.
 */

const realLocation = window.location
let replace: ReturnType<typeof vi.fn>

/** Reemplaza window.location conservando `replace` espiable. */
function enRuta(pathname: string, search = '') {
  replace = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { pathname, search, origin: 'https://app.leasefy.co', replace },
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  resetSessionTerminal()
  localStorage.clear()
  sessionStorage.clear()
  enRuta('/panel/inmobiliaria/cobros')
})

afterEach(() => {
  resetSessionTerminal()
  vi.restoreAllMocks()
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
})

describe('terminarSesion', () => {
  it('marca la sesión como terminada y guarda el motivo', () => {
    expect(sesionTerminada()).toBe(false)
    expect(motivoDeSesionTerminada()).toBeNull()

    terminarSesion('expirada')

    expect(sesionTerminada()).toBe(true)
    expect(motivoDeSesionTerminada()).toBe('expirada')
  })

  it('lleva a /auth conservando a dónde quería ir y por qué salió', () => {
    enRuta('/panel/inmobiliaria/cobros', '?estado=vencidos')

    terminarSesion('expirada')

    expect(replace).toHaveBeenCalledTimes(1)
    const destino = new URL(replace.mock.calls[0][0] as string)
    expect(destino.pathname).toBe('/auth')
    expect(destino.searchParams.get('returnUrl')).toBe(
      '/panel/inmobiliaria/cobros?estado=vencidos',
    )
    expect(destino.searchParams.get('reason')).toBe('expirada')
  })

  /**
   * Cuando un token muere no falla una petición: fallan las ocho que la
   * pantalla tenía en vuelo. Sin idempotencia serían ocho navegaciones
   * pisándose y ocho signOut compitiendo.
   */
  it('es idempotente — ocho 401 simultáneos producen UNA sola salida', () => {
    const alCerrar = vi.fn()
    registrarCierreDeSesion(alCerrar)

    for (let i = 0; i < 8; i++) terminarSesion('expirada')

    expect(replace).toHaveBeenCalledTimes(1)
    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('conserva el PRIMER motivo, no el último', () => {
    terminarSesion('revocada')
    terminarSesion('expirada')
    expect(motivoDeSesionTerminada()).toBe('revocada')
  })

  it('avisa al handler registrado (limpieza asíncrona del AuthProvider)', () => {
    const alCerrar = vi.fn()
    registrarCierreDeSesion(alCerrar)
    terminarSesion('expirada')
    expect(alCerrar).toHaveBeenCalledTimes(1)
  })

  it('sale igual aunque el handler registrado explote', () => {
    registrarCierreDeSesion(() => {
      throw new Error('signOut roto')
    })
    expect(() => terminarSesion('expirada')).not.toThrow()
    expect(replace).toHaveBeenCalledTimes(1)
  })

  // Redirigir a /auth DESDE /auth es un refresh que borra lo que el usuario
  // estaba tipeando.
  it.each(['/auth', '/auth/callback', '/invitacion/abc123', '/registro'])(
    'NO redirige si ya está en una ruta de salida (%s)',
    (ruta) => {
      enRuta(ruta)
      terminarSesion('expirada')
      expect(replace).not.toHaveBeenCalled()
      // Pero la sesión sí queda cerrada: nada nuevo debe salir a la red.
      expect(sesionTerminada()).toBe(true)
    },
  )

  it('borra la sesión local ANTES de navegar', () => {
    localStorage.setItem('sb-proj-auth-token', 'x')
    let habiaTokenAlNavegar: string | null = 'todavía-no-se-llamó'
    enRuta('/panel')
    replace.mockImplementation(() => {
      habiaTokenAlNavegar = localStorage.getItem('sb-proj-auth-token')
    })

    terminarSesion('expirada')

    // Si la purga fuera asíncrona, la carga siguiente reintentaría el token
    // muerto y el usuario entraría en un rulo de redirecciones.
    expect(habiaTokenAlNavegar).toBeNull()
  })
})

describe('purgarSesionLocal', () => {
  it('borra las claves de Supabase y el borrador con PII del onboarding', () => {
    localStorage.setItem('sb-proj-auth-token', 'x')
    localStorage.setItem('supabase.auth.token', 'y')
    sessionStorage.setItem('sb-proj-auth-token', 'z')
    localStorage.setItem(TENANT_ONBOARDING_STORAGE_KEY, '{"phone":"300"}')

    purgarSesionLocal()

    expect(localStorage.getItem('sb-proj-auth-token')).toBeNull()
    expect(localStorage.getItem('supabase.auth.token')).toBeNull()
    expect(sessionStorage.getItem('sb-proj-auth-token')).toBeNull()
    expect(localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)).toBeNull()
  })

  it('no toca lo que no es de la sesión', () => {
    localStorage.setItem('leasefy:tema', 'oscuro')
    purgarSesionLocal()
    expect(localStorage.getItem('leasefy:tema')).toBe('oscuro')
  })
})

describe('haySesionGuardada', () => {
  /**
   * Es lo único que separa "se te venció la sesión" de "nunca entraste":
   * SIGNED_OUT es el mismo evento en los dos casos.
   */
  it('es false para un visitante anónimo', () => {
    expect(haySesionGuardada()).toBe(false)
  })

  it('es true con el token de @supabase/ssr en localStorage', () => {
    localStorage.setItem('sb-abcdef-auth-token', 'lo-que-sea')
    expect(haySesionGuardada()).toBe(true)
  })

  it('es true con el token partido en trozos (.0, .1)', () => {
    localStorage.setItem('sb-abcdef-auth-token.0', 'parte-1')
    expect(haySesionGuardada()).toBe(true)
  })

  it('no confunde otras claves con prefijo sb-', () => {
    localStorage.setItem('sb-algo-distinto', 'x')
    expect(haySesionGuardada()).toBe(false)
  })
})
