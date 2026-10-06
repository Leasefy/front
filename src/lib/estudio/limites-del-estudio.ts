/**
 * Los topes del estudio del inquilino (pre-scoring) y de lo que el inquilino
 * escribe al pagar, con las MISMAS cifras y frases que el back (02-10-2026).
 *
 * 🔁 Espejo de los topes del back:
 *  · `src/pre-scoring/dto/limites-del-estudio.ts` (ciudad y canon del estudio);
 *  · `src/tenant-payments/dto/limites-del-pago.ts` (`topeCop` del autopago y
 *    `amount` de un pago).
 * Si cambia uno, cambia el otro. Lo que el back rechazaría se ataja acá ANTES
 * de mandar nada, con la frase que el back daría.
 */

/** `pre_scoring_orders.ciudad` es VarChar(100). */
export const MAX_LARGO_CIUDAD = 100

/**
 * El canon mensual del estudio: $100.000.000, el mismo tope del presupuesto
 * del inquilino (Nico, 02-10-2026). Una cifra más alta es casi siempre un cero
 * de más.
 */
export const CANON_MAXIMO_COP = 100_000_000

/** El tope que el inquilino le pone a su cobro automático: el mismo techo mensual. */
export const TOPE_DEL_AUTOPAGO_MAXIMO_COP = 100_000_000

/** Un pago puede juntar varios meses; el techo cuida la columna `int4`. */
export const PAGO_MAXIMO_COP = 2_000_000_000

/** Frases de `back/src/pre-scoring/dto/limites-del-estudio.ts`. */
export const MENSAJES_DEL_ESTUDIO = {
  ciudadLarga: 'La ciudad puede tener hasta 100 caracteres.',
  // Sólo pesos enteros, con la frase del inmueble (Nico, 02-10-2026).
  canonEntero: 'Escribe el canon en pesos enteros, sin centavos.',
  canonPositivo: 'El canon debe ser mayor que cero.',
  canonMaximo: 'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
} as const

/** Frases de `back/src/tenant-payments/dto/limites-del-pago.ts` que el inquilino puede ver. */
export const MENSAJES_DEL_PAGO = {
  pagoMaximo: 'El valor del pago no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
  topeDelAutopagoEntero:
    'El tope del cobro automático debe ser un número entero de pesos, sin decimales.',
  topeDelAutopagoPositivo: 'El tope del cobro automático debe ser mayor que cero.',
  topeDelAutopagoMaximo:
    'El tope del cobro automático no puede pasar de $100.000.000. Revisa que no sobren ceros.',
} as const

/** Qué tiene de malo el tope del cobro automático que se escribió (dígitos). `null` = está bien. */
export function errorDelTopeDelAutopago(digitos: string): string | null {
  const limpio = digitos.replace(/[^\d]/g, '')
  if (!limpio) return 'Escribe hasta cuánto autorizas por mes.'
  const n = Number(limpio)
  if (!Number.isSafeInteger(n)) return MENSAJES_DEL_PAGO.topeDelAutopagoMaximo
  if (n < 1) return MENSAJES_DEL_PAGO.topeDelAutopagoPositivo
  if (n > TOPE_DEL_AUTOPAGO_MAXIMO_COP) return MENSAJES_DEL_PAGO.topeDelAutopagoMaximo
  return null
}
