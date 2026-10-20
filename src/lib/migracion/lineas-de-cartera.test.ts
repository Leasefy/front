import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'

import { mapearColumnasDeCartera } from './columnas-de-cartera'
import { ENCABEZADOS_DEL_INFORME_DE_CARTERA } from './cartera-por-factura.fixture'
import {
  date1904DelLibro,
  esLibroConSeriales,
  fechaDeCartera,
  leerLineasDeCartera,
  MAX_LINEAS_DE_CARTERA,
} from './lineas-de-cartera'

const MAPEO = mapearColumnasDeCartera([...ENCABEZADOS_DEL_INFORME_DE_CARTERA])
const OPC = { esXlsx: false, date1904: false }

/** Una fila con los valores inventados que hagan falta; el resto de columnas, vacías. */
const fila = (v: Record<string, unknown>, rowIndex = 1): Record<string, unknown> => ({
  _rowIndex: rowIndex,
  ...Object.fromEntries(ENCABEZADOS_DEL_INFORME_DE_CARTERA.map((h) => [h, ''])),
  ...v,
})

const BUENA = {
  'Fecha de Vencimiento': '2026-01-05',
  'Fecha de Factura': '2025-12-28',
  'Documento Inquilino': '900.111.222',
  'Nombre Inquilino': 'Inquilino Uno',
  'Documento Propietario': '555',
  'Nombre Propietario': 'Dueño Uno',
  Concepto: 'Canon',
  'Valor Total': '2.000.000',
  'Saldo Pendiente': '1.500.000,50',
}

describe('fechaDeCartera (T-0168)', () => {
  it('lee ISO, con hora, y dd/mm/aaaa con el día primero', () => {
    expect(fechaDeCartera('2026-01-05', OPC)).toBe('2026-01-05')
    expect(fechaDeCartera('2026-01-05 00:00:00', OPC)).toBe('2026-01-05')
    expect(fechaDeCartera('05/01/2026', OPC)).toBe('2026-01-05')
    expect(fechaDeCartera(new Date(Date.UTC(2026, 0, 5)), OPC)).toBe('2026-01-05')
  })

  it('una fecha que no existe, un año de dos dígitos o texto libre no se leen', () => {
    expect(fechaDeCartera('2026-02-31', OPC)).toBeUndefined()
    expect(fechaDeCartera('5/1/26', OPC)).toBeUndefined()
    expect(fechaDeCartera('enero 5', OPC)).toBeUndefined()
    expect(fechaDeCartera('', OPC)).toBeUndefined()
  })

  it('un número es un serial de Excel SÓLO en un xlsx', () => {
    expect(fechaDeCartera('46027', { esXlsx: true, date1904: false })).toBe('2026-01-05')
    expect(fechaDeCartera(46027, { esXlsx: true, date1904: false })).toBe('2026-01-05')
    expect(fechaDeCartera('46027', OPC)).toBeUndefined()
  })

  it('el serial respeta el sistema de fechas del libro (1904 corre 1462 días)', () => {
    expect(fechaDeCartera('46027', { esXlsx: true, date1904: true })).toBe('2030-01-06')
    expect(fechaDeCartera('44565', { esXlsx: true, date1904: true })).toBe('2026-01-05')
  })

  it('un serial fuera de lo posible no se lee', () => {
    expect(fechaDeCartera('0', { esXlsx: true, date1904: false })).toBeUndefined()
    expect(fechaDeCartera('60', { esXlsx: true, date1904: false })).toBeUndefined()
    expect(fechaDeCartera('99999999', { esXlsx: true, date1904: false })).toBeUndefined()
  })

  it('un entero chico (días de mora) no es una fecha de 1900', () => {
    const xlsx = { esXlsx: true, date1904: false }
    expect(fechaDeCartera('45', xlsx)).toBeUndefined()
    expect(fechaDeCartera(120, xlsx)).toBeUndefined()
    expect(fechaDeCartera('32873', xlsx)).toBeUndefined() // 1989-12-31
    expect(fechaDeCartera('32874', xlsx)).toBe('1990-01-01')
  })

  it('un texto con año anterior a 1990 tampoco se lee', () => {
    expect(fechaDeCartera('1900-01-05', OPC)).toBeUndefined()
    expect(fechaDeCartera('05/01/1985', OPC)).toBeUndefined()
  })
})

describe('esLibroConSeriales / date1904DelLibro', () => {
  it('sólo los libros de Excel', () => {
    expect(esLibroConSeriales('informe.xlsx')).toBe(true)
    expect(esLibroConSeriales('informe.XLS')).toBe(true)
    expect(esLibroConSeriales('informe.csv')).toBe(false)
    expect(esLibroConSeriales('informe.ods')).toBe(false)
  })

  it('lee la bandera date1904 del libro', async () => {
    const libro = (date1904: boolean) => {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a'], [1]]), 'Hoja1')
      wb.Workbook = { WBProps: { date1904 } }
      const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      return new File([bytes], 'libro.xlsx')
    }
    expect(await date1904DelLibro(libro(true))).toBe(true)
    expect(await date1904DelLibro(libro(false))).toBe(false)
    expect(await date1904DelLibro(new File(['a,b\n1,2'], 'x.csv'))).toBe(false)
  })
})

