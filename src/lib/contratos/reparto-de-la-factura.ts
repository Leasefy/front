/**
 * reparto-de-la-factura — T-0163 (Anexo B4).
 *
 * Cuando un contrato tiene varios inquilinos, la factura se emite una por
 * inquilino, cada una por su parte. Acá vive lo que el FRONT valida de lo que la
 * persona escribe; el reparto en pesos lo calcula el back (con la misma función
 * que usa en el lado del propietario). Nada de esto divide plata.
 *
 * Puntos básicos: 10.000 = 100 %.
 */

import type { InquilinoDelContrato } from '@/lib/types/contract'

const BPS_TOTAL = 10_000

/**
 * ¿Se ofrece la sección «Reparto de la factura»?
 *
 * Sólo con dos o más inquilinos Y si el back sabe de repartos: la clave
 * `participacionBps` viene siempre (aun en `null`) desde un back nuevo y no
 * viene en uno viejo. Mandarle un reparto a un back viejo sería un 404.
 */
export function hayRepartoDeLaFactura(lista: readonly InquilinoDelContrato[]): boolean {
  return lista.length >= 2 && lista.some((i) => 'participacionBps' in i)
}

/** ¿El contrato ya reparte su factura? (alguna parte con valor). */
export function repartoEstaDefinido(lista: readonly InquilinoDelContrato[]): boolean {
  return lista.some((i) => typeof i.participacionBps === 'number')
}

/**
 * Partes iguales entre `n` inquilinos. El resto se lo lleva el titular: es la
 * misma regla del back (pesos enteros, el sobrante al primero), así que lo que
 * se ve al guardar es lo que se factura.
 */
export function partesIguales(n: number): { titular: number; otros: number[] } {
  const parte = Math.floor(BPS_TOTAL / n)
  return {
    titular: BPS_TOTAL - parte * (n - 1),
    otros: Array.from({ length: n - 1 }, () => parte),
  }
}

/** Lo que le queda al titular: 100 % menos lo de los demás. Puede dar negativo. */
export function bpsDelTitular(otros: readonly number[]): number {
  return BPS_TOTAL - otros.reduce((a, b) => a + (b || 0), 0)
}

/** `"33,5"` o `"33.5"` -> `3350` bps. Vacío o ilegible -> `0`. */
export function porcentajeDeTexto(texto: string): number {
  const n = Number.parseFloat(texto.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}

/** `3333` -> `"33,33"`, `5000` -> `"50"` (para el campo y para el texto corrido). */
export function textoDelPorcentaje(bps: number): string {
  return (bps / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

/** Por qué no se puede guardar todavía, o `null` si está listo. */
export function motivoDelReparto(otros: readonly number[]): string | null {
  if (otros.some((b) => (b || 0) <= 0)) {
    return 'Cada inquilino necesita un porcentaje mayor a 0.'
  }
  if (bpsDelTitular(otros) <= 0) {
    const suman = otros.reduce((a, b) => a + b, 0)
    return `Los demás inquilinos suman ${textoDelPorcentaje(suman)} %: al titular le tiene que quedar algo.`
  }
  return null
}
