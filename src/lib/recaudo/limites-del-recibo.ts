/**
 * Los topes del recibo de caja, validados con las MISMAS reglas y frases que
 * el back (02-10-2026, tanda 2 del sistema de errores).
 *
 * `recibos_de_caja.valor_cop` es `int4` (tope 2.147.483.647). Un cero de más
 * en caja llegaba a Postgres y salía como un 500; ahora el modal lo ataja
 * ANTES de enviar, con la frase del back, y el back lo rechaza igual si
 * llegara (400 `DATOS_INVALIDOS` en `valorCop`).
 *
 * 🔁 Espejo de `back/src/inmobiliaria/recibos-de-caja/dto/limites-del-recibo.ts`:
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 */

export const VALOR_MAXIMO_DEL_RECIBO_COP = 2_000_000_000
/** El motivo de anular un recibo (`recibos_de_caja.motivo_anulacion`). */
export const MOTIVO_DE_ANULAR_MINIMO = 5
export const MOTIVO_DE_ANULAR_MAXIMO = 300

export const MENSAJES_DEL_RECIBO = {
  valorMaximo: 'El valor del pago no puede pasar de $\u00a02.000.000.000. Revisa que no sobren ceros.',
  motivoCorto: 'Escribe el motivo de la anulación (al menos 5 caracteres).',
  motivoLargo: 'El motivo de la anulación puede tener hasta 300 caracteres.',
} as const

/** El valor supera lo que cabe en un recibo: casi siempre, un cero de más. */
export function superaElTopeDelRecibo(valorCop: number): boolean {
  return Number.isFinite(valorCop) && valorCop > VALOR_MAXIMO_DEL_RECIBO_COP
}
