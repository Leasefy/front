/**
 * QA de la migración (04-10): lo que el lector de planillas perdía o
 * inventaba en silencio, con archivos generados acá mismo (sin mocks).
 */
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'

import { leerPrimerasFilasDeCadaHoja, parseSpreadsheetFile } from './parseFile'

function archivo(nombre: string, bytes: Uint8Array): File {
  return new File([bytes.slice().buffer as ArrayBuffer], nombre)
}

function xlsx(hojas: Array<{ nombre: string; ws: XLSX.WorkSheet }>): File {
  const wb = XLSX.utils.book_new()
  for (const h of hojas) XLSX.utils.book_append_sheet(wb, h.ws, h.nombre)
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return archivo('a.xlsx', new Uint8Array(bytes))
}

describe('QA-MIG-B: una celda numérica viaja con su VALOR, no con el texto del formato', () => {
  it('48350750,50 con formato «#,##0» no se redondea a 48,350,751', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Saldo'], []])
    ws['A2'] = { t: 'n', v: 48350750.5, z: '#,##0' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows[0]['Saldo']).toBe('48350750.5')
  })

  it('un canon con formato de pesos llega entero y sin separadores', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Canon'], []])
    ws['A2'] = { t: 'n', v: 2500000, z: '"$"#,##0' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows[0]['Canon']).toBe('2500000')
  })

  it('el ruido binario de una fórmula no se vuelve decimales', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Canon'], []])
    ws['A2'] = { t: 'n', v: 1500000 * 1.05, z: '#,##0' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows[0]['Canon']).toBe('1575000')
  })

  it('T-0158: un canon de 7 cifras con centavos no estrena decimales (toFixed(10) mostraba 1227294.1200000001)', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Canon'], [], [], []])
    ws['A2'] = { t: 'n', v: 1227294.12, z: '"$"#,##0.00' }
    ws['A3'] = { t: 'n', v: 2899159.66, z: '"$"#,##0.00' }
    ws['A4'] = { t: 'n', v: 48350750.5, z: '#,##0' }
    ws['!ref'] = 'A1:A4'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows.map((f) => f['Canon'])).toEqual(['1227294.12', '2899159.66', '48350750.5'])
  })

  it('tres decimales salen con cuatro: ningún lector los confunde con miles', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Área'], []])
    ws['A2'] = { t: 'n', v: 1234.567, z: '0.000' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows[0]['Área']).toBe('1234.5670')
  })

  it('un porcentaje conserva el %: 0,105 es «10.5%», no 0,105', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Comisión'], []])
    ws['A2'] = { t: 'n', v: 0.105, z: '0%' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows[0]['Comisión']).toBe('10.5%')
  })

  it('un código con formato de ceros conserva los ceros a la izquierda', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Código'], []])
    ws['A2'] = { t: 'n', v: 7, z: '000' }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows[0]['Código']).toBe('007')
  })
})

describe('QA-MIG-B: el número de fila es el de la hoja, también después de una fila en blanco', () => {
  it('una fila vacía en medio no corre los números de las de abajo', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Nombre'], ['Ana'], [''], ['Luis']])
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(r.rows.map((f) => f._rowIndex)).toEqual([1, 3])
  })

  it('con el encabezado en la fila 3, la primera fila de datos es la 3 (base 0)', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['TÍTULO'], [], ['Nombre', 'Cédula'], ['Ana', '1']])
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]), undefined, {
      filaDeEncabezado: 2,
    })
    expect(r.rows[0]._rowIndex).toBe(3)
  })
})

describe('QA-MIG-A MG-02: las primeras filas de CADA hoja, para elegir la buena', () => {
  it('devuelve cada hoja con sus filas, en el orden del libro', async () => {
    const f = xlsx([
      { nombre: 'Instrucciones', ws: XLSX.utils.aoa_to_sheet([['No modificar.']]) },
      { nombre: 'Propietarios', ws: XLSX.utils.aoa_to_sheet([['Documento', 'Nombre'], ['1', 'Ana']]) },
    ])
    const hojas = await leerPrimerasFilasDeCadaHoja(f, 5)
    expect(hojas.map((h) => h.hoja)).toEqual(['Instrucciones', 'Propietarios'])
    expect(hojas[1].filas[0]).toEqual(['Documento', 'Nombre'])
  })
})

/**
 * Un .xlsx cuya celda A2 guarda en la hoja EXACTAMENTE `guardado` (lo que
 * escribe el sistema que exporta), con otra hoja delante para que la ruta se
 * resuelva por el nombre y no por el orden.
 */
function xlsxConLaCeldaGuardada(guardado: string): File {
  const ws = XLSX.utils.aoa_to_sheet([['Documento'], []])
  ws['A2'] = { t: 'n', v: 1 }
  ws['!ref'] = 'A1:A2'
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Léeme']]), 'Instrucciones')
  XLSX.utils.book_append_sheet(wb, ws, 'Terceros')
  const zip = XLSX.CFB.read(new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' })), {
    type: 'array',
  })
  const hoja = XLSX.CFB.find(zip, '/xl/worksheets/sheet2.xml')
  const xml = new TextDecoder().decode(hoja.content).replace(
    /(<c r="A2"[^>]*>)<v>1<\/v>/,
    `$1<v>${guardado}</v>`,
  )
  hoja.content = new TextEncoder().encode(xml)
  hoja.size = hoja.content.length
  return archivo('a.xlsx', new Uint8Array(XLSX.CFB.write(zip, { fileType: 'zip', type: 'array' })))
}

describe('🔴 Portofino (14-10) · un número de más de 15 cifras no se inventa', () => {
  it('la hoja guarda «711408791026157919» completo (fila 64 de Portofino): sale completo', async () => {
    const r = await parseSpreadsheetFile(xlsxConLaCeldaGuardada('711408791026157919'), 'Terceros')
    expect(String(r.rows[0]['Documento'])).toBe('711408791026157919')
  })

  it('la hoja guarda sólo 15 cifras (como Excel): sale en notación científica, nunca «…158000»', async () => {
    const r = await parseSpreadsheetFile(xlsxConLaCeldaGuardada('7.1140879102615795E+17'), 'Terceros')
    const valor = String(r.rows[0]['Documento'])
    expect(valor).not.toBe('711408791026158000')
    expect(valor).toMatch(/e\+17$/i)
  })

  it('un documento de 10 cifras sigue igual', async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Documento'], []])
    ws['A2'] = { t: 'n', v: 1026157919 }
    ws['!ref'] = 'A1:A2'
    const r = await parseSpreadsheetFile(xlsx([{ nombre: 'H', ws }]))
    expect(String(r.rows[0]['Documento'])).toBe('1026157919')
  })
})
