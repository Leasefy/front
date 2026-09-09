import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  terminarSesion,
  sesionTerminada,
  motivoDeSesionTerminada,
  purgarSesionLocal,
  haySesionGuardada,
  registrarCierreDeSesion,
  resetSessionTerminal,
  tomarAvisoDeCierre,
  terminarSesionSiMurio,
  registrarConfirmacionDeSesion,
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

// ── El aviso de una sola vez ────────────────────────────────────────────────
//
// Nico (2026-09-08) vio «Tu sesión expiró» en /auth mientras ya estaba
// entrando otra vez. La causa: el cartel se decidía por `?reason=expirada`, y
// ese parámetro sobrevive a la recarga, al historial y a la pestaña que el
// navegador restaura. Estos tests fijan la regla nueva: el cartel sale cuando
// hubo un cierre real y reciente, y sale UNA vez.

describe('tomarAvisoDeCierre', () => {
  it('devuelve el motivo del cierre que acaba de ocurrir', () => {
    terminarSesion('expirada')
    expect(tomarAvisoDeCierre('expirada')).toBe('expirada')
  })

  it('lo consume: recargar /auth ya no lo repite', () => {
    terminarSesion('inactividad')
    expect(tomarAvisoDeCierre('inactividad')).toBe('inactividad')
    // Segunda lectura = la recarga.
    expect(tomarAvisoDeCierre('inactividad')).toBeNull()
  })

  it('con `?reason=` viejo en la URL y sin cierre real, no anuncia nada', () => {
    // Marcador, historial o pestaña restaurada: la URL trae el motivo pero acá
    // nunca se cerró ninguna sesión.
    expect(tomarAvisoDeCierre('expirada')).toBeNull()
  })

  it('un aviso de hace más de un minuto ya no cuenta', () => {
    terminarSesion('expirada')
    const guardado = JSON.parse(sessionStorage.getItem('leasefy.aviso-de-cierre')!)
    sessionStorage.setItem(
      'leasefy.aviso-de-cierre',
      JSON.stringify({ ...guardado, en: guardado.en - 61_000 }),
    )
    expect(tomarAvisoDeCierre('expirada')).toBeNull()
  })

  it('sin sessionStorage (modo privado) se cree en la URL: callar un cierre real es peor', () => {
    const real = window.sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem() {
          throw new Error('acceso denegado')
        },
        setItem() {},
        removeItem() {},
      },
      configurable: true,
    })

    expect(tomarAvisoDeCierre('revocada')).toBe('revocada')
    // Y un motivo inventado a mano en la URL sigue sin pintar nada.
    expect(tomarAvisoDeCierre('cualquier-cosa')).toBeNull()

    Object.defineProperty(window, 'sessionStorage', { value: real, configurable: true })
  })

  it('no escribe el aviso cuando el cierre se dispara DESDE /auth (no hay a dónde llevarlo)', () => {
    enRuta('/auth')
    terminarSesion('expirada')
    expect(sessionStorage.getItem('leasefy.aviso-de-cierre')).toBeNull()
  })
})

// ── Confirmar la muerte antes de declararla ────────────────────────────────
//
// Un 401 con código de sesión muerta lo manda el SERVIDOR, y el servidor puede
// estar equivocado sobre nosotros (otro proyecto de Supabase, secreto de JWT
// rotado). La única prueba que no se discute es el refresh token.

describe('terminarSesionSiMurio', () => {
  it('NO cierra si el refresh token sigue vivo', async () => {
    registrarConfirmacionDeSesion(async () => false)

    const cerro = await terminarSesionSiMurio('expirada')

    expect(cerro).toBe(false)
    expect(sesionTerminada()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('cierra cuando renovar falla de verdad', async () => {
    registrarConfirmacionDeSesion(async () => true)

    const cerro = await terminarSesionSiMurio('expirada')

    expect(cerro).toBe(true)
    expect(sesionTerminada()).toBe(true)
    expect(replace).toHaveBeenCalledOnce()
  })

  it('confirma UNA sola vez aunque fallen las ocho peticiones en vuelo', async () => {
    const confirmar = vi.fn(async () => true)
    registrarConfirmacionDeSesion(confirmar)

    await Promise.all(Array.from({ length: 8 }, () => terminarSesionSiMurio('expirada')))

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledOnce()
  })

  it('sin confirmador registrado se conserva el cierre de siempre', async () => {
    await terminarSesionSiMurio('expirada')
    expect(sesionTerminada()).toBe(true)
  })

  it('si confirmar revienta, se cierra: nadie queda encerrado en un panel sin sesión', async () => {
    registrarConfirmacionDeSesion(async () => {
      throw new Error('red caída')
    })
    await terminarSesionSiMurio('expirada')
    expect(sesionTerminada()).toBe(true)
  })
})
