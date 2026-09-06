/**
 * 🔴 «No tenés acceso» no es «no hay nada agendado».
 *
 * `getAgenda` se tragaba el 403 y devolvía un feed vacío, así que la pantalla
 * afirmaba que la agencia no tiene nada en la agenda — pudiendo estar llena.
 * El 404 sí se traga a propósito: sin contexto de agencia la agenda vacía ES
 * la verdad.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError } from './client'

const getMock = vi.fn()
vi.mock('./client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./client')>()
  return { ...real, apiClient: { ...real.apiClient, get: (...a: unknown[]) => getMock(...a) } }
})

const { agendaApi } = await import('./agenda.service')

afterEach(() => vi.clearAllMocks())

describe('agendaApi.getAgenda', () => {
  it('un 403 se propaga: la pantalla tiene que poder decir «no tenés acceso»', async () => {
    getMock.mockRejectedValue(new ApiError(403, 'Forbidden'))
    await expect(agendaApi.getAgenda()).rejects.toBeInstanceOf(ApiError)
  })

  it('un 404 sí devuelve la agenda vacía: no hay agencia que consultar', async () => {
    getMock.mockRejectedValue(new ApiError(404, 'Not Found'))
    await expect(agendaApi.getAgenda()).resolves.toEqual({
      resumen: {
        total: 0,
        visitas: 0,
        firmasPendientes: 0,
        vencimientos: 0,
        seguimientos: 0,
        inspecciones: 0,
        tareas: 0,
      },
      eventos: [],
      total: 0,
    })
  })
})
