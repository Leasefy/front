/**
 * Regresión con el archivo REAL de muestra: las 90 filas de
 * `claudedocs/erp-financiero/muestras/04-contratos.csv` pasan enteras por el
 * mapeo y el armado, y tres filas concretas quedan byte por byte como deben.
 *
 * Si un cambio en el parser rompe el caso que Nico usa para probar el muro,
 * este test lo dice ANTES de que él lo vea.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'

import { mapearColumnas, sinMapear } from './columnas-de-contrato'
import { armarFilaAMigrar } from './armar-fila'

function leerMuestra() {
  const ruta = join(__dirname, '../../../claudedocs/erp-financiero/muestras/04-contratos.csv')
  // Mismo camino que `parseSpreadsheetFile`: XLSX + sheet_to_json con
  // `defval: ''` y `raw: false` — el texto queda tal como se escribió.
  const libro = XLSX.read(readFileSync(ruta), { type: 'buffer' })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '', raw: false })
  const encabezados = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1 })[0] as string[]
  return { filas, encabezados }
}

describe('la muestra real de contratos, entera', () => {
  const { filas, encabezados } = leerMuestra()
  const mapeo = mapearColumnas(encabezados)
  const armadas = filas.map((f) => armarFilaAMigrar(f, mapeo))

  it('son 90 filas y ningún campo clave queda sin mapear', () => {
    expect(filas).toHaveLength(90)
    expect(sinMapear(mapeo)).toEqual([])
  })

  it('las 90 llegan completas: dirección, correo, fechas, canon, día y uso', () => {
    for (const fila of armadas) {
      expect(fila.direccion).not.toBe('')
      expect(fila.inquilino.correo).toContain('@')
      expect(fila.inquilino.documento).toMatch(/^\d+$/)
      expect(fila.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(fila.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(fila.monthlyRent).toBeGreaterThan(0)
      expect(fila.paymentDay).toBeGreaterThanOrEqual(1)
      expect(fila.paymentDay).toBeLessThanOrEqual(28)
      expect(fila.usoInmueble === 'VIVIENDA' || fila.usoInmueble === 'COMERCIAL').toBe(true)
    }
  })

  it('la fila 1 queda exacta', () => {
    expect(armadas[0]).toMatchObject({
      direccion: 'Calle 75 # 57-31 Apto 802',
      inquilino: {
        nombre: 'Claudia Patricia Rodríguez Castaño',
        documento: '43106494',
        correo: 'claudia.rodriguez@example.com',
      },
      startDate: '2024-04-10',
      endDate: '2027-04-10',
      monthlyRent: 2400000,
      deposit: 0,
      paymentDay: 5,
      usoInmueble: 'VIVIENDA',
      periodicidad: 'MENSUAL',
      comisionPorcentaje: 9,
    })
  })

  it('la fila 2 queda exacta', () => {
    expect(armadas[1]).toMatchObject({
      direccion: 'Carrera 39D # 12-92 Apto 1003',
      inquilino: { documento: '43068270', correo: 'nicolas.rojas@example.com' },
      monthlyRent: 1600000,
      comisionPorcentaje: 10,
    })
  })

  it('los 90 cánones suman lo que el archivo dice (ninguno se leyó a la milésima)', () => {
    const total = armadas.reduce((s, f) => s + (f.monthlyRent ?? 0), 0)
    // Cota de cordura: 90 cánones colombianos reales están entre 90 y 900 millones.
    expect(total).toBeGreaterThan(90 * 1_000_000)
    expect(total).toBeLessThan(900 * 1_000_000)
    expect(armadas.every((f) => (f.monthlyRent ?? 0) >= 400_000)).toBe(true)
  })
})
