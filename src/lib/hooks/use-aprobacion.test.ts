/**
 * Protege la regla que sostiene el paso más frágil del recorrido: crear la
 * cuenta y entrar. Ahí la aprobación cambia de fuente (localStorage → backend)
 * y es donde se puede perder sin que nadie lo note.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const getAccessToken = vi.fn()
const fetchAprobacion = vi.fn()

vi.mock('@/lib/api/client', () => ({ getAccessToken: () => getAccessToken() }))
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

describe('de dónde sale la aprobación', () => {
  beforeEach(() => {
    window.localStorage.clear()
    getAccessToken.mockReset()
    fetchAprobacion.mockReset()
  })

  it('sin sesión usa el respaldo local', async () => {
    getAccessToken.mockReturnValue(null)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.aprobacion?.topeAprobadoCop).toBe(2_800_000)
  })

  it('CON sesión, un "sin_estudio" del backend NO borra la aprobación local', async () => {
    // Es el caso real de hoy: `/api/tenant/aprobacion` no existe y su 404 se
    // mapea a `sin_estudio`. Sin esta regla, crear la cuenta hacía desaparecer
    // la aprobación justo al entrar a ver el catálogo.
    getAccessToken.mockReturnValue('token')
    fetchAprobacion.mockResolvedValue(SIN_APROBACION)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.vigente).toBe(true)
  })

  it('un estado REAL del backend sí manda sobre el local', async () => {
    getAccessToken.mockReturnValue('token')
    fetchAprobacion.mockResolvedValue({ ...SIN_APROBACION, estado: 'rechazado' })
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('rechazado')
  })

  it('sin local y sin backend queda en el estado que enseña el camino', async () => {
    getAccessToken.mockReturnValue('token')
    fetchAprobacion.mockResolvedValue(SIN_APROBACION)
    borrarAprobacionLocal()
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('sin_estudio')
  })

  it('un fallo de red tampoco borra lo local', async () => {
    getAccessToken.mockReturnValue('token')
    fetchAprobacion.mockRejectedValue(new Error('offline'))
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
  })
})
