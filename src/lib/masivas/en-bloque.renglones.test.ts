/**
 * Lo masivo del navegador deja su lista para «Ver detalle» del centro de
 * procesos (Nico, 20-10-2026): lo que salió y lo que no, con la frase del
 * back y el cajón de cada cosa.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ResultadoDelTrabajo } from '@/lib/procesos/en-el-centro'

const cierres: ResultadoDelTrabajo[] = []
vi.mock('@/lib/procesos/en-el-centro', () => ({
  concurrencia: async <T,>(items: readonly T[], _n: number, tarea: (t: T) => Promise<void>) => {
    for (const i of items) await tarea(i)
  },
  lanzarEnElCentro: vi.fn(),
  correrEnElNavegador: async ({ trabajo }: { trabajo: (ctx: unknown) => Promise<ResultadoDelTrabajo> }) => {
    const resultado = await trabajo({ procesoId: 'p', avanzar: async () => true, debeParar: () => false })
    cierres.push(resultado)
    return { procesoId: 'p', enElCentro: true, detenido: false, resultado }
  },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { hacerEnBloque } from './en-bloque'

beforeEach(() => {
  cierres.length = 0
})

describe('hacerEnBloque — la lista de «Ver detalle»', () => {
  it('cada fila con su estado, la frase del back y el cajón de su cosa', async () => {
    await hacerEnBloque({
      titulo: 'Anular 2 cobros',
      filas: [
        { id: 'c-1', nombre: 'Ana Ruiz', mes: 'Octubre' },
        { id: 'c-2', nombre: 'Luis Gómez', mes: 'Octubre' },
      ],
      tarea: async (f) => {
        if (f.id === 'c-2') throw new Error('El cobro ya tiene pagos.')
      },
      accion: 'anular el cobro',
      recurso: 'COBRO',
      detalleDe: (f) => f.mes,
    })
    expect(cierres[0].renglones).toEqual([
      { estado: 'OK', titulo: 'Ana Ruiz', detalle: 'Octubre', recurso: { tipo: 'COBRO', id: 'c-1' } },
      {
        estado: 'FALLO',
        titulo: 'Luis Gómez',
        detalle: 'Octubre',
        motivo: expect.stringContaining('El cobro ya tiene pagos'),
        recurso: { tipo: 'COBRO', id: 'c-2' },
      },
    ])
  })

  it('sin decir qué es cada fila, no deja lista (lo de antes, igual)', async () => {
    await hacerEnBloque({
      titulo: 'Mover 1 arreglo',
      filas: [{ id: 'm-1', nombre: 'Gotera' }],
      tarea: async () => undefined,
      accion: 'mover el arreglo',
    })
    expect(cierres[0].renglones).toBeUndefined()
  })
})
