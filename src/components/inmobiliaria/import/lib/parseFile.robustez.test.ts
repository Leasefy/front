/**
 * Batería adversarial del parser base de la migración.
 *
 * Todo lo que sube una inmobiliaria (terceros, inmuebles, contratos,
 * asientos) entra por `parseSpreadsheetFile`. Estos tests fijan las
 * GARANTÍAS del parser con archivos reales generados acá mismo — no con
 * mocks — porque el bug clásico de esta capa es silencioso: una fecha
 * ambigua o un encabezado sucio que viaja hasta la base sin un error.
 *
 * Complementa a `parseFile.test.ts` (codificación, separadores, binarios
 * básicos). Acá van los casos duros: fechas REALES de Excel, fórmulas,
 * booleanos, encabezados sucios o repetidos, celdas enormes, varias hojas,
 * celdas combinadas y la regresión contra los archivos de muestra del repo.
 */
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseSpreadsheetFile } from './parseFile'

function archivo(nombre: string, contenido: Uint8Array | string): File {
  const bytes =
    typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido
  return new File([bytes.slice().buffer as ArrayBuffer], nombre)
}

/** Un .xlsx real a partir de una hoja ya armada. */
function xlsxDeHoja(ws: XLSX.WorkSheet, nombreHoja = 'Hoja1'): File {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return archivo('a.xlsx', new Uint8Array(bytes))
}

// ══ Fechas reales de Excel — la celda es fecha, no texto ═══════════════════

describe('fechas de Excel: una celda-fecha sale SIEMPRE como ISO, nunca ambigua', () => {
  it('celda-fecha con el formato por defecto de Excel (m/d/yy) sale como 2026-06-01', async () => {
    // El caso que rompe migraciones: SheetJS con raw:false devuelve el texto
    // formateado («6/1/26»), y 6/1 es ambiguo — ¿1 de junio o 6 de enero?
    const ws = XLSX.utils.aoa_to_sheet([['Fecha de inicio'], []])
    ws['A2'] = { t: 'n', v: 46174, z: 'm/d/yy' } // 2026-06-01 en serial de Excel
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(r.rows[0]['Fecha de inicio']).toBe('2026-06-01')
  })

  it('celda-fecha con formato dd/mm/yyyy también sale como ISO', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Fecha'], []])
    ws['A2'] = { t: 'n', v: 46174, z: 'dd/mm/yyyy' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(r.rows[0]['Fecha']).toBe('2026-06-01')
  })

  it('una fecha escrita como TEXTO se respeta tal cual — el parser no inventa', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Fecha'], ['2026-06-01']])
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(r.rows[0]['Fecha']).toBe('2026-06-01')
  })

  it('la celda-fecha generada por la lib (cellDates) también sale ISO', async () => {
    const ws = XLSX.utils.aoa_to_sheet(
      [['Fecha'], [new Date(2026, 5, 1)]], // medianoche LOCAL: así crean fechas las apps reales
      { cellDates: true } as XLSX.AOA2SheetOpts,
    )
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(r.rows[0]['Fecha']).toBe('2026-06-01')
  })

  it('un número SIN formato de fecha NO se convierte: 46174 sigue siendo 46174', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Canon'], [46174]])
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(r.rows[0]['Canon']).toBe('46174')
  })
})

// ══ Números, fórmulas y booleanos ══════════════════════════════════════════

describe('números: el texto visible se preserva y el valor no se corrompe', () => {
  it('un número con formato de miles no pierde su valor', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Canon'], []])
    ws['A2'] = { t: 'n', v: 2500000, z: '#,##0' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    // Da igual si sale «2,500,000» o «2500000»: los dígitos tienen que estar.
    expect(String(r.rows[0]['Canon']).replace(/[^\d]/g, '')).toBe('2500000')
  })

  it('un número grande no sale en notación científica', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Cuenta'], [3101234567]])
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(String(r.rows[0]['Cuenta'])).not.toMatch(/e\+/i)
    expect(String(r.rows[0]['Cuenta']).replace(/[^\d]/g, '')).toBe('3101234567')
  })

  it('una fórmula entrega su RESULTADO, no la fórmula', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Total'], []])
    ws['A2'] = { t: 'n', v: 300, f: 'SUM(100,200)' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(String(r.rows[0]['Total'])).toBe('300')
  })

  it('un booleano sale como texto estable', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Activo'], [true]])
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(String(r.rows[0]['Activo'])).toMatch(/^(TRUE|true|VERDADERO)$/)
  })
})

// ══ Encabezados sucios ═════════════════════════════════════════════════════

