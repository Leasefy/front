/**
 * Los INTERESES DE MORA del estado de cuenta: la forma en que llegan y lo que
 * la pantalla necesita preguntarles.
 *
 * ── Por qué existe (2026-09-16) ─────────────────────────────────────────────
 *
 * La prefactura le cobraba al inquilino un interés que ni la cartera ni el
 * estado de cuenta mostraban: «¿cuánto debe?» tenía dos respuestas. Medido en
 * dev ese día sobre la agencia de QA: $546,6 millones de interés sobre $3.003,9
 * millones de cartera, invisibles. El back ahora manda, por contrato, un bloque
 * `intereses` APARTE del capital —Arriendos y Otros conceptos no cambian: siguen
 * siendo lo pactado—, liquidado con la MISMA regla que la prefactura y la
 * cartera. Acá no se calcula un peso: se pinta.
 *
 * ── Por qué los tipos viven acá y no en `@/lib/types/estado-de-cuenta` ──────
 *
 * Son OPCIONALES a propósito: el documento del propietario no los trae (su
 * cuota es un giro, no una deuda que se le cobre tarde), y un back anterior
 * tampoco. Ausente no es «cero intereses»: es «no hay nada que decir de mora».
 */

import type {
  ContratoDelEstadoDeCuenta,
  EstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

/** Un renglón de interés: el de UNA cuota. */
export interface FilaDeInteres {
  cuotaId: string;
  /** `YYYY-MM`. */
  mes: string;
  /** «Intereses de mora sobre Canon de arrendamiento. De … hasta …». */
  concepto: string;
  /** `YYYY-MM-DD`: el vencimiento de la cuota. */
  fechaVencimiento: string;
  /** Hasta hoy, o hasta el último abono si la cuota ya se pagó. */
  diasDeMora: number;
  liquidado: number;
  /** Lo ya abonado a intereses (la ley los pone antes que el capital). */
  abonado: number;
  /** 🔴 Lo que falta. */
  pendiente: number;
  /** `COBRO` = ya liquidado y escrito; `CUOTA` = calculado hoy, crece mañana. */
  origen: 'COBRO' | 'CUOTA' | null;
  /** La cuota ya se pagó, pero se pagó cuando ya estaba en mora. */
  pagadaEnMora: boolean;
}

export interface InteresesDelContrato {
  filas: FilaDeInteres[];
  liquidado: number;
  abonado: number;
  /** 🔴 El interés que falta hoy. */
  pendiente: number;
  /** Lo vencido del contrato, con su mora. */
  pendienteConIntereses: number;
  /** Todo lo que falta del contrato, con la mora. */
  restaPorPagarConIntereses: number;
  /**
   * Cuotas en mora que NO llevan interés, y por qué. `null` cuando no hay
   * ninguna. Un cero sin esto se leería «no hay mora».
   */
  sinInteres: { cuotas: number; motivo: string; sinReglas: boolean } | null;
}

export interface TotalesDeInteres {
  liquidado: number;
  abonado: number;
  pendiente: number;
  pendienteConIntereses: number;
  restaPorPagarConIntereses: number;
  /** Algún contrato tiene mora sin interés porque la agencia no tiene reglas. */
  sinReglas: boolean;
}

/** A dónde se configuran las reglas de mora. Sólo tiene sentido en el panel. */
export const RUTA_DE_REGLAS_DE_MORA =
  '/panel/inmobiliaria/pagos/cartera/reglas-de-mora';

/** El bloque de intereses del contrato, o `null` si el back no mandó ninguno. */
export function interesesDelContrato(
  contrato: ContratoDelEstadoDeCuenta,
): InteresesDelContrato | null {
  return (
    (contrato as ContratoDelEstadoDeCuenta & {
      intereses?: InteresesDelContrato | null;
    }).intereses ?? null
  );
}

/** Los intereses de todo el documento, o `null` si no hay nada de mora. */
export function interesesDelEstado(doc: EstadoDeCuenta): TotalesDeInteres | null {
  return (
    (doc as EstadoDeCuenta & { intereses?: TotalesDeInteres | null })
      .intereses ?? null
  );
}

/**
 * ¿El contrato tiene algo de mora que contar? Filas con interés, o cuotas en
 * mora sin interés con su motivo. Un bloque vacío no se pinta: un título
 * «Intereses de mora» sin nada debajo se lee como un error.
 */
export function hayQueContarIntereses(
  intereses: InteresesDelContrato | null,
): intereses is InteresesDelContrato {
  return Boolean(intereses && (intereses.filas.length > 0 || intereses.sinInteres));
}
