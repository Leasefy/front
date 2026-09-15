/**
 * validacion-del-estudio.service — «Ya la validé» y «Reenviar la validación».
 * `apiClient.post` se mockea; `ApiError` es el real, para que el mapeo de
 * errores se pruebe contra la clase que de verdad lanza el cliente.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return { ...real, apiClient: { ...real.apiClient, post: (...a: unknown[]) => postMock(...a) } }
})

import { ApiError } from '@/lib/api/client'
import { reenviarValidacion, verificarValidacion, ValidacionError } from './validacion-del-estudio.service'

// Con llaves: una función devuelta por `beforeEach` es la limpieza del test, y
// `mockReset()` devuelve el mock — Vitest lo llamaría al terminar cada prueba.
beforeEach(() => {
  postMock.mockReset()
})

/** El error que lanza el servicio cuando el back responde con `status`. */
async function errorAnte(llamada: () => Promise<unknown>, status: number, mensaje: string): Promise<Error> {
  const delBack = new ApiError(status, mensaje)
  postMock.mockImplementation(() => Promise.reject(delBack))
  try {
    await llamada()
  } catch (err) {
    return err as Error
  }
  throw new Error('la llamada no lanzó')
}

describe('verificarValidacion («Ya la validé»)', () => {
  it('pregunta al back por la orden de la sesión y devuelve el estado', async () => {
    postMock.mockResolvedValue({ estado: 'pendiente' })
    await expect(verificarValidacion()).resolves.toBe('pendiente')
    expect(postMock).toHaveBeenCalledWith('/pre-scoring/current/verificar-autorizacion', {})
  })

  it('un estado que no conocemos no se inventa: es un error', async () => {
    postMock.mockResolvedValue({ estado: 'aprobadisimo' })
    await expect(verificarValidacion()).rejects.toBeInstanceOf(ValidacionError)
  })

  it('sesión vencida: lo dice así', async () => {
    const err = await errorAnte(verificarValidacion, 401, 'Unauthorized')
    expect(err).toBeInstanceOf(ValidacionError)
    expect(err.message).toContain('Tu sesión expiró')
  })

  it('un 503 del back no se muestra crudo', async () => {
    const err = await errorAnte(verificarValidacion, 503, 'Service Unavailable')
    expect(err.message).toContain('No pudimos revisar tu validación')
  })
})

describe('reenviarValidacion («Reenviar la validación»)', () => {
  it('reenvía y devuelve cuántos reenvíos le quedan', async () => {
    postMock.mockResolvedValue({ enviada: true, reenviosRestantes: 4 })
    await expect(reenviarValidacion()).resolves.toEqual({ reenviosRestantes: 4 })
    expect(postMock).toHaveBeenCalledWith('/pre-scoring/current/reenviar-autorizacion', {})
  })

  it('429: muestra el mensaje que escribió el back para la persona', async () => {
    const err = await errorAnte(
      reenviarValidacion,
      429,
      'Acabamos de reenviarte la validación. Espera un par de minutos antes de pedirla otra vez.',
    )
    expect(err.message).toContain('Espera un par de minutos')
  })

  it('sin conexión: lo dice', async () => {
    const err = await errorAnte(reenviarValidacion, 0, 'Failed to fetch')
    expect(err.message).toContain('No pudimos conectarnos')
  })
})
