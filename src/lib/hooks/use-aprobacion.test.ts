/**
 * Protege la regla que sostiene el paso más frágil del recorrido: crear la
 * cuenta y entrar. Ahí la aprobación cambia de fuente (localStorage → backend)
 * y es donde se puede perder sin que nadie lo note.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Se dobla `useAuth`, no `getAccessToken`.
 *
 * El hook leía el token directo, y en el primer render devuelve null aunque la
 * persona tenga sesión — nunca preguntaba `/tenant/aprobacion`. Ahora espera a
 * que el AuthProvider resuelva, así que "todavía no sé" es un tercer estado que
 * estos tests también tienen que poder representar.
 */
const auth = vi.fn()
const fetchAprobacion = vi.fn()

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => auth() }))
vi.mock('@/lib/api/aprobacion.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/aprobacion.service')>(
    '@/lib/api/aprobacion.service',
  )
  return { ...real, fetchAprobacion: () => fetchAprobacion() }
})

const { SIN_APROBACION } = await import('@/lib/api/aprobacion.service')
const { guardarAprobacionLocal, borrarAprobacionLocal } = await import('@/lib/api/aprobacion-local')
const { useAprobacion } = await import('./use-aprobacion')

const { renderHook } = await import('./__test-utils__/render-hook')

const APROBADO_LOCAL = {
  asegurabilidad: 'yes' as const,
  aseguradoras: [{ aseguradora: 'sura', status: 'approved' as const }],
  stubMode: false,
  message: 'ok',
  maxAfianzableCop: 2_800_000,
}

/** Sesión ya resuelta: hay o no hay, pero se sabe. */
const conSesion = { isAuthenticated: true, isLoading: false }
const sinSesion = { isAuthenticated: false, isLoading: false }
/** Todavía no se sabe — el AuthProvider no contestó. */
const resolviendo = { isAuthenticated: false, isLoading: true }

describe('de dónde sale la aprobación', () => {
  beforeEach(() => {
    window.localStorage.clear()
    auth.mockReset()
    fetchAprobacion.mockReset()
  })

  it('sin sesión usa el respaldo local', async () => {
    auth.mockReturnValue(sinSesion)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.aprobacion?.topeAprobadoCop).toBe(2_800_000)
  })

  it('CON sesión, un "sin_estudio" del backend NO borra la aprobación local', async () => {
    // Es el caso real de hoy: `/api/tenant/aprobacion` no existe y su 404 se
    // mapea a `sin_estudio`. Sin esta regla, crear la cuenta hacía desaparecer
    // la aprobación justo al entrar a ver el catálogo.
    auth.mockReturnValue(conSesion)
    fetchAprobacion.mockResolvedValue(SIN_APROBACION)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.vigente).toBe(true)
  })

  it('un estado REAL del backend sí manda sobre el local', async () => {
    auth.mockReturnValue(conSesion)
    fetchAprobacion.mockResolvedValue({ ...SIN_APROBACION, estado: 'rechazado' })
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('rechazado')
  })

  it('sin local y sin backend queda en el estado que enseña el camino', async () => {
    auth.mockReturnValue(conSesion)
    fetchAprobacion.mockResolvedValue(SIN_APROBACION)
    borrarAprobacionLocal()
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('sin_estudio')
  })

  it('un fallo de red tampoco borra lo local', async () => {
    auth.mockReturnValue(conSesion)
    fetchAprobacion.mockRejectedValue(new Error('offline'))
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
  })

  describe('mientras la sesión no se resuelve', () => {
    /*
     * El defecto que esto fija: el hook leía `getAccessToken()`, que en el
     * primer render devuelve null aunque haya sesión, y como corría una sola
     * vez ahí quedaba — nunca preguntaba al backend. A alguien aprobado se le
     * mostraba `sin_estudio` en el catálogo, en la ficha y en el botón de
     * postularse, hasta que navegara a otra pantalla sin recargar.
     */
    it('no le pregunta a nadie todavía', async () => {
      auth.mockReturnValue(resolviendo)
      const r = await renderHook(useAprobacion)
      expect(fetchAprobacion).not.toHaveBeenCalled()
    })

    it('sigue diciendo que carga — "no sé" no es "no tiene"', async () => {
      auth.mockReturnValue(resolviendo)
      const r = await renderHook(useAprobacion)
      expect(r.cargando).toBe(true)
    })

    it('en cuanto se resuelve, sí le pregunta al backend', async () => {
      auth.mockReturnValue(conSesion)
      fetchAprobacion.mockResolvedValue({ ...SIN_APROBACION, estado: 'aprobado' })
      await renderHook(useAprobacion)
      expect(fetchAprobacion).toHaveBeenCalledTimes(1)
    })
  })
})
