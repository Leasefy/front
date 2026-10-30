/**
 * Protege la regla que sostiene el paso más frágil del recorrido: crear la
 * cuenta y entrar. Ahí la aprobación cambia de fuente (localStorage →
 * estudio gratis de documentos del back principal) y es donde se puede perder sin que nadie
 * lo note.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const getAccessToken = vi.fn()
const apiClientGet = vi.fn()

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...real,
    getAccessToken: () => getAccessToken(),
    apiClient: { ...real.apiClient, get: (...args: unknown[]) => apiClientGet(...args) },
  }
})

const { ApiError } = await import('@/lib/api/client')
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

/** Raw `/calificacion-leasefy/estudio/actual` with a finished study. */
function estudioRaw(status: string, resultado: Record<string, unknown> | null = null) {
  return {
    estudio: {
      id: '11111111-1111-4111-8111-111111111111',
      status,
      creadoEl: '2026-10-28T10:00:00.000Z',
      terminadoEl: status === 'COMPLETED' ? '2026-10-28T10:02:00.000Z' : null,
      venceEl: status === 'COMPLETED' ? '2099-04-28T10:02:00.000Z' : null,
      documentos: [],
      faltan: [],
      resultado,
      error: null,
    },
  }
}
const ESTUDIO_APROBADO = estudioRaw('COMPLETED', { canonMaximoCop: 3_200_000, condiciones: [] })

describe('de dónde sale la aprobación', () => {
  beforeEach(() => {
    window.localStorage.clear()
    getAccessToken.mockReset()
    apiClientGet.mockReset()
  })

  it('sin sesión usa el respaldo local (el estudio necesita JWT)', async () => {
    getAccessToken.mockReturnValue(null)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(apiClientGet).not.toHaveBeenCalled()
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.aprobacion?.topeAprobadoCop).toBe(2_800_000)
  })

  it('CON sesión, un 404 (sin orden todavía) NO borra la aprobación local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockRejectedValue(new ApiError(404, 'not found'))
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.vigente).toBe(true)
  })

  it('CON sesión, "sin estudio" tampoco borra la aprobación local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue({ estudio: null })
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
  })

  it('un estado REAL del estudio (aprobado) sí manda sobre el local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue(ESTUDIO_APROBADO)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.aprobacion?.topeAprobadoCop).toBe(3_200_000)
  })

  it('un estudio terminado sin ingreso verificado (rechazado) también manda sobre el local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue(estudioRaw('COMPLETED', { canonMaximoCop: null, veredicto: 'REVISAR' }))
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('rechazado')
    expect(r.aprobacion?.topeAprobadoCop).toBeNull()
  })

  it('un estudio en proceso se muestra como en_proceso', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue(estudioRaw('PROCESSING'))
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('en_proceso')
  })

  it('un estudio fallido cae a sin_estudio, y por lo tanto respeta el local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue(estudioRaw('FAILED'))
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado') // el local, porque un fallido no personaliza
  })

  it('sin local y sin estudio queda en el estado que enseña el camino', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockRejectedValue(new ApiError(404, 'not found'))
    borrarAprobacionLocal()
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('sin_estudio')
  })

  it('un fallo de red tampoco borra lo local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockRejectedValue(new Error('offline'))
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.error).not.toBeNull()
  })

  it('un fallo de red sin local cae al estado que enseña el camino, no a un error visible como aprobación', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockRejectedValue(new Error('offline'))
    borrarAprobacionLocal()
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion).toEqual(SIN_APROBACION)
  })
})
