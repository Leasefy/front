/**
 * report-format.ts — el ÚNICO lugar donde un escalar del informe se vuelve texto.
 *
 * El modelo viaja crudo (`Scalar.raw` + `Scalar.format`); acá se produce el
 * string. Un solo módulo ⇒ no existe el drift raw↔texto que aparece cuando cada
 * componente formatea a su manera.
 *
 * Plata y fechas salen por `@/lib/format` (`formatCurrency`, `formatDate`), que
 * es la convención del repo (`docs/DESIGN.md:38`, `src/lib/format.ts:19,51`).
 *
 * Nota de contraste con el emisor: el microservicio tiene su propio
 * `report/format.ts` SIN `Intl` a propósito, porque allá los bytes del PDF son
 * un contrato (un NBSP de ICU cambia el hash). Acá no hay contrato de bytes: la
 * landing es presentación. Por eso este módulo puede usar `toLocaleString`.
 */

import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { Scalar } from './report-model'

/** Puntos básicos → porcentaje con dos decimales: 2000 → «20,00 %». */
export function formatBps(bps: number): string {
  const pct = bps / 100
  const signo = bps > 0 ? '+' : ''
  return `${signo}${pct.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`
}

/** Cobertura de la banda: 8000 bps → «80 %». */
export function formatCoverage(bps: number): string {
  return `${Math.round(bps / 100)} %`
}

/** Porcentaje con dos decimales, sin signo forzado: 5.997 → «5,99 %». */
export function formatPct2(pct: number): string {
  return `${pct.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`
}

/** Precio por metro cuadrado: 6675000 → «$ 6.675.000 /m²». */
export function formatCopPerM2(cop: number): string {
  return `${formatCurrency(cop)} /m²`
}

/**
 * El texto de un escalar. Si el dato falta, devuelve su `missingText` declarado
 * — que es contrato de bytes del emisor, no copy de UI.
 */
export function formatScalar(scalar: Scalar): string {
  if (scalar.missing || scalar.raw === null) {
    return scalar.missingText ?? '—'
  }

  const raw = scalar.raw

  switch (scalar.format) {
    case 'cop':
      return typeof raw === 'number' ? formatCurrency(raw) : String(raw)
    case 'copPerM2':
      return typeof raw === 'number' ? formatCopPerM2(raw) : String(raw)
    case 'int':
      return typeof raw === 'number' ? formatNumber(raw) : String(raw)
    case 'bps':
      return typeof raw === 'number' ? formatBps(raw) : String(raw)
    case 'pct2':
      return typeof raw === 'number' ? formatPct2(raw) : String(raw)
    case 'coverage':
      return typeof raw === 'number' ? formatCoverage(raw) : String(raw)
    case 'days':
      return typeof raw === 'number' ? `${formatNumber(raw)} días` : String(raw)
    case 'dateIso':
      return typeof raw === 'string' ? formatDate(raw) : String(raw)
    case 'text':
    default:
      return String(raw)
  }
}

/**
 * true ⇒ el escalar se pinta en mono tabular. Un informe es casi todo números
 * (`docs/DESIGN.md:38,198`): áreas, COP, coeficientes, fechas, el hash.
 */
export function isNumericFormat(format: Scalar['format']): boolean {
  return format !== 'text'
}

/** Etiqueta legible de la procedencia de un dato. */
export const ORIGIN_LABEL: Readonly<Record<Scalar['origin'], string>> = {
  usuario: 'declarado por el solicitante',
  usuario_features: 'declarado por el solicitante',
  declarado: 'declarado',
  calculado: 'calculado por el modelo',
  catalogo: 'catálogo',
  no_verificado: 'no verificado',
}

// ---------------------------------------------------------------------------
// El sello: fecha + hora con zona explícita
// ---------------------------------------------------------------------------

/**
 * La zona del documento. El sello es un acto con hora (se firmó, se comprobó) y
 * la landing se pinta en un servidor cuya zona nadie controla — sin fijarla, la
 * misma firma saldría con horas distintas según dónde corra Next. El emisor es
 * colombiano y su verificador habla en Bogotá; acá se dice lo mismo, con la
 * zona escrita en el texto para que no haya que adivinarla.
 */
export const SEAL_TIME_ZONE = 'America/Bogota'

/**
 * «14 ago 2026, 10:22 a. m. GMT-5». Fecha corta del repo (`formatDate` usa
 * `day numeric · month short · year numeric`) más hora y zona. Devuelve `null`
 * si el ISO no se puede leer: mejor no imprimir nada que imprimir «Invalid Date».
 */
export function formatSealTimestamp(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SEAL_TIME_ZONE,
    timeZoneName: 'short',
  })
}
