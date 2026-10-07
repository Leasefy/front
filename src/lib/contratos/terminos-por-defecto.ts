/**
 * Los valores por defecto de «Crear contrato», leídos de la inmobiliaria
 * (QA-CONT C-13, Nico 03-10-2026: «los de la inmobiliaria»).
 *
 * Antes el formulario abría con el día de pago en 1, el prorrateo apagado y el
 * plazo vacío para TODAS las inmobiliarias, aunque la suya generara el canon el
 * 1 con el primer mes prorrateado. La regla:
 *
 *  · día de pago → `Agency.paymentDueDay` (1 a 28);
 *  · ¿se prorratea? → `Agency.prorratearPrimerMes` cuando el back lo publique
 *    (hoy el prorrateo vive sólo en cada contrato: sin el dato, el formulario
 *    no inventa y deja el de siempre, apagado);
 *  · días de plazo → NO se copian al contrato: vacío ya quiere decir «los de la
 *    inmobiliaria» y así un cambio de la inmobiliaria le llega al contrato. Se
 *    devuelven para decir cuántos son.
 *
 * `null` = no se pudo saber (sin permiso para leer la configuración, o todavía
 * cargando): el formulario se queda con lo de siempre.
 */

export interface TerminosPorDefecto {
  diaDePago: number | null;
  prorratear: boolean | null;
  diasDePlazo: number | null;
}

/** Lo mínimo de la inmobiliaria que se lee (la fila de `GET /inmobiliaria/config`). */
export interface AgenciaConTerminos {
  paymentDueDay?: number | null;
  diasDePlazo?: number | null;
  /** Lo publica el back cuando la inmobiliaria tiene un modo de cobro por defecto. */
  prorratearPrimerMes?: boolean | null;
}

function entero(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

export function terminosPorDefectoDeLaAgencia(
  agencia: AgenciaConTerminos | null | undefined,
): TerminosPorDefecto | null {
  if (!agencia) return null;
  return {
    diaDePago: entero(agencia.paymentDueDay, 1, 28),
    prorratear: typeof agencia.prorratearPrimerMes === 'boolean' ? agencia.prorratearPrimerMes : null,
    diasDePlazo: entero(agencia.diasDePlazo, 0, 365),
  };
}
