/**
 * Los topes del pago de un estudio, con las MISMAS cifras y frases que el
 * back (02-10-2026).
 *
 * `valorCop` va a `pagos_de_estudio.valor_cop` (`int4`) y el DTO sólo pedía
 * «mayor que cero»: un valor con ceros de más daba un 500 (P2020). El back ya
 * lo para con una frase; acá se ataja antes de mandar.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/estudios/limites-del-estudio.ts` (y de
 * `@MaxLength(120)` de la referencia en `RegistrarPagoDeEstudioDto`). Si
 * cambia uno, cambia el otro.
 *
 * Ojo: `src/lib/estudio/limites-del-estudio.ts` (en singular) es otro
 * archivo, el de la solicitud del estudio del inquilino.
 */

export const VALOR_MAXIMO_DEL_ESTUDIO_COP = 2_000_000_000
export const MAX_LARGO_REFERENCIA_DEL_PAGO = 120

export const MENSAJES_DEL_ESTUDIO = {
  valorEntero: 'El valor del estudio debe ser un número entero de pesos, sin decimales.',
  valorMinimo: 'El valor del estudio debe ser mayor que cero.',
  valorMaximo: 'El valor del estudio no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
} as const

/** El valor que pagó, revisado como lo revisa el back. `null` = vacío. */
export function revisarValorDelEstudio(valor: number | null): string | undefined {
  if (valor === null) return undefined
  if (!Number.isInteger(valor)) return MENSAJES_DEL_ESTUDIO.valorEntero
  if (valor < 1) return MENSAJES_DEL_ESTUDIO.valorMinimo
  if (valor > VALOR_MAXIMO_DEL_ESTUDIO_COP) return MENSAJES_DEL_ESTUDIO.valorMaximo
  return undefined
}
