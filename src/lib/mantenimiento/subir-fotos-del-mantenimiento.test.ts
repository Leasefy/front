/**
 * 02-10-2026 · Las fotos de una solicitud se suben de verdad, una por una,
 * DESPUÉS de crearla. Una foto que falla no deshace la solicitud: se dice cuál
 * y por qué, por el traductor.
 */
import { describe, it, expect, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { MENSAJES_DEL_MANTENIMIENTO } from './limites-del-mantenimiento'
import { lasQueNoSubieron, subirFotosDelMantenimiento } from './subir-fotos-del-mantenimiento'

const foto = (nombre: string, tipo = 'image/jpeg', peso = 1024) =>
  new File([new Uint8Array(peso)], nombre, { type: tipo })

describe('subirFotosDelMantenimiento', () => {
  it('sube cada foto a SU solicitud, en el orden en que se eligieron', async () => {
    const subir = vi.fn().mockResolvedValue({ photoUrls: [] })
    const a = foto('a.jpg')
    const b = foto('b.png', 'image/png')
    const r = await subirFotosDelMantenimiento('sol-1', [a, b], subir)
    expect(subir.mock.calls).toEqual([
      ['sol-1', a],
      ['sol-1', b],
    ])
    expect(r).toEqual({ subidas: 2, fallidas: [] })
  })

  it('🔴 una foto que falla no tumba las demás ni rechaza la promesa', async () => {
    const subir = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(
        new ApiError(400, MENSAJES_DEL_MANTENIMIENTO.fotoPesada, 'FOTO_MUY_PESADA', {
          statusCode: 400,
          code: 'FOTO_MUY_PESADA',
          message: MENSAJES_DEL_MANTENIMIENTO.fotoPesada,
        }),
      )
      .mockResolvedValueOnce({})
    const r = await subirFotosDelMantenimiento(
      'sol-1',
      [foto('a.jpg'), foto('b.jpg'), foto('c.jpg')],
      subir,
    )
    expect(subir).toHaveBeenCalledTimes(3)
    expect(r.subidas).toBe(2)
    expect(r.fallidas).toEqual([{ nombre: 'b.jpg', motivo: MENSAJES_DEL_MANTENIMIENTO.fotoPesada }])
  })

  it('una foto que el back no aceptaría ni se manda: el motivo es la frase del back', async () => {
    const subir = vi.fn()
    const r = await subirFotosDelMantenimiento(
      'sol-1',
      [foto('plano.pdf', 'application/pdf'), foto('enorme.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)],
      subir,
    )
    expect(subir).not.toHaveBeenCalled()
    expect(r.fallidas).toEqual([
      { nombre: 'plano.pdf', motivo: MENSAJES_DEL_MANTENIMIENTO.fotoTipo },
      { nombre: 'enorme.jpg', motivo: MENSAJES_DEL_MANTENIMIENTO.fotoPesada },
    ])
  })

  it('🔴 un 5xx dice que fue de nuestro lado, con la referencia; sin respuesta, la conexión', async () => {
    const subir = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError(503, 'No se pudo guardar la foto.', 'FOTO_NO_GUARDADA', {
          statusCode: 503,
          code: 'FOTO_NO_GUARDADA',
          message: 'No se pudo guardar la foto.',
        }),
      )
      .mockRejectedValueOnce(
        new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
          statusCode: 500,
          code: 'ERROR_INTERNO',
          message: 'Error interno del servidor',
          referencia: 'ab12cd34',
        }),
      )
      .mockRejectedValueOnce(new ApiError(0, 'Failed to fetch'))
    const r = await subirFotosDelMantenimiento('sol-1', [foto('a.jpg'), foto('b.jpg'), foto('c.jpg')], subir)
    expect(r.fallidas[1].motivo).toContain('de nuestro lado')
    expect(r.fallidas[1].motivo).toContain('ab12cd34')
    expect(r.fallidas[1].motivo).not.toMatch(/conexi[oó]n/i)
    expect(r.fallidas[2].motivo).toMatch(/conexi[oó]n/i)
  })

  it('lasQueNoSubieron dice cuál y por qué', () => {
    expect(
      lasQueNoSubieron([
        { nombre: 'a.jpg', motivo: 'Uno.' },
        { nombre: 'b.jpg', motivo: 'Dos.' },
      ]),
    ).toBe('«a.jpg»: Uno. · «b.jpg»: Dos.')
  })
})
