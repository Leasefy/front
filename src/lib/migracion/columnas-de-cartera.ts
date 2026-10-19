/**
 * columnas-de-cartera — which column of a per-invoice debt report is which.
 *
 * T-0168 (contract §3.6). The agency uploads the previous system's report of
 * what each tenant owes, one row per invoice. Only five things are needed:
 * the date the rent was due, the TENANT's document and name, the concept and
 * the outstanding balance. Everything else in the file is ignored.
 *
 * Why this is not `mapearColumnas` (columnas-de-tercero): that matcher is
 * built for a closed template and matches by containment with the longest
 * alias, which is exactly wrong here. A report carries the OWNER's document
 * and name right next to the tenant's ("Documento Propietario" contains
 * "documento"), and two money columns ("Valor Total" is the invoice, "Saldo
 * Pendiente" is what is still owed). Matching the wrong one charges a person
 * with someone else's debt, or with money already paid, without an error.
 * So: tenant terms are mandatory for document/name, owner headers are never
 * offered for them, and the amount is the balance, never the invoice total.
 *
 * Two passes: exact equality with an alias list (in list order), then
 * containment rules. Exact matches win over containment.
 */

import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service'

import { normalizarEncabezado } from './columnas-de-tercero'

export type CampoDeCartera =
  | 'fechaVencimiento'
  | 'fechaFactura'
  | 'documento'
  | 'nombre'
  | 'concepto'
  | 'valor'

/** Lo que se necesita para poder cargar; `fecha` se cumple con cualquiera de las dos fechas. */
export type CampoQueFalta = 'documento' | 'nombre' | 'fecha' | 'concepto' | 'valor'

const ALIAS: Record<CampoDeCartera, readonly string[]> = {
  fechaVencimiento: [
    'fecha de vencimiento',
    'fecha vencimiento',
    'vencimiento',
    'fecha vence',
    'f vencimiento',
    'fecha limite de pago',
    'fecha limite',
  ],
  fechaFactura: [
    'fecha de factura',
    'fecha factura',
    'fecha de emision',
    'fecha emision',
    'fecha documento',
    'fecha',
  ],
  documento: [
    'documento inquilino',
    'documento del inquilino',
    'doc inquilino',
    'cedula inquilino',
    'nit inquilino',
    'identificacion inquilino',
    'nro documento inquilino',
    'documento arrendatario',
    'cedula arrendatario',
    'nit arrendatario',
    'identificacion arrendatario',
    'documento cliente',
    'nit cliente',
    'cedula cliente',
    'identificacion cliente',
  ],
  nombre: [
    'nombre inquilino',
    'nombre del inquilino',
    'nombre arrendatario',
    'nombre cliente',
    'razon social cliente',
    'inquilino',
    'arrendatario',
    'cliente',
  ],
  concepto: [
    'concepto',
    'descripcion',
    'detalle',
    'concepto facturado',
    'concepto de cobro',
    'nombre concepto',
    'tipo de cobro',
    'item',
    'servicio',
  ],
  valor: [
    'saldo pendiente',
    'saldo',
    'saldo por cobrar',
    'saldo actual',
    'saldo factura',
    'saldo adeudado',
    'saldo cartera',
    'valor pendiente',
    'valor adeudado',
    'pendiente',
    'por pagar',
    'debe',
    'deuda',
  ],
}

