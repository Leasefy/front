/**
 * El aviso «Se emitieron N facturas» y su descarga (22-09).
 *
 * Lo que se protege:
 *  1. Hasta 50, el ZIP baja directo, como antes.
 *  2. 🔴 Con más de 50 el botón YA NO se apaga: el ZIP lo arma el centro de
 *     procesos. Si la corrida fue de UNA tanda, se abre el proceso que ya lo
 *     está armando (no se pide otro); si fue de varias, se lanza uno con los
 *     ids de toda la corrida. 🔴 23-09: la pantalla NO espera el ZIP —ni
 *     spinner ni «100 de 450 PDF»—: si ya está, baja; si no, abre el centro
 *     en ese proceso, que es donde se ve el avance.
 *  3. Si el ZIP falla, se dice por qué.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Proceso } from '@/lib/api/procesos.types'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toastMock, facturacion, procesos, descargar, bajarBlob, abrir } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  facturacion: { zipDeFacturas: vi.fn(), zipEnSegundoPlano: vi.fn(), pdfDeLaFactura: vi.fn() },
  procesos: { ver: vi.fn() },
  descargar: vi.fn(async () => 'facturas.zip'),
  bajarBlob: vi.fn(),
  abrir: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/reportes/exportables', () => ({ descargarBlob: bajarBlob }))
vi.mock('@/lib/api/facturacion-por-mes.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/facturacion-por-mes.service')>()),
  facturacionPorMesService: facturacion,
}))
vi.mock('@/lib/api/procesos.service', () => ({
  anunciarProceso: vi.fn(),
  abrirCentroDeProcesos: abrir,
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

  it('🔴 23-09: más de 50 en VARIAS tandas lanza el ZIP y ABRE el centro en ese proceso; la pantalla no lo espera', async () => {
    facturacion.zipEnSegundoPlano.mockResolvedValue({ procesoId: 'proc-todo' })
    await montar(corrida(450, ['proc-1', 'proc-2', 'proc-3']))
    await descargarLasFacturas()
    expect(facturacion.zipEnSegundoPlano).toHaveBeenCalledWith(Array.from({ length: 450 }, (_, i) => `f-${i}`))
    expect(abrir).toHaveBeenCalledWith({ procesoId: 'proc-todo' })
    // Ni se pregunta por su avance ni se cuenta «100 de 450 PDF» acá.
    expect(procesos.ver).not.toHaveBeenCalled()
    expect(container.textContent).not.toMatch(/\d+ de \d+ PDF/)
    const boton = container.querySelector('[data-testid="facturacion-informe-descargar"]') as HTMLButtonElement
    expect(boton.disabled).toBe(false)
  })

  it('🔴 23-09: el ZIP de la tanda que todavía se arma abre el centro en ESE proceso, sin esperarlo', async () => {
    procesos.ver.mockResolvedValue(zipListo('proc-tanda', { estado: 'CORRIENDO', hechos: 10, total: 60, archivo: null }))
    await montar(corrida(60, ['proc-tanda']))
    await descargarLasFacturas()
    expect(procesos.ver).toHaveBeenCalledTimes(1)
    expect(abrir).toHaveBeenCalledWith({ procesoId: 'proc-tanda' })
    expect(descargar).not.toHaveBeenCalled()
  })
})
