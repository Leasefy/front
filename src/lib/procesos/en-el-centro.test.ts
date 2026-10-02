/**
 * La base común del centro de procesos (01-10-2026): `lanzarEnElCentro` para
 * lo que corre en el servidor y `correrEnElNavegador` para lo que corre en la
 * pestaña. El back está simulado; el registro de «Detener» es el de verdad.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { Proceso } from '@/lib/api/procesos.types'

const { api, anunciarMock, abrirMock, invalidarMock, descargarMock } = vi.hoisted(() => ({
  api: {
    ver: vi.fn(),
    crear: vi.fn(),
    avance: vi.fn(),
    terminar: vi.fn(),
    fallar: vi.fn(),
    cancelar: vi.fn(),
  },
  anunciarMock: vi.fn(),
  abrirMock: vi.fn(),
  invalidarMock: vi.fn(),
  descargarMock: vi.fn(),
}))

vi.mock('@/lib/api/procesos.service', () => ({
  procesosApi: api,
  anunciarProceso: anunciarMock,
  abrirCentroDeProcesos: abrirMock,
  RECURSO_DE_PROCESOS: 'procesos',
}))
vi.mock('@/lib/api/refresco-de-datos', () => ({ invalidar: invalidarMock }))
vi.mock('@/lib/reportes/exportables', () => ({ descargarBlob: descargarMock }))

import {
  MS_ENTRE_AVANCES,
  MS_ENTRE_CONSULTAS,
  concurrencia,
  correrEnElNavegador,
  lanzarEnElCentro,
} from './en-el-centro'
import { detenerEnElNavegador } from '@/components/procesos/detener-en-el-navegador'

function proceso(estado: Proceso['estado'], extra: Partial<Proceso> = {}): Proceso {
  return { id: 'p-1', tipo: 'GENERACION', titulo: 'Generar', estado, ...extra } as Proceso
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-01T15:00:00Z'))
  for (const f of [...Object.values(api), anunciarMock, abrirMock, invalidarMock, descargarMock]) f.mockReset()
  api.crear.mockResolvedValue({ procesoId: 'n-1' })
  api.avance.mockResolvedValue({ cancelado: false })
  api.terminar.mockResolvedValue(proceso('TERMINADO', { id: 'n-1' }))
  api.fallar.mockResolvedValue(proceso('FALLO', { id: 'n-1' }))
  api.cancelar.mockResolvedValue(proceso('CORRIENDO', { id: 'n-1' }))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ══ lanzarEnElCentro ════════════════════════════════════════════════════════

describe('lanzarEnElCentro — lo que corre en el servidor', () => {
  it('anuncia, pide, abre el centro con el id y lo sigue hasta que termina; entonces invalida y avisa', async () => {
    const orden: string[] = []
    anunciarMock.mockImplementation(() => orden.push('anunciar'))
    const pedir = vi.fn(async () => {
      orden.push('pedir')
      return { procesoId: 'p-1' }
    })
    abrirMock.mockImplementation(() => orden.push('abrir'))
    api.ver
      .mockResolvedValueOnce(proceso('CORRIENDO'))
      .mockResolvedValueOnce(proceso('TERMINADO'))
    const alTerminar = vi.fn()

    const r = await lanzarEnElCentro({
      titulo: 'Generando los cobros de octubre',
      tipoDeProceso: 'GENERACION',
      pedir,
      recursos: ['cobros', 'cartera'],
      alTerminar,
    })

    // Devuelve en cuanto el back responde; el seguimiento va aparte.
    expect(r).toEqual({ procesoId: 'p-1' })
    expect(orden).toEqual(['anunciar', 'pedir', 'abrir'])
    expect(anunciarMock).toHaveBeenCalledWith({ titulo: 'Generando los cobros de octubre', tipoDeProceso: 'GENERACION' })
    expect(abrirMock).toHaveBeenCalledWith(expect.objectContaining({ procesoId: 'p-1' }))
    expect(api.ver).not.toHaveBeenCalled()
    expect(invalidarMock).not.toHaveBeenCalledWith('cobros')

    await vi.advanceTimersByTimeAsync(MS_ENTRE_CONSULTAS)
    expect(api.ver).toHaveBeenCalledTimes(1)
    expect(alTerminar).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(MS_ENTRE_CONSULTAS)
    expect(api.ver).toHaveBeenCalledTimes(2)
    expect(invalidarMock).toHaveBeenCalledWith('cobros')
    expect(invalidarMock).toHaveBeenCalledWith('cartera')
    expect(alTerminar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'TERMINADO' }))

    // Ya terminó: no consulta más.
    await vi.advanceTimersByTimeAsync(MS_ENTRE_CONSULTAS * 3)
    expect(api.ver).toHaveBeenCalledTimes(2)
  })

  it('si pedir() falla, el error le llega a quien llamó y no se abre ni se sigue nada', async () => {
    const error = new Error('No hay cobros para generar.')
    await expect(
      lanzarEnElCentro({ titulo: 'x', tipoDeProceso: 'GENERACION', pedir: () => Promise.reject(error) }),
    ).rejects.toBe(error)
    expect(abrirMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(MS_ENTRE_CONSULTAS * 2)
    expect(api.ver).not.toHaveBeenCalled()
  })

  it('un FALLO también cierra el seguimiento: invalida y avisa con la vista final', async () => {
    api.ver.mockResolvedValue(proceso('FALLO', { id: 'p-2', mensaje: 'Sin plantilla' }))
    const alTerminar = vi.fn()
    await lanzarEnElCentro({
      titulo: 'x',
      tipoDeProceso: 'ENVIO_MASIVO',
      pedir: async () => ({ procesoId: 'p-2' }),
      recursos: ['extractos'],
      alTerminar,
    })
    await vi.advanceTimersByTimeAsync(MS_ENTRE_CONSULTAS)
    expect(alTerminar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'FALLO' }))
    expect(invalidarMock).toHaveBeenCalledWith('extractos')
  })
})

// ══ correrEnElNavegador ═════════════════════════════════════════════════════

describe('correrEnElNavegador — lo que corre en la pestaña', () => {
  it('crea, anuncia, abre, limita el avance, sube el archivo y suelta Detener', async () => {
    const blob = new Blob(['a;b'], { type: 'text/csv' })
    const r = await correrEnElNavegador({
      tipo: 'EXPORTACION',
      titulo: 'Directorio de propietarios',
      total: 3,
      recursos: ['propietarios'],
      trabajo: async (ctx) => {
        expect(ctx.procesoId).toBe('n-1')
        // Tres avances en el mismo milisegundo: sólo sale el primero…
        expect(await ctx.avanzar(1, { total: 3 })).toBe(true)
        expect(await ctx.avanzar(2)).toBe(true)
        expect(await ctx.avanzar(3, { mensaje: '3 de 3' })).toBe(true)
        return { archivo: { blob, nombre: 'propietarios.csv' }, mensaje: '3 propietarios' }
      },
    })

    expect(api.crear).toHaveBeenCalledWith({ tipo: 'EXPORTACION', titulo: 'Directorio de propietarios', total: 3 })
    expect(anunciarMock).toHaveBeenCalledWith(expect.objectContaining({ procesoId: 'n-1', tipoDeProceso: 'EXPORTACION' }))
    expect(abrirMock).toHaveBeenCalledWith(expect.objectContaining({ procesoId: 'n-1' }))
    // …y al final, siempre, el último.
    expect(api.avance.mock.calls).toEqual([
      ['n-1', { hechos: 1, total: 3 }],
      ['n-1', { hechos: 3, mensaje: '3 de 3' }],
    ])
    expect(api.terminar).toHaveBeenCalledWith('n-1', {
      archivo: blob,
      nombreDelArchivo: 'propietarios.csv',
      mensaje: '3 propietarios',
    })
    expect(r).toMatchObject({ procesoId: 'n-1', enElCentro: true, detenido: false })
    expect(invalidarMock).toHaveBeenCalledWith('propietarios')
    expect(descargarMock).not.toHaveBeenCalled()
    // Terminó: el «Detener» ya no está registrado.
    expect(detenerEnElNavegador('n-1')).toBe(false)
  })

  it('pasado un segundo, el avance vuelve a salir', async () => {
    await correrEnElNavegador({
      tipo: 'APROBACION_MASIVA',
      titulo: 'Aprobar',
      trabajo: async (ctx) => {
        await ctx.avanzar(1)
        vi.advanceTimersByTime(MS_ENTRE_AVANCES)
        await ctx.avanzar(2)
      },
    })
    expect(api.avance.mock.calls.map((c) => c[1].hechos)).toEqual([1, 2])
    expect(api.terminar).toHaveBeenCalledWith('n-1', {})
  })

  it('«Detener» en esta pestaña para el bucle, pide cancelar al back y cierra igual', async () => {
    const hechos: number[] = []
    const r = await correrEnElNavegador({
      tipo: 'APROBACION_MASIVA',
      titulo: 'Aprobar 10 dispersiones',
      total: 10,
      trabajo: async (ctx) => {
        for (let i = 1; i <= 10; i++) {
          hechos.push(i)
          if (i === 3) expect(detenerEnElNavegador('n-1')).toBe(true)
          if (!(await ctx.avanzar(i))) break
        }
        return { mensaje: `${hechos.length} aprobadas` }
      },
    })
    expect(hechos).toEqual([1, 2, 3])
    expect(api.cancelar).toHaveBeenCalledWith('n-1')
    expect(api.terminar).toHaveBeenCalledWith('n-1', { mensaje: '3 aprobadas' })
    expect(r.detenido).toBe(true)
    expect(detenerEnElNavegador('n-1')).toBe(false)
  })

  it('si el back dice cancelado (lo cancelaron desde el centro), el bucle para', async () => {
    api.avance.mockResolvedValueOnce({ cancelado: false }).mockResolvedValueOnce({ cancelado: true })
    const hechos: number[] = []
    const r = await correrEnElNavegador({
      tipo: 'ENVIO_MASIVO',
      titulo: 'Invitaciones',
      trabajo: async (ctx) => {
        for (let i = 1; i <= 10; i++) {
          if (ctx.debeParar()) break
          hechos.push(i)
          vi.advanceTimersByTime(MS_ENTRE_AVANCES)
          await ctx.avanzar(i)
        }
      },
    })
    expect(hechos).toEqual([1, 2])
    expect(r.detenido).toBe(true)
    // La cancelación ya la pidió otro: esta pestaña no la vuelve a pedir.
    expect(api.cancelar).not.toHaveBeenCalled()
    expect(api.terminar).toHaveBeenCalledTimes(1)
  })

  it('si el trabajo lanza: FALLO con el mensaje, el error sube tal cual y Detener se suelta', async () => {
    const error = new Error('Se cortó la conexión en la dispersión 13 de 40.')
    await expect(
      correrEnElNavegador({
        tipo: 'APROBACION_MASIVA',
        titulo: 'Aprobar',
        recursos: ['dispersiones'],
        trabajo: async () => {
          throw error
        },
      }),
    ).rejects.toBe(error)
    expect(api.fallar).toHaveBeenCalledWith('n-1', 'Se cortó la conexión en la dispersión 13 de 40.')
    expect(api.terminar).not.toHaveBeenCalled()
    expect(invalidarMock).toHaveBeenCalledWith('dispersiones')
    expect(detenerEnElNavegador('n-1')).toBe(false)
  })

  it('sin el centro (503 sin la migración): el trabajo corre igual y el archivo se baja directo', async () => {
    api.crear.mockRejectedValue(Object.assign(new Error('El centro de procesos espera la migración'), { status: 503 }))
    const blob = new Blob(['x'])
    const r = await correrEnElNavegador({
      tipo: 'EXPORTACION',
      titulo: 'Directorio',
      recursos: ['propietarios'],
      trabajo: async (ctx) => {
        expect(ctx.procesoId).toBeNull()
        expect(await ctx.avanzar(1)).toBe(true)
        expect(ctx.debeParar()).toBe(false)
        return { archivo: { blob, nombre: 'directorio.xlsx' } }
      },
    })
    expect(r).toMatchObject({ procesoId: null, enElCentro: false, detenido: false })
    expect(descargarMock).toHaveBeenCalledWith(blob, 'directorio.xlsx')
    expect(api.avance).not.toHaveBeenCalled()
    expect(api.terminar).not.toHaveBeenCalled()
    expect(anunciarMock).not.toHaveBeenCalled()
    expect(invalidarMock).toHaveBeenCalledWith('propietarios')
  })

  it('si el centro no puede guardar el archivo, se baja directo y el centro dice por qué', async () => {
    api.terminar.mockRejectedValueOnce(new Error('413')).mockResolvedValueOnce(proceso('TERMINADO'))
    const blob = new Blob(['x'])
    await correrEnElNavegador({
      tipo: 'EXPORTACION',
      titulo: 'Directorio',
      trabajo: async () => ({ archivo: { blob, nombre: 'd.xlsx' }, mensaje: '120 filas' }),
    })
    expect(descargarMock).toHaveBeenCalledWith(blob, 'd.xlsx')
    expect(api.terminar).toHaveBeenLastCalledWith('n-1', {
      mensaje: '120 filas El archivo no se pudo guardar en el centro de procesos: se descargó en este navegador.',
    })
  })
})

describe('concurrencia', () => {
  it('nunca tiene más de n en vuelo y devuelve en el orden de entrada', async () => {
    vi.useRealTimers()
    let enVuelo = 0
    let maximo = 0
    const r = await concurrencia([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      enVuelo++
      maximo = Math.max(maximo, enVuelo)
      await new Promise((ok) => setTimeout(ok, 1))
      enVuelo--
      if (n === 5) throw new Error('la 5 falló')
      return n * 10
    })
    expect(maximo).toBe(3)
    expect(r.map((x) => (x.status === 'fulfilled' ? x.value : 'x'))).toEqual([10, 20, 30, 40, 'x', 60, 70])
  })
})
