/**
 * lineas-de-cartera — reading a per-invoice debt report into wire lines.
 *
 * T-0168 (contract §3.6). One report row becomes one `LineaDeCartera`; the
 * back excludes, groups and matches. What the front MUST do is make sure a
 * single unreadable cell never reaches the wire: the DTO validates the whole
 * request, so one bad line would be a 400 for the entire file. Rows that
 * cannot be sent are listed locally with their row number and are counted in
 * the preview.
 *
 * Dates (frozen rules):
 *  - ISO text, with or without time, and `dd/mm/aaaa` (day first) go through
 *    `comoFecha`, with the per-COLUMN month-first rule of
 *    `fechas-con-mes-primero`.
 *  - A bare number is an Excel serial ONLY in an Excel workbook, converted
 *    with the workbook's own date system (`date1904`). From a CSV a bare
 *    number is unreadable: guessing would shift a debt by years.
 *  - Two-digit years and free text are unreadable.
 */

import { comoFecha } from '@/lib/contratos/leer-celdas'

import type { CampoDeCartera, MapeoDeCartera } from './columnas-de-cartera'
import { fechasConMesPrimero, fraseDeFechasConMesPrimero } from './fechas-con-mes-primero'
import { esFilaDeTotales } from './fila-de-totales'
import { plataDeOrigen } from './valores-de-origen'

/** The back's `@ArrayMaxSize`. One request carries the whole file. */
export const MAX_LINEAS_DE_CARTERA = 20_000

const MAX_DOCUMENTO = 40
const MAX_TEXTO = 200
const MAX_FILA = 1_000_000
const MAX_PLATA = 1_000_000_000_000

/** One element of `lineas[]` of `POST /contracts/migrar/cartera-por-factura`. */
export interface LineaDeCartera {
  /** 1-based, as the person sees it in the spreadsheet. */
  fila?: number
  /** `YYYY-MM-DD`: the day the line became due. */
  fecha: string
  documento: string
  nombre: string | null
  concepto: string
  /** The outstanding balance of the row, in pesos (<= 2 decimals). */
  valorCop: number
}

/** A row that was NOT sent, and why. */
export interface ProblemaLocal {
  fila: number | null
  motivo: string
}

export interface LecturaDeLaCartera {
  lineas: LineaDeCartera[]
  problemas: ProblemaLocal[]
  /** Rows whose due date was unreadable and used the invoice date instead. */
  conFechaDeFactura: number
  /** What was said about month-first dates, or `null`. */
  fraseDeFechas: string | null
  /** More than `MAX_LINEAS_DE_CARTERA` sendable rows: nothing is sent. */
  demasiadas: boolean
}

export interface OpcionesDeFecha {
  /** The file is an Excel workbook, where a bare number is a serial. */
  esXlsx: boolean
  /** The workbook counts days from 1904. */
  date1904: boolean
}

// ── Excel workbooks ─────────────────────────────────────────────────────────

/** Binary Excel workbooks store dates as serial numbers; CSV and ODS do not. */
export function esLibroConSeriales(nombreDelArchivo: string): boolean {
  const ext = nombreDelArchivo.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'xlsx' || ext === 'xlsm' || ext === 'xls'
}

/** The workbook's date system. `false` for anything that is not an Excel workbook. */
export async function date1904DelLibro(archivo: File): Promise<boolean> {
  if (!esLibroConSeriales(archivo.name)) return false
  try {
    const XLSX = await import('xlsx')
    const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array', sheetRows: 1 })
    return libro.Workbook?.WBProps?.date1904 === true
  } catch {
    return false
  }
}

const DIA_EN_MS = 86_400_000

/** Excel serial -> `YYYY-MM-DD`, or `undefined` when it is not a real day. */
function serialAFecha(serial: number, date1904: boolean): string | undefined {
  const dia = Math.floor(serial)
  if (!Number.isFinite(dia) || dia < 1) return undefined
  let origen: number
  if (date1904) {
    origen = Date.UTC(1904, 0, 1)
  } else {
    // 1900 system: Excel believes 1900 was a leap year. Serial 60 (29-02-1900)
    // does not exist; before it the origin moves one day.
    if (dia === 60) return undefined
    origen = dia < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30)
  }
  const fecha = new Date(origen + dia * DIA_EN_MS)
  const anio = fecha.getUTCFullYear()
  if (anio < 1900 || anio > 2100) return undefined
  return fecha.toISOString().slice(0, 10)
}

