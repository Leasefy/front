/**
 * `mantenimientoApi.borrarFoto` (Nico, 02-10-2026): borra UNA foto de la
 * solicitud con `DELETE /inmobiliaria/mantenimiento/:id/fotos?ruta=…&destino=…`.
 * La usa el cierre cancelado para las fotos del trabajo de ese intento.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ del: vi.fn() }))

vi.mock('../client', async (importOriginal) => {
  const real = await importOriginal<typeof import('../client')>()
  return { ...real, apiClient: { ...real.apiClient, delete: h.del } }
})

import { mantenimientoApi } from '../inmobiliaria.service'

beforeEach(() => {
  h.del.mockReset().mockResolvedValue({ ruta: 'r', completionPhotoUrls: [] })
})

describe('mantenimientoApi.borrarFoto', () => {
  it('pide DELETE a la ruta de la solicitud con la ruta y el destino en la consulta', async () => {
    const ruta = 'mantenimiento/agencia-1/sol 7/a b.jpg'
    await mantenimientoApi.borrarFoto('sol 7', ruta, 'trabajo')

    expect(h.del).toHaveBeenCalledTimes(1)
    const [url] = h.del.mock.calls[0] as [string]
    const [camino, consulta] = url.split('?')
    expect(camino).toBe('/inmobiliaria/mantenimiento/sol%207/fotos')
    const params = new URLSearchParams(consulta)
    // La ruta viaja ENTERA (con sus barras y espacios), sin que se corte.
    expect(params.get('ruta')).toBe(ruta)
    expect(params.get('destino')).toBe('trabajo')
  })

  it('sin destino es «reporte», como al subir', async () => {
    await mantenimientoApi.borrarFoto('sol-7', 'mantenimiento/a/sol-7/x.jpg')
    const [url] = h.del.mock.calls[0] as [string]
    expect(new URLSearchParams(url.split('?')[1]).get('destino')).toBe('reporte')
  })

  it('devuelve lo que responde el back y un rechazo sube tal cual', async () => {
    await expect(mantenimientoApi.borrarFoto('sol-7', 'r', 'trabajo')).resolves.toEqual({
      ruta: 'r',
      completionPhotoUrls: [],
    })
    const fallo = new Error('409')
    h.del.mockRejectedValueOnce(fallo)
    await expect(mantenimientoApi.borrarFoto('sol-7', 'r', 'trabajo')).rejects.toBe(fallo)
  })
})
