/**
 * Los topes del acta de entrega, con las MISMAS frases que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/actas/dto/limites-del-acta.ts`: mismos
 * números y mismas frases. Si cambia uno, cambia el otro.
 *
 * El depósito es SÓLO el tope de la columna (`int4`) en una cifra que se lee:
 * uno de once cifras es casi siempre un cero de más.
 */

export const DEPOSITO_MAXIMO_COP = 2_000_000_000
/** El testigo del cierre sin firma (`CerrarActaSinFirmaDto`). */
export const MIN_LARGO_NOMBRE_DEL_TESTIGO = 3
export const MAX_LARGO_NOMBRE_DEL_TESTIGO = 200
export const MIN_LARGO_DOCUMENTO_DEL_TESTIGO = 5
export const MAX_LARGO_DOCUMENTO_DEL_TESTIGO = 20

/** Cada descuento del depósito (`DeduccionDelActaDto` del back). */
export const MAX_LARGO_CONCEPTO_DEL_DESCUENTO = 200

export const MENSAJES_DEL_ACTA = {
  depositoNegativo: 'El depósito no puede ser negativo.',
  depositoMaximo: 'El depósito no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  conceptoDelDescuento: 'Escribe el concepto de cada descuento.',
  conceptoDelDescuentoLargo: 'El concepto de cada descuento puede tener hasta 200 caracteres.',
  descuentoMaximo: 'Un descuento no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
} as const

/** `null` si el depósito sirve (o no se puso); si no, la frase del back. */
export function errorDelDeposito(valor: number | undefined | null): string | null {
  if (valor === undefined || valor === null) return null
  if (valor < 0) return MENSAJES_DEL_ACTA.depositoNegativo
  if (valor > DEPOSITO_MAXIMO_COP) return MENSAJES_DEL_ACTA.depositoMaximo
  return null
}

/** Un renglón de descuento que nadie llenó (se agregó y se dejó vacío): no se manda. */
export function descuentoVacio(d: { concept: string; amount: number }): boolean {
  return d.concept.trim() === '' && !(d.amount > 0)
}

/**
 * El primer problema de los descuentos, con la frase del back, o `null`. Los
 * renglones vacíos no cuentan: no se mandan.
 */
export function errorDeLosDescuentos(
  descuentos: ReadonlyArray<{ concept: string; amount: number }> | undefined,
): string | null {
  for (const d of descuentos ?? []) {
    if (descuentoVacio(d)) continue
    if (d.concept.trim() === '') return MENSAJES_DEL_ACTA.conceptoDelDescuento
    if (d.concept.trim().length > MAX_LARGO_CONCEPTO_DEL_DESCUENTO) return MENSAJES_DEL_ACTA.conceptoDelDescuentoLargo
    if (d.amount > DEPOSITO_MAXIMO_COP) return MENSAJES_DEL_ACTA.descuentoMaximo
  }
  return null
}
