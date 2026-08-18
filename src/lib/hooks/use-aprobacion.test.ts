/**
 * Protege la regla que sostiene el paso más frágil del recorrido: crear la
 * cuenta y entrar. Ahí la aprobación cambia de fuente (localStorage →
 * pre-scoring del back principal) y es donde se puede perder sin que nadie
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

/** Raw `/pre-scoring/current` completo y aprobado. */
const PRE_SCORING_APROBADO = {
  order: { status: 'COMPLETED', paymentStatus: 'PAID', expiresAt: null },
  evaluation: {
    status: 'completed',
    result: {
      carriers: [{ name: 'Fianli', product_type: null, viable: true, prima_mensual_cop: 45_000 }],
      fianly: { maxEntrenchmentValue: 3_200_000 },
      bureau: { minimumScore: null, monthlyCapacity: null },
    },
  },
}

describe('de dónde sale la aprobación', () => {
  beforeEach(() => {
    window.localStorage.clear()
    getAccessToken.mockReset()
    apiClientGet.mockReset()
  })

  it('sin sesión usa el respaldo local (el pre-scoring necesita JWT)', async () => {
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

  it('CON sesión, un pre-scoring "sin_estudio" tampoco borra la aprobación local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue({ order: null, evaluation: null })
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
  })

  it('un estado REAL del pre-scoring (aprobado) sí manda sobre el local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue(PRE_SCORING_APROBADO)
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado')
    expect(r.aprobacion?.topeAprobadoCop).toBe(3_200_000)
  })

  it('un rechazado del pre-scoring también manda sobre el local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue({
      order: { status: 'COMPLETED', paymentStatus: 'PAID', expiresAt: null },
      evaluation: {
        status: 'completed',
        result: {
          carriers: [{ name: 'Sura', product_type: null, viable: false, prima_mensual_cop: null }],
          fianly: { maxEntrenchmentValue: null },
          bureau: { minimumScore: null, monthlyCapacity: null },
        },
      },
    })
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('rechazado')
  })

  it('un expirado del pre-scoring cae a sin_estudio, y por lo tanto respeta el local', async () => {
    getAccessToken.mockReturnValue('token')
    apiClientGet.mockResolvedValue({
      order: { status: 'EXPIRED', paymentStatus: 'PAID', expiresAt: '2026-01-01T00:00:00.000Z' },
      evaluation: null,
    })
    guardarAprobacionLocal(APROBADO_LOCAL)
    const r = await renderHook(useAprobacion)
    expect(r.aprobacion?.estado).toBe('aprobado') // el local, porque un vencido no personaliza
  })

  it('sin local y sin pre-scoring queda en el estado que enseña el camino', async () => {
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