/** One date cell -> `YYYY-MM-DD`, or `undefined` when it cannot be read with certainty. */
export function fechaDeCartera(celda: unknown, opciones: OpcionesDeFecha): string | undefined {
  if (celda instanceof Date) return comoFecha(celda)
  const texto = String(celda ?? '').trim()
  if (!texto) return undefined
  if (/^\d+(\.\d+)?$/.test(texto) || typeof celda === 'number') {
    return opciones.esXlsx ? serialAFecha(Number(texto), opciones.date1904) : undefined
  }
  return comoFecha(texto)
}

// ── Reading rows ────────────────────────────────────────────────────────────

const textoDe = (v: unknown): string => String(v ?? '').trim()

/** Amount with at most two decimals and inside the back's range, or `undefined`. */
function saldoDeCartera(celda: unknown): number | undefined {
  const n = plataDeOrigen(celda)
  if (n === undefined) return undefined
  if (Math.abs(n) > MAX_PLATA) return undefined
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return undefined
  return Math.round(n * 100) / 100
}

/** The row number the person sees in the spreadsheet (`_rowIndex` is 0-based). */
function numeroDeFila(fila: Record<string, unknown>, indice: number): number | null {
  const base = typeof fila._rowIndex === 'number' ? fila._rowIndex : indice + 1
  const n = base + 1
  return Number.isInteger(n) && n >= 1 && n <= MAX_FILA ? n : null
}

const estaEnBlanco = (fila: Record<string, unknown>) =>
  Object.entries(fila).every(([clave, v]) => clave.startsWith('_') || textoDe(v) === '')

export function leerLineasDeCartera(
  filas: readonly Record<string, unknown>[],
  mapeo: readonly MapeoDeCartera[],
  opciones: OpcionesDeFecha,
): LecturaDeLaCartera {
  const columna = (campo: CampoDeCartera) => mapeo.find((m) => m.campo === campo)?.columna
  const cVencimiento = columna('fechaVencimiento')
  const cFactura = columna('fechaFactura')
  const cDocumento = columna('documento')
  const cNombre = columna('nombre')
  const cConcepto = columna('concepto')
  const cValor = columna('valor')

  // Month-first dates are decided per COLUMN, over only the date columns.
  const columnasDeFechas = [cVencimiento, cFactura].filter((c): c is string => c !== undefined)
  const soloFechas = filas.map((f) => Object.fromEntries(columnasDeFechas.map((c) => [c, f[c]])))
  const delMes = fechasConMesPrimero(soloFechas)
  const fraseDeFechas = fraseDeFechasConMesPrimero(delMes)

  const lineas: LineaDeCartera[] = []
  const problemas: ProblemaLocal[] = []
  let conFechaDeFactura = 0

  filas.forEach((f, i) => {
    const fila = numeroDeFila(f, i)
    const sinEnviar = (motivo: string) => problemas.push({ fila, motivo })

    if (estaEnBlanco(f)) return sinEnviar('La fila está en blanco.')
    if (esFilaDeTotales(f)) return sinEnviar('Es una fila de totales: no es una factura.')

    const fechas = delMes.filas[i]
    let fecha = cVencimiento ? fechaDeCartera(fechas[cVencimiento], opciones) : undefined
    if (fecha === undefined && cFactura) {
      fecha = fechaDeCartera(fechas[cFactura], opciones)
      if (fecha !== undefined) conFechaDeFactura += 1
    }
    if (fecha === undefined) return sinEnviar('La fecha no se pudo leer.')

    const documento = cDocumento ? textoDe(f[cDocumento]) : ''
    if (!documento) return sinEnviar('Falta el documento del inquilino.')
    if (documento.length > MAX_DOCUMENTO) return sinEnviar('El documento del inquilino es demasiado largo.')

    const concepto = cConcepto ? textoDe(f[cConcepto]) : ''
    if (!concepto) return sinEnviar('Falta el concepto.')

    const celdaDelSaldo = cValor ? f[cValor] : undefined
    if (textoDe(celdaDelSaldo) === '') return sinEnviar('Falta el saldo pendiente.')
    const valorCop = saldoDeCartera(celdaDelSaldo)
    if (valorCop === undefined) {
      return sinEnviar('El saldo pendiente no se pudo leer (pesos, con hasta dos decimales).')
    }

    const nombre = cNombre ? textoDe(f[cNombre]) : ''
    const linea: LineaDeCartera = {
      fecha,
      documento,
      nombre: nombre === '' ? null : nombre.slice(0, MAX_TEXTO),
      concepto: concepto.slice(0, MAX_TEXTO),
      valorCop,
    }
    if (fila !== null) linea.fila = fila
    lineas.push(linea)
  })

  if (lineas.length > MAX_LINEAS_DE_CARTERA) {
    return { lineas: [], problemas, conFechaDeFactura, fraseDeFechas, demasiadas: true }
  }
  return { lineas, problemas, conFechaDeFactura, fraseDeFechas, demasiadas: false }
}
