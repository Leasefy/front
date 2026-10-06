/**
 * Los topes de una regla de mora, con las MISMAS frases que el back
 * (02-10-2026, tanda 2 del sistema de errores).
 *
 * `reglas_de_mora.valor` es `Decimal(12,4)` (cabe hasta 99.999.999,9999) y
 * `tope_cop` es `int4`. Un valor más grande daba un 500 de Postgres; el editor
 * lo ataja antes de enviar y el back lo rechaza igual (400 en su campo).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/cobros/reglas-de-mora/limites-de-la-regla-de-mora.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 */

export const VALOR_MAXIMO_DE_LA_REGLA = 99_999_999
export const TOPE_MAXIMO_DE_LA_REGLA_COP = 2_000_000_000

export const MENSAJES_DE_LA_REGLA_DE_MORA = {
  valorMaximo: 'El valor de la regla no puede pasar de 99.999.999. Revisa que no sobren ceros.',
  topeMaximo: 'El tope no puede pasar de $2.000.000.000. Revisa que no sobren ceros.',
} as const
