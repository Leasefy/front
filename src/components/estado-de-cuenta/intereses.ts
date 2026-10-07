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

/**
 * El bloque de intereses del contrato, o `null` si el back no mandó ninguno.
 *
 * 🔴 CR-31 (COLA-FRONT, 04-10): una cuota `plazoSinFijar` no corre interés
 * (Nico: «Vencida», sin mora). Si el back todavía manda un renglón de interés
 * para ella (el liquidado de un cobro viejo), no se pinta ni se suma: se le
 * quita al bloque con su plata. Cuando el back lo mande en cero, esto no hace
 * nada.
 */
export function interesesDelContrato(
  contrato: ContratoDelEstadoDeCuenta,
): InteresesDelContrato | null {
  const intereses = contrato.intereses ?? null;
  if (!intereses) return null;
  const sinPlazo = new Set(
    [...contrato.secciones.arriendos, ...contrato.secciones.otrosConceptos]
      .filter((f) => f.plazoSinFijar === true && f.cuotaId)
      .map((f) => f.cuotaId as string),
  );
  if (sinPlazo.size === 0) return intereses;
  const quitadas = intereses.filas.filter((f) => sinPlazo.has(f.cuotaId));
  if (quitadas.length === 0) return intereses;
  const suma = (campo: 'liquidado' | 'abonado' | 'pendiente') =>
    quitadas.reduce((s, f) => s + (f[campo] ?? 0), 0);
  const pendiente = suma('pendiente');
  return {
    ...intereses,
    filas: intereses.filas.filter((f) => !sinPlazo.has(f.cuotaId)),
    liquidado: intereses.liquidado - suma('liquidado'),
    abonado: intereses.abonado - suma('abonado'),
    pendiente: intereses.pendiente - pendiente,
    pendienteConIntereses: intereses.pendienteConIntereses - pendiente,
    restaPorPagarConIntereses: intereses.restaPorPagarConIntereses - pendiente,
  };
}

/**
 * Los intereses de todo el documento, o `null` si no hay nada de mora. Sin lo
 * de las cuotas `plazoSinFijar` (CR-31, ver `interesesDelContrato`).
 */
export function interesesDelEstado(doc: EstadoDeCuenta): TotalesDeInteres | null {
  const totales = doc.intereses ?? null;
  if (!totales) return null;
  let liquidado = 0;
  let abonado = 0;
  let pendiente = 0;
  for (const c of doc.contratos) {
    const original = c.intereses ?? null;
    const sinLoQueNoCorre = interesesDelContrato(c);
    if (!original || !sinLoQueNoCorre || original === sinLoQueNoCorre) continue;
    liquidado += original.liquidado - sinLoQueNoCorre.liquidado;
    abonado += original.abonado - sinLoQueNoCorre.abonado;
    pendiente += original.pendiente - sinLoQueNoCorre.pendiente;
  }
  if (liquidado === 0 && abonado === 0 && pendiente === 0) return totales;
  return {
    ...totales,
    liquidado: totales.liquidado - liquidado,
    abonado: totales.abonado - abonado,
    pendiente: totales.pendiente - pendiente,
    pendienteConIntereses: totales.pendienteConIntereses - pendiente,
    restaPorPagarConIntereses: totales.restaPorPagarConIntereses - pendiente,
  };
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
