/**
 * Cerrar una solicitud con las fotos del trabajo (Nico, 02-10-2026).
 *
 * La subida es la MISMA de las fotos del reporte (`subirFotosDelMantenimiento`
 * → `POST :id/fotos`, una por una) y el cierre lleva sus rutas en
 * `completionPhotoUrls`. Dobles: ninguna subida real.
 */

import { describe, it, expect, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { borrarLasDelIntento, completarConFotos } from './completar-con-fotos'

const foto = (nombre: string) => new File([new Uint8Array(10)], nombre, { type: 'image/jpeg' })

function dobles() {
  const subir = vi.fn(async (_id: string, f: File, _destino: string) => ({ ruta: `agencia/sol-1/${f.name}` }))
  const completar = vi.fn(async (id: string, cierre: { completionPhotoUrls: string[] }) => ({ id, ...cierre }))
  return { subir, completar }
}

describe('completarConFotos', () => {
  it('sube cada foto, una por una y en orden, y cierra con sus rutas en `completionPhotoUrls`', async () => {
    const d = dobles()
    const fotos = [foto('a.jpg'), foto('b.jpg'), foto('c.jpg')]
    const r = await completarConFotos('sol-1', fotos, new Map(), d)
    // 🔴 Con `destino: 'trabajo'`: directo a `completionPhotoUrls`, no a las del reporte.
    expect(d.subir.mock.calls.map(([id, f, destino]) => [id, f.name, destino])).toEqual([
      ['sol-1', 'a.jpg', 'trabajo'],
      ['sol-1', 'b.jpg', 'trabajo'],
      ['sol-1', 'c.jpg', 'trabajo'],
    ])
    expect(d.completar).toHaveBeenCalledWith('sol-1', {
      completionPhotoUrls: ['agencia/sol-1/a.jpg', 'agencia/sol-1/b.jpg', 'agencia/sol-1/c.jpg'],
    })
    expect(r.completada).toBe(true)
  })

  it('sin fotos cierra igual, con la lista vacía y sin subir nada', async () => {
    const d = dobles()
    await completarConFotos('sol-1', [], new Map(), d)
    expect(d.subir).not.toHaveBeenCalled()
    expect(d.completar).toHaveBeenCalledWith('sol-1', { completionPhotoUrls: [] })
  })

  it('🔴 una foto que no sube NO cierra la solicitud, y dice cuál y por qué', async () => {
    const d = dobles()
    d.subir.mockImplementation(async (_id, f) => {
      if (f.name === 'b.jpg') {
        throw new ApiError(400, 'La foto no puede pesar más de 5 MB.', 'DATOS_INVALIDOS', {
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['La foto no puede pesar más de 5 MB.'],
        })
      }
      return { ruta: `agencia/sol-1/${f.name}` }
    })
    const r = await completarConFotos('sol-1', [foto('a.jpg'), foto('b.jpg')], new Map(), d)
    expect(d.completar).not.toHaveBeenCalled()
    expect(r).toEqual({
      completada: false,
      fallidas: [{ nombre: 'b.jpg', motivo: 'La foto no puede pesar más de 5 MB.' }],
    })
  })

  it('al reintentar sólo sube las que faltaban: las que ya subieron no se suben dos veces', async () => {
    const d = dobles()
    const a = foto('a.jpg')
    const b = foto('b.jpg')
    const yaSubidas = new Map<File, string>()
    d.subir.mockImplementationOnce(async (_id, f) => ({ ruta: `agencia/sol-1/${f.name}` }))
    d.subir.mockImplementationOnce(async () => {
      throw new ApiError(0, 'Failed to fetch')
    })
    const primero = await completarConFotos('sol-1', [a, b], yaSubidas, d)
    expect(primero.completada).toBe(false)

    d.subir.mockClear()
    const segundo = await completarConFotos('sol-1', [a, b], yaSubidas, d)
    expect(d.subir).toHaveBeenCalledTimes(1)
    expect(d.subir.mock.calls[0]![1]).toBe(b)
    expect(segundo.completada).toBe(true)
    expect(d.completar).toHaveBeenCalledWith('sol-1', {
      completionPhotoUrls: ['agencia/sol-1/a.jpg', 'agencia/sol-1/b.jpg'],
    })
  })

  it('quitar la que falló y confirmar cierra con las que sí subieron', async () => {
    const d = dobles()
    const a = foto('a.jpg')
    const yaSubidas = new Map<File, string>([[a, 'agencia/sol-1/a.jpg']])
    await completarConFotos('sol-1', [a], yaSubidas, d)
    expect(d.subir).not.toHaveBeenCalled()
    expect(d.completar).toHaveBeenCalledWith('sol-1', { completionPhotoUrls: ['agencia/sol-1/a.jpg'] })
  })

  it('🔴 el 400 del tope del trabajo (`completionPhotoUrls`) vuelve como frase del CAMPO y no cierra', async () => {
    const d = dobles()
    const frase = 'Puedes adjuntar hasta 30 fotos.'
    d.subir.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'completionPhotoUrls', regla: 'lista_maxima', mensaje: frase }],
      }),
    )
    const r = await completarConFotos('sol-1', [foto('a.jpg')], new Map(), d)
    expect(d.completar).not.toHaveBeenCalled()
    expect(r.completada).toBe(false)
    expect(r.completada === false && r.fraseDelTope).toBe(frase)
  })

  it('un rechazo del cierre sube tal cual, para que lo lea el traductor', async () => {
    const d = dobles()
    const fallo = new ApiError(500, 'Error interno', 'ERROR_INTERNO', { statusCode: 500, referencia: 'ab12' })
    d.completar.mockRejectedValue(fallo)
    await expect(completarConFotos('sol-1', [], new Map(), d)).rejects.toBe(fallo)
  })
})