/** Para `elegirHojaYEncabezado`: reconocer en qué hoja y fila empieza la tabla. */
export const COLUMNAS_DE_CARTERA: readonly (ColumnaDePlantilla & { campo: CampoDeCartera })[] = [
  { campo: 'fechaVencimiento', titulo: 'Fecha de vencimiento', obligatoria: true, ejemplo: '2026-01-05', alias: ALIAS.fechaVencimiento },
  { campo: 'fechaFactura', titulo: 'Fecha de factura', obligatoria: false, ejemplo: '2025-12-28', alias: ALIAS.fechaFactura },
  { campo: 'documento', titulo: 'Documento del inquilino', obligatoria: true, ejemplo: '1020304050', alias: ALIAS.documento },
  { campo: 'nombre', titulo: 'Nombre del inquilino', obligatoria: true, ejemplo: 'Ana Pérez', alias: ALIAS.nombre },
  { campo: 'concepto', titulo: 'Concepto', obligatoria: true, ejemplo: 'Canon', alias: ALIAS.concepto },
  { campo: 'valor', titulo: 'Saldo pendiente', obligatoria: true, ejemplo: '1500000', alias: ALIAS.valor },
]

export interface MapeoDeCartera {
  /** El encabezado tal como venía en el archivo. */
  columna: string
  campo: CampoDeCartera | null
  /** `false` = empató por contención, no por igualdad. */
  exacto: boolean
  /** La persona lo eligió a mano. */
  esManual?: boolean
}

// ── Owner and tenant terms ──────────────────────────────────────────────────

/** `dueno` also covers `duenos`; `propietari` covers the plural. */
const PROPIETARIO = /propietari|arrendador|dueno|owner|beneficiari/

/** An owner column is never the tenant's document or name. */
export function esDeUnPropietario(encabezado: string): boolean {
  return PROPIETARIO.test(normalizarEncabezado(encabezado))
}

const TERMINOS_DE_INQUILINO = ['inquilino', 'arrendatario', 'cliente']
const TERMINOS_DE_DOCUMENTO = ['documento', 'doc', 'cedula', 'cc', 'nit', 'identificacion', 'id']

const hablaDelInquilino = (h: string) => TERMINOS_DE_INQUILINO.some((t) => h.includes(t))

/** Money columns that are the invoice (or what was paid), never the balance. */
const NO_ES_EL_SALDO = /abono|pagad|valor total|total factura|subtotal|valor factura|valor bruto/

/** A count of days ("Días de vencimiento", "Días de mora") is a number, never a date. */
const CUENTA_DE_DIAS = /\bdias?\b|\bmora\b/

const CONTIENE: Record<CampoDeCartera, (h: string, palabras: readonly string[]) => boolean> = {
  fechaVencimiento: (h) => h.includes('vencim') && !CUENTA_DE_DIAS.test(h),
  fechaFactura: (h) => h.includes('fecha') && h.includes('factur') && !CUENTA_DE_DIAS.test(h),
  documento: (h, palabras) => hablaDelInquilino(h) && palabras.some((p) => TERMINOS_DE_DOCUMENTO.includes(p)),
  nombre: (h, palabras) =>
    hablaDelInquilino(h) && (palabras.includes('nombre') || h.includes('razon social')),
  concepto: (h) => h.includes('concepto'),
  valor: (h) => (h.includes('saldo') || h.includes('pendiente')) && !NO_ES_EL_SALDO.test(h),
}

/** The order matters: document is taken before name so a header is never both. */
const ORDEN: readonly CampoDeCartera[] = [
  'documento',
  'nombre',
  'fechaVencimiento',
  'fechaFactura',
  'concepto',
  'valor',
]

const SOLO_DEL_INQUILINO: ReadonlySet<CampoDeCartera> = new Set(['documento', 'nombre'])

/** Qué campos se le pueden ofrecer a esta columna en el selector. */
export function opcionesParaLaColumna(encabezado: string): CampoDeCartera[] {
  const propietario = esDeUnPropietario(encabezado)
  return (Object.keys(ALIAS) as CampoDeCartera[]).filter((c) => !(propietario && SOLO_DEL_INQUILINO.has(c)))
}

