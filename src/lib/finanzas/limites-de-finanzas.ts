/**
 * Los topes de finanzas que una persona escribe, y sus frases (02-10-2026).
 * ESPEJO de `back/src/inmobiliaria/finanzas/dto/limites-de-finanzas.ts`: mismos
 * números y MISMAS frases. Lo que el back rechaza con un 400 en su campo se
 * ataja acá antes de enviar. Si cambias algo acá, cámbialo allá.
 *
 * · El valor presupuestado es `int4` y PUEDE SER NEGATIVO (un rubro de costo):
 *   se topa por los dos lados en ±$2.000.000.000.
 * · La tasa de usura: mayor que cero y hasta 500 % efectivo anual.
 *
 * Los costos de la plata (GMF y pasarela) se escriben en Configuración, que no
 * es de este módulo: su espejo vive allá.
 */

export const VALOR_MAXIMO_DEL_PRESUPUESTO_COP = 2_000_000_000;
export const USURA_MINIMA_PCT = 0.001;
export const USURA_MAXIMA_PCT = 500;
/** `GuardarUsuraDto.fuente` y `GuardarPresupuestoDto.rubro` (back). */
export const LARGO_MAXIMO_DE_LA_FUENTE = 200;
export const LARGO_MAXIMO_DEL_RUBRO = 40;

export const MENSAJES_DE_FINANZAS = {
  presupuestoEntero: 'El valor presupuestado va en pesos enteros, sin decimales.',
  presupuestoFueraDeRango:
    'El valor presupuestado no puede pasar de $\u00a02.000.000.000 (ni de -$\u00a02.000.000.000). Revisa que no sobren ceros.',
  usuraMinima: 'La tasa de usura tiene que ser mayor que cero.',
  usuraMaxima:
    'La tasa de usura no puede pasar del 500 % efectivo anual. Revisa que no sobren ceros.',
} as const;

/** 🔁 El problema del valor presupuestado, con la frase del back. `null` = está bien. */
export function problemaDelPresupuesto(valorCop: number): string | null {
  if (!Number.isFinite(valorCop)) return null;
  if (!Number.isInteger(valorCop)) return MENSAJES_DE_FINANZAS.presupuestoEntero;
  if (Math.abs(valorCop) > VALOR_MAXIMO_DEL_PRESUPUESTO_COP) {
    return MENSAJES_DE_FINANZAS.presupuestoFueraDeRango;
  }
  return null;
}

/** 🔁 El problema de la tasa de usura, con la frase del back. `null` = está bien. */
export function problemaDeLaUsura(efectivaAnualPct: number): string | null {
  if (!Number.isFinite(efectivaAnualPct)) return null;
  if (efectivaAnualPct < USURA_MINIMA_PCT) return MENSAJES_DE_FINANZAS.usuraMinima;
  if (efectivaAnualPct > USURA_MAXIMA_PCT) return MENSAJES_DE_FINANZAS.usuraMaxima;
  return null;
}
