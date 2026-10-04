/**
 * La liquidación en Excel y PDF: sale del detalle que guardó el back, con lo
 * descontado TAL COMO VINO (nada se recalcula) y la frecuencia «por definir».
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const libro = { hojas: [] as string[] }
const pdf = { textos: [] as string[], guardado: '' }
vi.mock('jspdf', () => ({
  default: class {
    internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } }
    setFontSize() {}
    text(t: string | string[]) {
      pdf.textos.push(...(Array.isArray(t) ? t : [t]))
    }
    splitTextToSize(t: string) {
      return [t]
    }
    addPage() {}
    save(nombre: string) {
      pdf.guardado = nombre
    }
  },
}))
vi.mock('xlsx', () => ({
  utils: {
    book_new: () => ({}),
    aoa_to_sheet: (filas: unknown[][]) => ({ filas }),
    book_append_sheet: (_l: unknown, _h: unknown, nombre: string) => {
      libro.hojas.push(nombre)
    },
  },
  writeFile: vi.fn(),
}))

import * as XLSX from 'xlsx'
import type { DetalleDeLaLiquidacion } from './recaudo-en-linea'
import {
  exportarLiquidacionAExcel,
  exportarLiquidacionAPdf,
  nombreDelArchivoDeLaLiquidacion,
  pesos,
  seccionesDeLaLiquidacion,
} from './documento-de-la-liquidacion'

const detalle = (extra: Partial<DetalleDeLaLiquidacion> = {}): DetalleDeLaLiquidacion => ({
  id: 'L1',
  numero: 'LQ261015-0A1B2C-9F3A01',
  referenciaDelGiro: 'LEASEFY LQ261015-0A1B2C-9F3A01',
  agencyId: 'a',
  inmobiliaria: 'Bienes Raíces del Valle',
  nit: null,
  fechaDelGiro: '2026-10-16',
  desembolsoId: null,
  creadaPor: 'equipo@leasefy.co',
  createdAt: null,
  cantidadDePagos: 2,
  brutoCop: 2_100_000,
  comisionCop: 50_000,
  ivaCop: 9_500,
  retencionesCop: 0,
  otrosDescuentosCop: 12_000,
  descuentos: [
    { concepto: 'Comisión de Wompi', valorCop: 50_000, fuente: 'reporte-de-wompi' },
    { concepto: 'IVA de la comisión de Wompi', valorCop: 9_500, fuente: 'reporte-de-wompi' },
    { concepto: 'Servicio de recaudo', valorCop: 12_000, fuente: 'leasefy' },
  ],
  netoCop: 2_028_500,
  estado: 'girada',
  giradaAt: '2026-10-16T15:00:00.000Z',
  giradaEl: '2026-10-16',
  giradaPor: 'equipo@leasefy.co',
  referenciaBancariaDelGiro: 'TRF-9',
  movimientoId: null,
  conciliadaAt: null,
  conciliadaPor: null,
  giroDisponible: true,
  pagos: [
    { transaccionId: 'tx-1', referencia: 'rent-1', fecha: '2026-10-02', medio: 'PSE', desembolsoId: 'D-1', reciboId: null, reciboNumero: 'RC-1', brutoCop: 1_200_000, comisionCop: 30_000, ivaCop: 5_700, retencionesCop: 0, netoCop: 1_164_300 },
    { transaccionId: 'tx-3', referencia: 'rent-3', fecha: '2026-10-03', medio: 'PSE', desembolsoId: 'D-1', reciboId: null, reciboNumero: null, brutoCop: 900_000, comisionCop: 20_000, ivaCop: 3_800, retencionesCop: 0, netoCop: 876_200 },
  ],
  ...extra,
})

beforeEach(() => {
  libro.hojas = []
})

describe('seccionesDeLaLiquidacion', () => {
  it('el resumen dice la inmobiliaria, el estado y la frecuencia «por definir»; un NIT que falta no se inventa', () => {
    const [resumen] = seccionesDeLaLiquidacion(detalle())
    const como = Object.fromEntries(resumen.filas.map(([k, v]) => [k, v]))
    expect(como).toMatchObject({
      Inmobiliaria: 'Bienes Raíces del Valle',
      NIT: 'Sin registrar',
      Liquidación: 'LQ261015-0A1B2C-9F3A01',
      Estado: 'Girada el 2026-10-16 · comprobante TRF-9',
      'Frecuencia del giro': 'Por definir',
    })
  })

  it('🔴 bruto, cada descuento con su fuente (negativo) y el neto: tal como vienen, sin recalcular', () => {
    const [, cuentas] = seccionesDeLaLiquidacion(detalle())
    expect(cuentas.filas.slice(0, 6)).toEqual([
      ['Concepto', 'Fuente', 'Valor'],
      ['Recaudado (bruto)', '', 2_100_000],
      ['Comisión de Wompi', 'Reporte de Wompi', -50_000],
      ['IVA de la comisión de Wompi', 'Reporte de Wompi', -9_500],
      ['Servicio de recaudo', 'Leasefy', -12_000],
      ['Neto que se gira', '', 2_028_500],
    ])
    expect(String(cuentas.filas.at(-1)![0])).toContain('no se calcula ninguna tarifa')
  })

  it('los pagos con su recibo y la fila de totales', () => {
    const [, , pagos] = seccionesDeLaLiquidacion(detalle())
    expect(pagos.filas[1]).toEqual(['2026-10-02', 'tx-1', 'rent-1', 'PSE', 'RC-1', 1_200_000, 30_000, 5_700, 0, 1_164_300])
    expect(pagos.filas.at(-1)).toEqual(['Total', '', '', '', '', 2_100_000, 50_000, 9_500, 0, 2_040_500])
  })

  it('una conciliada dice cuándo y quién la concilió', () => {
    const [resumen] = seccionesDeLaLiquidacion(
      detalle({ estado: 'conciliada', conciliadaAt: '2026-10-18T13:00:00.000Z', conciliadaPor: 'piloto' }),
    )
    expect(resumen.filas.find(([k]) => k === 'Estado')![1]).toBe(
      'Conciliada en el banco de la inmobiliaria el 2026-10-18 (el Piloto)',
    )
  })
})

describe('archivos', () => {
  it('el nombre lleva el número y la inmobiliaria sin tildes', () => {
    expect(nombreDelArchivoDeLaLiquidacion(detalle(), 'xlsx')).toBe(
      'liquidacion-LQ261015-0A1B2C-9F3A01-bienes-raices-del-valle.xlsx',
    )
  })

  it('el Excel tiene una hoja por sección y se guarda con ese nombre', async () => {
    await exportarLiquidacionAExcel(detalle())
    expect(libro.hojas).toEqual(['Resumen', 'Bruto, descuentos y neto', 'Pagos incluidos'])
    expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledWith(
      expect.anything(),
      'liquidacion-LQ261015-0A1B2C-9F3A01-bienes-raices-del-valle.xlsx',
    )
  })

  it('el PDF lleva las cifras en pesos, la frecuencia por definir y se guarda con su nombre', async () => {
    pdf.textos = []
    await exportarLiquidacionAPdf(detalle())
    expect(pdf.guardado).toBe('liquidacion-LQ261015-0A1B2C-9F3A01-bienes-raices-del-valle.pdf')
    expect(pdf.textos).toEqual(expect.arrayContaining(['$ 2.028.500', '-$ 12.000', '$ 1.164.300', 'Por definir']))
    // 🔴 El «−» tipográfico no existe en la letra del PDF: nunca llega allá.
    expect(pdf.textos.some((t) => t.includes('−'))).toBe(false)
    // 🔴 Ni el espacio duro: jsPDF lo mide de más y corre las cifras alineadas a la derecha.
    expect(pdf.textos.some((t) => t.includes('\u00a0'))).toBe(false)
    expect(pdf.textos.some((t) => t.includes('frecuencia del giro: por definir'))).toBe(true)
  })

  it('pesos: con puntos de miles y el menos tipográfico', () => {
    expect(pesos(2_028_500)).toBe('$\u00a02.028.500')
    expect(pesos(-12_000)).toBe('−$\u00a012.000')
    expect(pesos(null)).toBe('—')
  })
})
