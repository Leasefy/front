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
 * ── Por qué los tipos viven acá ─────────────────────────────────────────────
 *
 * Son opcionales a propósito: un back anterior no los manda, y «no vino el
 * interés» no es «el interés es cero». Donde no vienen, la celda dice un guion,
 * nunca un $0.
 */

/** El interés de una fila, tal como lo manda el back (`InteresEnPantalla`). */
export interface InteresDeMora {
  /** Lo liquidado: interés diario y gasto administrativo de cobranza. */
  liquidadoCop: number;
  /** Lo ya abonado a intereses (la ley los pone antes que el capital). */
  abonadoCop: number;
  /** 🔴 Lo que falta de interés hoy. */
  pendienteCop: number;
  /** `COBRO` = ya liquidado y escrito; `CUOTA` = calculado hoy, crece mañana. */
  origen: 'COBRO' | 'CUOTA' | null;
  /** El capital ya se pagó, pero se pagó cuando la cuota ya era cartera. */
  pagadaEnMora: boolean;
  diasDeMora: number;
  /** Por qué está en mora y no lleva interés. `null` si lleva o no es cartera. */
  motivo: string | null;
  /** El motivo es que la inmobiliaria no tiene reglas de mora activas. */
  sinReglas: boolean;
}

/** Una fila cualquiera de cartera, con lo que el back le agregó de mora. */
export type ConInteres<T> = T & {
  interes?: InteresDeMora;
  totalConInteresCop?: number;
};

/** A dónde se configuran las reglas de mora. */
export const RUTA_DE_REGLAS_DE_MORA =
  '/panel/inmobiliaria/pagos/cartera/reglas-de-mora';

/** Las palabras. En castellano de Colombia, con tuteo. */
export const TEXTO_DE_MORA = {
  columnaIntereses: 'Intereses',
  /**
   * En «Cartera por concepto» ya puede haber columnas «Intereses de mora» y
   * «Gasto administrativo»: las de un cobro que los dejó escritos en sus
   * líneas. La columna nueva es otra cosa —lo que la regla liquida hoy— y se
   * llama distinto para que nadie las sume dos veces.
   */
  columnaMoraLiquidadaHoy: 'Mora liquidada hoy',
  columnaTotal: 'Total',
  sinDato: 'El servidor no mandó el interés de esta cuota',
  pagadaEnMora: 'Se pagó en mora',
  abonado: (monto: string) => `abonó ${monto}`,
  sinReglas: 'Sin reglas de mora',
  configurar: 'Configúralas',
  sinInteres: 'Sin interés',
  intereses: 'Intereses de mora',
  masIntereses: (monto: string) => `+ ${monto} de intereses`,
  conIntereses: (monto: string) => `${monto} con intereses`,
  configurarReglas: 'Configurar las reglas de mora',
  explicacion:
    'Van aparte del capital. Incluyen el interés diario y el gasto administrativo de cobranza que fijan tus reglas de mora, y crecen cada día mientras la cuota siga en mora.',
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