export function mapearColumnasDeCartera(encabezados: readonly string[]): MapeoDeCartera[] {
  const normalizados = encabezados.map(normalizarEncabezado)
  const resultado: MapeoDeCartera[] = encabezados.map((columna) => ({ columna, campo: null, exacto: false }))
  const tomada = (i: number) => resultado[i].campo !== null
  const permitida = (campo: CampoDeCartera, i: number) =>
    !(SOLO_DEL_INQUILINO.has(campo) && PROPIETARIO.test(normalizados[i]))
  const llena = new Set<CampoDeCartera>()

  // Pass 1: exact equality, in alias-list order.
  for (const campo of ORDEN) {
    for (const alias of ALIAS[campo]) {
      const i = normalizados.findIndex((h, idx) => h === alias && !tomada(idx) && permitida(campo, idx))
      if (i !== -1) {
        resultado[i] = { columna: encabezados[i], campo, exacto: true }
        llena.add(campo)
        break
      }
    }
  }

  // Pass 2: containment rules, first column in the file wins.
  for (const campo of ORDEN) {
    if (llena.has(campo)) continue
    const i = normalizados.findIndex(
      (h, idx) =>
        h !== '' && !tomada(idx) && permitida(campo, idx) && CONTIENE[campo](h, h.split(' ')),
    )
    if (i !== -1) {
      resultado[i] = { columna: encabezados[i], campo, exacto: false }
      llena.add(campo)
    }
  }
  return resultado
}

/**
 * La persona eligió a mano qué es una columna (o la ignoró con `null`). Un
 * campo vive en UNA columna: la que lo tenía lo suelta. Una columna del
 * propietario no puede ser el documento ni el nombre del inquilino.
 */
export function remapearCartera(
  mapeo: readonly MapeoDeCartera[],
  columna: string,
  campo: CampoDeCartera | null,
): MapeoDeCartera[] {
  if (campo !== null && !opcionesParaLaColumna(columna).includes(campo)) return [...mapeo]
  return mapeo.map((m) => {
    if (m.columna === columna) return { columna, campo, exacto: false, esManual: campo !== null }
    if (campo !== null && m.campo === campo) return { ...m, campo: null, exacto: false, esManual: undefined }
    return m
  })
}

/** Los campos que la pantalla deja elegir, en el orden en que los muestra. */
export const CAMPOS_DE_CARTERA: readonly CampoDeCartera[] = [
  'documento',
  'nombre',
  'fechaVencimiento',
  'fechaFactura',
  'concepto',
  'valor',
]

/**
 * La persona eligió, para un CAMPO, de qué columna sale (o `null` = ninguna).
 * Es `remapearCartera` visto desde el campo: la pantalla pregunta «¿de dónde
 * sale el saldo?», no «¿qué es la columna X?».
 */
export function elegirColumnaDelCampo(
  mapeo: readonly MapeoDeCartera[],
  campo: CampoDeCartera,
  columna: string | null,
): MapeoDeCartera[] {
  if (columna !== null) return remapearCartera(mapeo, columna, campo)
  return mapeo.map((m) => (m.campo === campo ? { columna: m.columna, campo: null, exacto: false } : m))
}

/** Los encabezados que se le ofrecen a un campo: nunca uno vacío, ni del propietario para documento/nombre. */
export function encabezadosParaElCampo(encabezados: readonly string[], campo: CampoDeCartera): string[] {
  return encabezados.filter((e) => e.trim() !== '' && opcionesParaLaColumna(e).includes(campo))
}

/** Lo que todavía no se ha señalado, en el orden en que la pantalla lo pide. */
export function columnasQueFaltan(mapeo: readonly MapeoDeCartera[]): CampoQueFalta[] {
  const hay = (c: CampoDeCartera) => mapeo.some((m) => m.campo === c)
  const faltan: CampoQueFalta[] = []
  if (!hay('documento')) faltan.push('documento')
  if (!hay('nombre')) faltan.push('nombre')
  if (!hay('fechaVencimiento') && !hay('fechaFactura')) faltan.push('fecha')
  if (!hay('concepto')) faltan.push('concepto')
  if (!hay('valor')) faltan.push('valor')
  return faltan
}
