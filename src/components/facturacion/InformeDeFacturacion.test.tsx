/**
 * El aviso «Se emitieron N facturas» y su descarga (22-09).
 *
 * Lo que se protege:
 *  1. Hasta 50, el ZIP baja directo, como antes.
 *  2. 🔴 Con más de 50 el botón YA NO se apaga: el ZIP lo arma el centro de
 *     procesos. Si la corrida fue de UNA tanda, se abre el proceso que ya lo
 *     está armando (no se pide otro); si fue de varias, se lanza uno con los
 *     ids de toda la corrida. Cuando termina, se baja desde el centro.
 *  3. Si el ZIP falla, se dice por qué.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Proceso } from '@/lib/api/procesos.types'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toastMock, facturacion, procesos, descargar, bajarBlob } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  facturacion: { zipDeFacturas: vi.fn(), zipEnSegundoPlano: vi.fn(), pdfDeLaFactura: vi.fn() },
  procesos: { ver: vi.fn() },
  descargar: vi.fn(async () => 'facturas.zip'),
  bajarBlob: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/reportes/exportables', () => ({ descargarBlob: bajarBlob }))
vi.mock('@/lib/api/facturacion-por-mes.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/facturacion-por-mes.service')>()),
  facturacionPorMesService: facturacion,
}))
vi.mock('@/lib/api/procesos.service', () => ({
  anunciarProceso: vi.fn(),
  RECURSO_DE_PROCESOS: 'procesos',
  procesosApi: procesos,
}))
vi.mock('@/components/procesos/descargar-archivo-del-proceso', () => ({
  descargarArchivoDelProceso: descargar,
}))

import { InformeDeFacturacion } from './InformeDeFacturacion'
import type { ResultadoDeLaCorrida } from './facturasPorTandas'

function corrida(cuantas: number, procesosConZip: string[] = []): ResultadoDeLaCorrida {
  return {
    corte: 'completa',
    error: null,
    informe: {
      mes: '2026-09',
      pedidas: cuantas,
      emitidas: cuantas,
      yaEstaban: 0,
      sinNumero: 0,
      yaNoEstabanPorEmitir: 0,
      sinConfirmar: 0,
      sinEnviar: 0,
      totalCop: cuantas * 1000,
      motivos: [],
      documentos: Array.from({ length: cuantas }, (_, i) => ({ facturaId: `f-${i}`, numero: `PRU-${i}` })),
      procesosConZip,
    },
  }
}

function zipListo(id: string, extra: Partial<Proceso> = {}): Proceso {
  return {
    id,
    tipo: 'EMISION_DE_FACTURAS',
    titulo: 'Emitir las facturas de Septiembre de 2026',
    estado: 'TERMINADO',
    hechos: 120,
    total: 120,
    porcentaje: 100,
    mensaje: '120 facturas emitidas.',
    lanzadoPor: null,
    esMio: true,
    recurso: null,
    archivo: { nombre: 'facturas-2026-09-120.zip', tipo: 'application/zip', bytes: 1, venceAt: null, vencido: false },
    sePuedeCancelar: false,
    cancelacionPedida: false,
    interrumpido: false,
    createdAt: '2026-09-22T20:00:00.000Z',
    iniciadoAt: null,
    terminadoAt: null,
    actualizadoAt: '2026-09-22T20:00:00.000Z',
    ...extra,
  }
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function montar(c: ResultadoDeLaCorrida) {
  await act(async () => {
    root.render(<InformeDeFacturacion corrida={c} onCerrar={() => {}} />)
  })
}
async function descargarLasFacturas() {
  const boton = container.querySelector('[data-testid="facturacion-informe-descargar"]') as HTMLButtonElement
  expect(boton.disabled).toBe(false)
  await act(async () => {
    boton.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<InformeDeFacturacion> — la descarga del lote', () => {
  it('hasta 50: el ZIP baja directo, sin el centro', async () => {
    facturacion.zipDeFacturas.mockResolvedValue(new Blob(['PK']))
    await montar(corrida(40))
    expect(container.querySelector('[data-testid="facturacion-informe-por-el-centro"]')).toBeNull()
    await descargarLasFacturas()
    expect(facturacion.zipDeFacturas).toHaveBeenCalledTimes(1)
    expect(facturacion.zipEnSegundoPlano).not.toHaveBeenCalled()
    expect(bajarBlob).toHaveBeenCalled()
  })

  it('🔴 más de 50 en UNA tanda: el botón no se apaga, abre el proceso que ya arma el ZIP y lo baja del centro', async () => {
    procesos.ver.mockResolvedValue(zipListo('proc-tanda'))
    await montar(corrida(120, ['proc-tanda']))
    expect(container.querySelector('[data-testid="facturacion-informe-por-el-centro"]')?.textContent).toContain(
      'el ZIP se arma en el centro de procesos',
    )
    await descargarLasFacturas()
    expect(facturacion.zipEnSegundoPlano).not.toHaveBeenCalled()
    expect(facturacion.zipDeFacturas).not.toHaveBeenCalled()
    expect(procesos.ver).toHaveBeenCalledWith('proc-tanda')
    expect(descargar).toHaveBeenCalledWith('proc-tanda')
  })

  it('más de 50 en VARIAS tandas: lanza un ZIP con los ids de toda la corrida y lo baja cuando está', async () => {
    facturacion.zipEnSegundoPlano.mockResolvedValue({ procesoId: 'proc-todo' })
    procesos.ver
      .mockResolvedValueOnce(zipListo('proc-todo', { estado: 'CORRIENDO', hechos: 100, total: 450, archivo: null }))
      .mockResolvedValue(zipListo('proc-todo'))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await montar(corrida(450, ['proc-1', 'proc-2', 'proc-3']))
      await descargarLasFacturas()
      expect(facturacion.zipEnSegundoPlano).toHaveBeenCalledWith(Array.from({ length: 450 }, (_, i) => `f-${i}`))
      expect(container.querySelector('[data-testid="facturacion-informe-por-el-centro"]')?.textContent).toContain(
        '100 de 450 PDF',
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_100)
      })
    } finally {
      vi.useRealTimers()
    }
    expect(descargar).toHaveBeenCalledWith('proc-todo')
  })

  it('si el ZIP falla en el centro, se dice por qué', async () => {
    procesos.ver.mockResolvedValue(
      zipListo('proc-tanda', { estado: 'FALLO', archivo: null, mensaje: 'Pero el ZIP con los PDF no se pudo armar.' }),
    )
    await montar(corrida(60, ['proc-tanda']))
    await descargarLasFacturas()
    expect(toastMock.error).toHaveBeenCalledWith('Pero el ZIP con los PDF no se pudo armar.')
    expect(descargar).not.toHaveBeenCalled()
  })
})