/**
 * 🔴 Cancelar el cierre borra las fotos del trabajo que subió ESE intento
 * (Nico, 02-10-2026), con `DELETE :id/fotos` y `destino: 'trabajo'`.
 */
describe('borrarLasDelIntento', () => {
  it('borra cada foto que subió el intento, una por una, con destino «trabajo»', async () => {
    const yaSubidas = new Map([
      [foto('a.jpg'), 'agencia/sol-1/a.jpg'],
      [foto('b.jpg'), 'agencia/sol-1/b.jpg'],
    ])
    let enVuelo = 0
    let maximoEnVuelo = 0
    const borrar = vi.fn(async () => {
      enVuelo += 1
      maximoEnVuelo = Math.max(maximoEnVuelo, enVuelo)
      await Promise.resolve()
      enVuelo -= 1
    })

    const r = await borrarLasDelIntento('sol-1', yaSubidas, { borrar })

    expect(borrar.mock.calls).toEqual([
      ['sol-1', 'agencia/sol-1/a.jpg', 'trabajo'],
      ['sol-1', 'agencia/sol-1/b.jpg', 'trabajo'],
    ])
    // Una por una: el back reescribe la lista de la fila en cada borrado.
    expect(maximoEnVuelo).toBe(1)
    expect(r).toEqual({ borradas: ['agencia/sol-1/a.jpg', 'agencia/sol-1/b.jpg'], fallidas: [] })
    // Vacía de una: un segundo «Cancelar» no repite nada.
    expect(yaSubidas.size).toBe(0)
  })

  it('🔴 un borrado que falla no frena los demás, nunca se rechaza y queda escrito en el log', async () => {
    const yaSubidas = new Map([
      [foto('a.jpg'), 'agencia/sol-1/a.jpg'],
      [foto('b.jpg'), 'agencia/sol-1/b.jpg'],
    ])
    const fallo = new ApiError(503, 'No pudimos borrar el archivo.', 'FOTO_NO_BORRADA')
    const borrar = vi.fn(async (_id: string, ruta: string) => {
      if (ruta.endsWith('a.jpg')) throw fallo
    })
    const anotar = vi.fn()

    const r = await borrarLasDelIntento('sol-1', yaSubidas, { borrar, anotar })

    expect(r).toEqual({ borradas: ['agencia/sol-1/b.jpg'], fallidas: ['agencia/sol-1/a.jpg'] })
    expect(anotar).toHaveBeenCalledTimes(1)
    expect(anotar.mock.calls[0]![0]).toContain('agencia/sol-1/a.jpg')
    expect(anotar.mock.calls[0]![0]).toContain('sol-1')
    expect(anotar.mock.calls[0]![1]).toBe(fallo)
  })

  it('ni un log que revienta lo hace fallar', async () => {
    const yaSubidas = new Map([[foto('a.jpg'), 'agencia/sol-1/a.jpg']])
    const r = await borrarLasDelIntento('sol-1', yaSubidas, {
      borrar: vi.fn().mockRejectedValue(new Error('caído')),
      anotar: () => {
        throw new Error('el log tampoco')
      },
    })
    expect(r.fallidas).toEqual(['agencia/sol-1/a.jpg'])
  })

  it('sin fotos del intento no llama a nadie', async () => {
    const borrar = vi.fn()
    await borrarLasDelIntento('sol-1', new Map(), { borrar })
    expect(borrar).not.toHaveBeenCalled()
  })

  it('la misma ruta dos veces se borra una sola vez', async () => {
    const borrar = vi.fn().mockResolvedValue(undefined)
    await borrarLasDelIntento(
      'sol-1',
      new Map([
        [foto('a.jpg'), 'agencia/sol-1/a.jpg'],
        [foto('a-otra-vez.jpg'), 'agencia/sol-1/a.jpg'],
      ]),
      { borrar },
    )
    expect(borrar).toHaveBeenCalledTimes(1)
  })
})

