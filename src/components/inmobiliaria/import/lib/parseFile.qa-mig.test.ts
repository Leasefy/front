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
