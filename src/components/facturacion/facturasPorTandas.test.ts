/**
 * facturasPorTandas.test.ts — 3.824 facturas sin colgar un request.
 *
 * Auditoría 13-09, F2 y F3: un solo POST con todas las claves dejaba un
 * spinner sin número y, si el gateway cortaba, un «falló» sobre facturas que
 * sí habían salido. Lo que se protege: que se parta, que los números se sumen
 * sin inventar, que «Detener» corte al cerrar la tanda, y que un fallo a mitad
 * conserve lo que ya se emitió.
 */

import { describe, it, expect, vi } from 'vitest'

import type { ResultadoDeGeneracion } from '@/lib/api/facturacion-por-mes.service'
import {
  FACTURAS_POR_TANDA,
  generarPorTandas,
  quedaronPendientes,
  tandasDeFacturas,
} from './facturasPorTandas'

const claves = (n: number) => Array.from({ length: n }, (_, i) => `ct-${i}|2026-09|INQUILINO`)

/** El back emitiendo TODO lo que se le mandó, a $1.000 cada una. */
const todoSale = (mes: string, lote: string[]): Promise<ResultadoDeGeneracion> =>
  Promise.resolve({
    mes,
    emitidas: lote.length,
    yaEstaban: 0,
    sinNumero: 0,
    motivo: null,
    totalCop: lote.length * 1_000,
    facturas: [],
  })

describe('tandasDeFacturas', () => {
  it('3.824 facturas son 20 tandas de 200; nada, ninguna', () => {
    expect(FACTURAS_POR_TANDA).toBe(200)
    expect(tandasDeFacturas(3_824)).toBe(20)
    expect(tandasDeFacturas(200)).toBe(1)
    expect(tandasDeFacturas(0)).toBe(0)
  })
})