/**
 * 🔴 Quitar con la «x» una foto del trabajo que YA subió y confirmar la BORRA
 * (Nico, 02-10-2026), con el `DELETE :id/fotos` de siempre y antes del cierre
 * (el back sólo deja borrar con la solicitud abierta). Si no, el archivo
 * quedaba huérfano en Storage.
 */
describe('completarConFotos — las quitadas con la «x»', () => {
  it('🔴 se borran ANTES del cierre, con destino «trabajo», y no van en la lista', async () => {
    const orden: string[] = []
    const d = dobles()
    d.completar.mockImplementation(async (id, cierre) => {
      orden.push('completar')
      return { id, ...cierre }
    })
    const borrar = vi.fn(async (_id: string, ruta: string) => {
      orden.push(`borrar ${ruta}`)
    })
    const a = foto('a.jpg')
    const yaSubidas = new Map<File, string>([[a, 'agencia/sol-1/a.jpg']])
    const quitadas = new Set(['agencia/sol-1/b.jpg'])

    const r = await completarConFotos('sol-1', [a], yaSubidas, { ...d, borrar }, quitadas)

    expect(borrar).toHaveBeenCalledWith('sol-1', 'agencia/sol-1/b.jpg', 'trabajo')
    expect(orden).toEqual(['borrar agencia/sol-1/b.jpg', 'completar'])
    expect(d.completar).toHaveBeenCalledWith('sol-1', { completionPhotoUrls: ['agencia/sol-1/a.jpg'] })
    expect(r.completada).toBe(true)
    // Ya se intentó: un segundo cierre no las vuelve a borrar.
    expect(quitadas.size).toBe(0)
  })

  it('🔴 un borrado que falla no frena el cierre y queda escrito en el log', async () => {
    const d = dobles()
    const fallo = new ApiError(503, 'No pudimos borrar el archivo.', 'FOTO_NO_BORRADA')
    const borrar = vi.fn().mockRejectedValue(fallo)
    const anotar = vi.fn()

    const r = await completarConFotos(
      'sol-1',
      [],
      new Map(),
      { ...d, borrar, anotar },
      new Set(['agencia/sol-1/b.jpg']),
    )

    expect(r.completada).toBe(true)
    expect(d.completar).toHaveBeenCalledWith('sol-1', { completionPhotoUrls: [] })
    expect(anotar).toHaveBeenCalledTimes(1)
    expect(anotar.mock.calls[0]![0]).toContain('agencia/sol-1/b.jpg')
    expect(anotar.mock.calls[0]![0]).toContain('al confirmar el cierre')
    expect(anotar.mock.calls[0]![1]).toBe(fallo)
  })

  it('si otra subida falla, NO se cierra y las quitadas quedan para el próximo intento (o para «Cancelar»)', async () => {
    const d = dobles()
    d.subir.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    const borrar = vi.fn()
    const quitadas = new Set(['agencia/sol-1/b.jpg'])

    const r = await completarConFotos('sol-1', [foto('c.jpg')], new Map(), { ...d, borrar }, quitadas)

    expect(r.completada).toBe(false)
    expect(borrar).not.toHaveBeenCalled()
    expect(quitadas).toEqual(new Set(['agencia/sol-1/b.jpg']))
  })

  it('una ruta que otra foto elegida todavía usa no se borra', async () => {
    const d = dobles()
    const borrar = vi.fn()
    const a = foto('a.jpg')
    await completarConFotos(
      'sol-1',
      [a],
      new Map([[a, 'agencia/sol-1/a.jpg']]),
      { ...d, borrar },
      new Set(['agencia/sol-1/a.jpg']),
    )
    expect(borrar).not.toHaveBeenCalled()
  })

  it('«Cancelar» también borra las quitadas: eran de este intento', async () => {
    const borrar = vi.fn().mockResolvedValue(undefined)
    const quitadas = new Set(['agencia/sol-1/b.jpg'])
    await borrarLasDelIntento('sol-1', new Map([[foto('a.jpg'), 'agencia/sol-1/a.jpg']]), { borrar }, quitadas)
    expect(borrar.mock.calls).toEqual([
      ['sol-1', 'agencia/sol-1/a.jpg', 'trabajo'],
      ['sol-1', 'agencia/sol-1/b.jpg', 'trabajo'],
    ])
    expect(quitadas.size).toBe(0)
  })
})