describe('leerLineasDeCartera (T-0168)', () => {
  it('arma la línea con el INQUILINO y el saldo pendiente, nunca el propietario ni el total', () => {
    const r = leerLineasDeCartera([fila(BUENA, 7)], MAPEO, OPC)
    expect(r.problemas).toEqual([])
    expect(r.lineas).toEqual([
      {
        fila: 8,
        fecha: '2026-01-05',
        documento: '900.111.222',
        nombre: 'Inquilino Uno',
        concepto: 'Canon',
        valorCop: 1_500_000.5,
      },
    ])
  })

  it('varias filas del mismo inquilino son varias líneas', () => {
    const r = leerLineasDeCartera([fila(BUENA, 1), fila({ ...BUENA, Concepto: 'Administración', 'Saldo Pendiente': '80000' }, 2)], MAPEO, OPC)
    expect(r.lineas.map((l) => [l.concepto, l.valorCop])).toEqual([
      ['Canon', 1_500_000.5],
      ['Administración', 80_000],
    ])
  })

  it('el nombre en blanco va como null y los negativos y ceros se mandan (el back decide)', () => {
    const r = leerLineasDeCartera(
      [fila({ ...BUENA, 'Nombre Inquilino': '  ', 'Saldo Pendiente': '-250.000' }), fila({ ...BUENA, 'Saldo Pendiente': '0' }, 2)],
      MAPEO,
      OPC,
    )
    expect(r.lineas.map((l) => [l.nombre, l.valorCop])).toEqual([
      [null, -250_000],
      ['Inquilino Uno', 0],
    ])
  })

  it('sin vencimiento legible usa la fecha de la factura y cuenta cuántas lo hicieron', () => {
    const r = leerLineasDeCartera(
      [fila(BUENA, 1), fila({ ...BUENA, 'Fecha de Vencimiento': '' }, 2), fila({ ...BUENA, 'Fecha de Vencimiento': 'pronto' }, 3)],
      MAPEO,
      OPC,
    )
    expect(r.lineas.map((l) => l.fecha)).toEqual(['2026-01-05', '2025-12-28', '2025-12-28'])
    expect(r.conFechaDeFactura).toBe(2)
  })

  it('las filas que no se pueden mandar quedan como problema local, con su número, y no viajan', () => {
    const r = leerLineasDeCartera(
      [
        fila({ ...BUENA, 'Fecha de Vencimiento': 'x', 'Fecha de Factura': 'y' }, 1),
        fila({ ...BUENA, 'Saldo Pendiente': 'mucho' }, 2),
        fila({ ...BUENA, 'Documento Inquilino': '' }, 3),
        fila({ ...BUENA, Concepto: ' ' }, 4),
        fila({ ...BUENA, 'Saldo Pendiente': '12,345.6789' }, 5),
        fila({ ...BUENA, 'Saldo Pendiente': '5000000000000' }, 6),
        fila({ ...BUENA, 'Documento Inquilino': '1'.repeat(41) }, 7),
        fila({ 'Nro. Factura': 'TOTAL', 'Saldo Pendiente': '9' }, 8),
        fila({}, 9),
        fila(BUENA, 10),
      ],
      MAPEO,
      OPC,
    )
    expect(r.lineas).toHaveLength(1)
    expect(r.problemas.map((p) => p.fila)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(r.problemas.every((p) => p.motivo.length > 0)).toBe(true)
  })

  it('recorta el nombre y el concepto al tope del back (200) en vez de tumbar la carga', () => {
    const r = leerLineasDeCartera([fila({ ...BUENA, Concepto: 'c'.repeat(300), 'Nombre Inquilino': 'n'.repeat(300) })], MAPEO, OPC)
    expect(r.lineas[0].concepto).toHaveLength(200)
    expect(r.lineas[0].nombre).toHaveLength(200)
  })

  it('un mes primero en la columna de fechas se lee mes/día/año y se dice', () => {
    const r = leerLineasDeCartera(
      [fila({ ...BUENA, 'Fecha de Vencimiento': '01/15/2026' }, 1), fila({ ...BUENA, 'Fecha de Vencimiento': '02/03/2026' }, 2)],
      MAPEO,
      OPC,
    )
    expect(r.lineas.map((l) => l.fecha)).toEqual(['2026-01-15', '2026-02-03'])
    expect(r.fraseDeFechas).toContain('mes primero')
  })

  it('más de 20.000 líneas mandables: se rechaza, nunca se parte', () => {
    const muchas = Array.from({ length: MAX_LINEAS_DE_CARTERA + 1 }, (_, i) => fila(BUENA, i + 1))
    const r = leerLineasDeCartera(muchas, MAPEO, OPC)
    expect(r.demasiadas).toBe(true)
    expect(r.mandables).toBe(MAX_LINEAS_DE_CARTERA + 1)
    expect(r.lineas).toEqual([])
  })

  it('con el serial de un xlsx en la columna de fechas', () => {
    const r = leerLineasDeCartera([fila({ ...BUENA, 'Fecha de Vencimiento': '46027' })], MAPEO, { esXlsx: true, date1904: false })
    expect(r.lineas[0].fecha).toBe('2026-01-05')
    const csv = leerLineasDeCartera([fila({ ...BUENA, 'Fecha de Vencimiento': '46027', 'Fecha de Factura': '' })], MAPEO, OPC)
    expect(csv.lineas).toEqual([])
    expect(csv.problemas).toHaveLength(1)
  })
})