describe('generarPorTandas', () => {
  it('🔴 parte las claves: cada request lleva a lo sumo 200, del mismo mes, y ninguna se repite ni se pierde', async () => {
    const generar = vi.fn(todoSale)
    const todas = claves(3_824)

    const { informe, corte } = await generarPorTandas('2026-09', todas, generar)

    expect(generar).toHaveBeenCalledTimes(20)
    const enviadas = generar.mock.calls.flatMap(([mes, lote]) => {
      expect(mes).toBe('2026-09')
      expect(lote.length).toBeLessThanOrEqual(200)
      return lote
    })
    expect(enviadas).toEqual(todas)
    expect(corte).toBe('completa')
    expect(informe.emitidas).toBe(3_824)
    expect(informe.totalCop).toBe(3_824_000)
    expect(quedaronPendientes(informe)).toBe(false)
  })

  it('el progreso dice cuántas van del TOTAL y en qué tanda: «Emitiendo 400 de 3.824»', async () => {
    const progresos: { hechas: number; total: number; tanda: number; tandas: number }[] = []
    await generarPorTandas('2026-09', claves(450), todoSale, (p) => progresos.push(p))

    expect(progresos).toEqual([
      { hechas: 200, total: 450, tanda: 1, tandas: 3 },
      { hechas: 400, total: 450, tanda: 2, tandas: 3 },
      { hechas: 450, total: 450, tanda: 3, tandas: 3 },
    ])
  })

  it('suma lo que el back dice de cada tanda, «ya estaban» incluidas', async () => {
    const generar = vi
      .fn<(mes: string, lote: string[]) => Promise<ResultadoDeGeneracion>>()
      .mockResolvedValueOnce({ mes: '2026-09', emitidas: 150, yaEstaban: 50, sinNumero: 0, motivo: null, totalCop: 150_000, facturas: [] })
      .mockResolvedValueOnce({ mes: '2026-09', emitidas: 100, yaEstaban: 0, sinNumero: 0, motivo: null, totalCop: 100_000, facturas: [] })

    const { informe } = await generarPorTandas('2026-09', claves(300), generar)

    expect(informe).toMatchObject({ pedidas: 300, emitidas: 250, yaEstaban: 50, totalCop: 250_000 })
  })

  it('lo que el back no contó en ningún número se dice como «ya no estaban por emitir», sin inventar un motivo', async () => {
    const generar = vi.fn(async (mes: string, lote: string[]) => ({
      mes,
      emitidas: lote.length - 3,
      yaEstaban: 0,
      sinNumero: 0,
      motivo: null,
      totalCop: 0,
      facturas: [],
    }))

    const { informe, corte } = await generarPorTandas('2026-09', claves(200), generar)

    expect(corte).toBe('completa')
    expect(informe.yaNoEstabanPorEmitir).toBe(3)
    // No es algo que haya que reintentar: ya no estaban por emitir.
    expect(quedaronPendientes(informe)).toBe(false)
  })

  it('🔴 «Detener» corta al cerrar la tanda en curso y dice cuántas no salieron', async () => {
    const generar = vi.fn(todoSale)
    let parar = false

    const { informe, corte } = await generarPorTandas(
      '2026-09',
      claves(1_000),
      async (mes, lote) => {
        const r = await generar(mes, lote)
        parar = true // la persona toca «Detener» mientras viaja la primera
        return r
      },
      undefined,
      { debeParar: () => parar },
    )

    expect(generar).toHaveBeenCalledTimes(1)
    expect(corte).toBe('detenida')
    expect(informe.emitidas).toBe(200)
    expect(informe.sinEnviar).toBe(800)
    expect(quedaronPendientes(informe)).toBe(true)
  })

  it('«Detener» sobre la última tanda no inventa un corte: ya no quedaba nada', async () => {
    const { corte, informe } = await generarPorTandas('2026-09', claves(150), todoSale, undefined, {
      debeParar: () => true,
    })
    expect(corte).toBe('completa')
    expect(informe.sinEnviar).toBe(0)
  })

  it('🔴 una tanda que falla NO borra lo que ya salió: conserva el error y separa lo dudoso de lo no enviado', async () => {
    const caida = new Error('504 Gateway Timeout')
    const generar = vi
      .fn<(mes: string, lote: string[]) => Promise<ResultadoDeGeneracion>>()
      .mockImplementationOnce(todoSale)
      .mockRejectedValueOnce(caida)

    const resultado = await generarPorTandas('2026-09', claves(700), generar)

    expect(generar).toHaveBeenCalledTimes(2)
    expect(resultado.corte).toBe('fallo')
    expect(resultado.error).toBe(caida)
    expect(resultado.informe).toMatchObject({
      emitidas: 200,
      // La tanda que falló pudo quedar escrita en parte del lado del back.
      sinConfirmar: 200,
      sinEnviar: 300,
    })
    expect(quedaronPendientes(resultado.informe)).toBe(true)
  })

  it('el rango agotado corta la corrida y guarda el motivo del back UNA vez', async () => {
    const motivo = 'La resolución 999 agotó su rango (1–350) durante la emisión. Pide una nueva resolución a la DIAN.'
    const generar = vi
      .fn<(mes: string, lote: string[]) => Promise<ResultadoDeGeneracion>>()
      .mockImplementationOnce(todoSale)
      .mockResolvedValueOnce({ mes: '2026-09', emitidas: 150, yaEstaban: 0, sinNumero: 50, motivo, totalCop: 150_000, facturas: [] })

    const { informe, corte } = await generarPorTandas('2026-09', claves(1_000), generar)

    expect(generar).toHaveBeenCalledTimes(2)
    expect(corte).toBe('rangoAgotado')
    expect(informe).toMatchObject({ emitidas: 350, sinNumero: 50, sinEnviar: 600 })
    expect(informe.motivos).toEqual([motivo])
  })

  it('sin claves no llama al back', async () => {
    const generar = vi.fn(todoSale)
    const { corte, informe } = await generarPorTandas('2026-09', [], generar)
    expect(generar).not.toHaveBeenCalled()
    expect(corte).toBe('completa')
    expect(informe.pedidas).toBe(0)
  })
})

