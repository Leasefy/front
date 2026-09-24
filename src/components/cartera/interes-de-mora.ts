/**
 * El INTERÉS DE MORA en la cartera: la forma en que llega del back y las
 * palabras con que se dice.
 *
 * ── Por qué existe (2026-09-16) ─────────────────────────────────────────────
 *
 * La prefactura le cobraba al inquilino un interés que la cartera no mostraba,
 * así que «¿cuánto debe?» tenía dos respuestas. Medido en dev ese día, en la
 * agencia de QA: 885 cuotas en cartera, $3.003,9 M de capital y $546,6 M de
 * interés que no salían en ninguna pantalla. El back ahora manda, por fila,
 * `interes` —liquidado con la MISMA regla que la prefactura y el estado de
 * cuenta— y `totalConInteresCop`. Acá no se calcula un peso: se pinta.
 *
 * Capital e interés van SIEMPRE por separado. Los cajones (por vencer, vencido
 * en plazo, cartera) y los tramos por edad siguen midiendo capital.
 *
 * Los tipos viven en `@/lib/types/inmobiliaria` (`InteresDeMora`,
 * `ConInteres`), al lado de las filas que los traen, y las palabras en
 * `locales/*.json` bajo `cartera.interes` (guardia: `claves-cartera.test.ts`).
 * Acá quedan las preguntas que las pantallas le hacen a una fila.
 */

import type { ConInteres, InteresDeMora } from '@/lib/types/inmobiliaria';

/** A dónde se configuran las reglas de mora. */
export const RUTA_DE_REGLAS_DE_MORA =
  '/panel/inmobiliaria/pagos/cartera/reglas-de-mora';

/**
 * Las claves de las palabras, en `cartera.interes`. Con `t()`: la cartera vive
 * dentro del panel y tiene proveedor de idioma.
 */
export const CLAVE_DE_MORA = {
  columnaIntereses: 'cartera.interes.columnaIntereses',
  columnaMoraLiquidadaHoy: 'cartera.interes.columnaMoraLiquidadaHoy',
  columnaTotal: 'cartera.interes.columnaTotal',
  sinDato: 'cartera.interes.sinDato',
  pagadaEnMora: 'cartera.interes.pagadaEnMora',
  abonado: 'cartera.interes.abonado',
  sinReglas: 'cartera.interes.sinReglas',
  configurar: 'cartera.interes.configurar',
  sinInteres: 'cartera.interes.sinInteres',
  intereses: 'cartera.interes.intereses',
  masIntereses: 'cartera.interes.masIntereses',
  conIntereses: 'cartera.interes.conIntereses',
  configurarReglas: 'cartera.interes.configurarReglas',
  explicacion: 'cartera.interes.explicacion',
} as const;

/** El interés de la fila, si el back lo mandó. */
export function interesDe<T extends object>(fila: T): InteresDeMora | null {
  return (fila as ConInteres<T>).interes ?? null;
}

/** Lo que falta de interés, o 0 si el back no lo mandó. */
export function interesPendiente<T extends object>(fila: T): number {
  return interesDe(fila)?.pendienteCop ?? 0;
}

/**
 * Capital + interés de la fila. Si el back no mandó el total, se suma lo que
 * vino: nunca se inventa un interés que no llegó.
 */
export function totalConInteres<T extends object>(
  fila: T,
  capital: number,
): number {
  return (fila as ConInteres<T>).totalConInteresCop ?? capital + interesPendiente(fila);
}

/** La suma de intereses de un puñado de filas. */
export function sumarIntereses<T extends object>(filas: readonly T[]): number {
  return filas.reduce((s, f) => s + interesPendiente(f), 0);
}

/** ¿Alguna fila vino sin reglas de mora? Es lo que decide ofrecer configurarlas. */
export function faltanReglasDeMora<T extends object>(filas: readonly T[]): boolean {
  return filas.some((f) => interesDe(f)?.sinReglas === true);
}
