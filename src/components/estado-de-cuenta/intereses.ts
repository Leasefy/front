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
 * Los tipos viven en `@/lib/types/estado-de-cuenta`, al lado del documento
 * que los trae; acá quedan las preguntas que la pantalla les hace.
 */

import type {
  ContratoDelEstadoDeCuenta,
  EstadoDeCuenta,
  InteresesDelContrato,
  TotalesDeInteres,
} from '@/lib/types/estado-de-cuenta';

/** A dónde se configuran las reglas de mora. Sólo tiene sentido en el panel. */
export const RUTA_DE_REGLAS_DE_MORA =
  '/panel/inmobiliaria/pagos/cartera/reglas-de-mora';

/** El bloque de intereses del contrato, o `null` si el back no mandó ninguno. */
export function interesesDelContrato(
  contrato: ContratoDelEstadoDeCuenta,
): InteresesDelContrato | null {
  return contrato.intereses ?? null;
}

/** Los intereses de todo el documento, o `null` si no hay nada de mora. */
export function interesesDelEstado(doc: EstadoDeCuenta): TotalesDeInteres | null {
  return doc.intereses ?? null;
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