describe('encabezados: espacios, saltos de línea y repetidos no rompen nada', () => {
  it('espacios alrededor del encabezado no crean una columna distinta', async () => {
    const r = await parseSpreadsheetFile(archivo('a.csv', '  Nombre  ,Documento\nAna,1\n'))
    // La garantía: el dato es alcanzable por el encabezado LIMPIO.
    expect(r.headers).toContain('Nombre')
    expect(r.rows[0]['Nombre']).toBe('Ana')
  })

  it('un salto de línea ADENTRO del encabezado (celda multilínea de Excel) se aplana', async () => {
    const r = await parseSpreadsheetFile(
      archivo('a.csv', '"Nombre del\npropietario",Documento\nAna,1\n'),
    )
    expect(r.headers).toContain('Nombre del propietario')
    expect(r.rows[0]['Nombre del propietario']).toBe('Ana')
  })

  it('encabezados repetidos no se pisan: el segundo queda distinguible', async () => {
    const r = await parseSpreadsheetFile(archivo('a.csv', 'Nombre,Nombre\nAna,Luis\n'))
    expect(r.headers).toHaveLength(2)
    expect(new Set(r.headers).size).toBe(2)
    const valores = r.headers.map((h) => r.rows[0][h])
    expect(valores).toEqual(['Ana', 'Luis'])
  })

  it('comillas escapadas y separador adentro del campo', async () => {
    const r = await parseSpreadsheetFile(
      archivo('a.csv', 'Nombre,Nota\n"Compañía ""El Prado""","tiene, comas; y punto y coma"\n'),
    )
    expect(r.rows[0]['Nombre']).toBe('Compañía "El Prado"')
    expect(r.rows[0]['Nota']).toBe('tiene, comas; y punto y coma')
  })

  it('CRLF de Windows no deja un \\r pegado al último campo', async () => {
    const r = await parseSpreadsheetFile(archivo('a.csv', 'Nombre,Ciudad\r\nAna,Bogotá\r\n'))
    expect(r.rows[0]['Ciudad']).toBe('Bogotá')
  })
})

// ══ Formas raras del archivo ═══════════════════════════════════════════════

describe('formas raras: vacíos, hojas múltiples, celdas enormes', () => {
  it('archivo de sólo encabezados: 0 filas, encabezados presentes', async () => {
    const r = await parseSpreadsheetFile(archivo('a.csv', 'Nombre,Documento\n'))
    expect(r.rows).toHaveLength(0)
    expect(r.headers).toEqual(['Nombre', 'Documento'])
  })

  it('archivo vacío: 0 filas y 0 encabezados, sin explotar', async () => {
    const r = await parseSpreadsheetFile(archivo('a.csv', ''))
    expect(r.rows).toHaveLength(0)
    expect(r.headers).toHaveLength(0)
  })

  it('filas vacías al medio y al final se descartan y las demás conservan su orden', async () => {
    const r = await parseSpreadsheetFile(
      archivo('a.csv', 'Nombre\nAna\n\nLuis\n,\n\n'),
    )
    expect(r.rows.map((x) => x['Nombre'])).toEqual(['Ana', 'Luis'])
  })

  it('se lee la PRIMERA hoja y las demás quedan listadas', async () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A'], ['primera']]), 'Datos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['B'], ['segunda']]), 'Otra')
    const f = archivo('a.xlsx', new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer))
    const r = await parseSpreadsheetFile(f)
    expect(r.sheetNames).toEqual(['Datos', 'Otra'])
    expect(r.rows[0]['A']).toBe('primera')
    const r2 = await parseSpreadsheetFile(f, 'Otra')
    expect(r2.rows[0]['B']).toBe('segunda')
  })

  it('celdas combinadas: el valor queda en la primera celda y el resto vacío — no se duplica', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['A', 'B'], ['fusionada', ''], ['x', 'y']])
    ws['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }]
    const r = await parseSpreadsheetFile(xlsxDeHoja(ws))
    expect(r.rows[0]['A']).toBe('fusionada')
    expect(r.rows[0]['B']).toBe('')
  })

  it('una celda de 3.000 caracteres entra completa', async () => {
    const largo = 'x'.repeat(3000)
    const r = await parseSpreadsheetFile(archivo('a.csv', `Notas\n"${largo}"\n`))
    expect(String(r.rows[0]['Notas'])).toHaveLength(3000)
  })

  it('un binario corrupto con extensión .xlsx falla con error, no con datos basura', async () => {
    const basura = new Uint8Array([0x50, 0x4b, 0x99, 0x12, 0x00, 0x33, 0x44])
    await expect(parseSpreadsheetFile(archivo('a.xlsx', basura))).rejects.toThrow()
  })
})

// ══ Regresión con los archivos reales del repo ═════════════════════════════

describe('regresión: las muestras del repo se leen exactamente como se escribieron', () => {
  const MUESTRAS = join(process.cwd(), 'claudedocs/erp-financiero/muestras')

  it('01-propietarios.csv: 60 filas y los encabezados exactos', async () => {
    const bytes = new Uint8Array(readFileSync(join(MUESTRAS, '01-propietarios.csv')))
    const r = await parseSpreadsheetFile(archivo('01-propietarios.csv', bytes))
    expect(r.rows).toHaveLength(60)
    // El BOM no se cuela en el primer encabezado.
    expect(r.headers[0]).toBe('Tipo de documento')
    expect(r.headers).toContain('Número de documento')
    // Los acentos del contenido llegan intactos.
    const texto = JSON.stringify(r.rows)
    expect(texto).not.toContain('�')
  })

  it('05-asientos-historicos.csv: 2839 líneas de asiento y las fechas tal como están escritas', async () => {
    const bytes = new Uint8Array(readFileSync(join(MUESTRAS, '05-asientos-historicos.csv')))
    const r = await parseSpreadsheetFile(archivo('05-asientos-historicos.csv', bytes))
    expect(r.rows).toHaveLength(2839)
    const fecha = String(r.rows[0]['Fecha'] ?? r.rows[0][r.headers.find((h) => /fecha/i.test(h)) ?? ''])
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