describe('🔴 las facturas de la corrida, para descargarlas (22-09)', () => {
  it('junta el id y el número de lo emitido en TODAS las tandas', async () => {
    const generar = (mes: string, lote: string[]): Promise<ResultadoDeGeneracion> =>
      Promise.resolve({
        mes,
        emitidas: lote.length,
        yaEstaban: 0,
        sinNumero: 0,
        motivo: null,
        totalCop: lote.length * 1_000,
        facturas: lote.map((clave, i) => ({
          clave,
          numero: i,
          numeroDian: `PRU-${clave.split('|')[0]}`,
          totalCop: 1_000,
          // Una sin id (un back viejo): no entra, no hay PDF que pedir.
          facturaId: clave === 'ct-1|2026-09|INQUILINO' ? null : `fac-${clave}`,
        })),
      })

    const { informe } = await generarPorTandas('2026-09', claves(3), generar, undefined, {
      tamano: 2,
    })

    expect(informe.documentos).toEqual([
      { facturaId: 'fac-ct-0|2026-09|INQUILINO', numero: 'PRU-ct-0' },
      { facturaId: 'fac-ct-2|2026-09|INQUILINO', numero: 'PRU-ct-2' },
    ])
  })
})

describe('generarPorTandas — los ZIP del centro de procesos (22-09)', () => {
  it('junta el proceso de cada tanda que está armando su ZIP; sin `zipEnElCentro` no cuenta', async () => {
    let n = 0
    const generar = (mes: string, lote: string[]): Promise<ResultadoDeGeneracion> => {
      n += 1
      return Promise.resolve({
        mes,
        emitidas: lote.length,
        yaEstaban: 0,
        sinNumero: 0,
        motivo: null,
        totalCop: 0,
        facturas: [],
        procesoId: `proc-${n}`,
        zipEnElCentro: n !== 2,
      })
    }
    const { informe } = await generarPorTandas('2026-09', claves(450), generar)
    expect(informe.procesosConZip).toEqual(['proc-1', 'proc-3'])
  })
})

describe('generarPorTandas — una emisión = UN proceso (23-09)', () => {
  it('🔴 las tandas le dicen al back a qué proceso suman; sólo la última cierra y lleva los ids de toda la corrida', async () => {
    const llamadas: unknown[] = []
    let n = 0
    const generar = (mes: string, lote: string[], corrida?: unknown): Promise<ResultadoDeGeneracion> => {
      n += 1
      llamadas.push(corrida)
      return Promise.resolve({
        mes,
        emitidas: lote.length,
        yaEstaban: 0,
        sinNumero: 0,
        motivo: null,
        totalCop: 0,
        facturas: [{ clave: `k${n}`, numero: n, numeroDian: `PRU-${n}`, totalCop: 1, facturaId: `f-${n}` }],
        procesoId: 'proc-corrida',
        zipEnElCentro: n === 3,
        corridaAgrupable: true,
      })
    }
    const { informe } = await generarPorTandas('2026-09', claves(450), generar)
    expect(llamadas).toEqual([
      { yaEnviadas: 0, totalDeLaCorrida: 450, ultimaTanda: false },
      { procesoId: 'proc-corrida', yaEnviadas: 200, totalDeLaCorrida: 450, ultimaTanda: false },
      {
        procesoId: 'proc-corrida',
        yaEnviadas: 400,
        totalDeLaCorrida: 450,
        ultimaTanda: true,
        idsDeLaCorrida: ['f-1', 'f-2'],
      },
    ])
    expect(informe.procesosConZip).toEqual(['proc-corrida'])
  })

  it('una sola tanda no manda nada de corrida (es su propio proceso)', async () => {
    const generar = vi.fn(todoSale)
    await generarPorTandas('2026-09', claves(50), generar)
    expect((generar.mock.calls[0] as unknown[])[2]).toBeUndefined()
  })
})
