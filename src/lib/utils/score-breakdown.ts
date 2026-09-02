/**
 * Score breakdown partitioning.
 *
 * The scoring micro returns `score_breakdown` with SEVEN entries, but only
 * five are real dimensions of the final score (weights sum 100):
 * credito (30), identidad (5), solvencia (40), estabilidad_laboral (15),
 * consistencia_cruzada (10).
 *
 * `bureau` and `asegurabilidad` are SUB-COMPONENTS of `credito`
 * (credito = (bureau + asegurabilidad) / 2). Their weights are internal to
 * that composition — rendering them alongside the main dimensions double
 * counts credit and makes the grid sum 130%.
 */

import type { ScoreBreakdown, ScoreBreakdownFactor } from '@/lib/api/applications.types';

/** Sub-components of `credito` — never rendered in the main dimensions grid. */
export const CREDIT_SUBCOMPONENT_KEYS = ['bureau', 'asegurabilidad'] as const;

/**
 * Desempate estable cuando dos dimensiones pesan lo mismo; las desconocidas
 * van al final. El orden principal es por PESO — ver `partitionScoreBreakdown`.
 */
const MAIN_DIMENSION_ORDER = [
  'credito',
  'identidad',
  'solvencia',
  'estabilidad_laboral',
  'consistencia_cruzada',
];

/** Bureau `source` emitted when the external bureau could not be reached. */
export const BUREAU_UNAVAILABLE_SOURCE = 'experian_via_fianly_unavailable';

export interface PartitionedScoreBreakdown {
  /** Real score dimensions (weights sum 100), in stable display order. */
  main: Array<[string, ScoreBreakdownFactor]>;
  /** Sub-components nested under the credito card, or null when absent. */
  creditDetail: {
    bureau: ScoreBreakdownFactor | null;
    asegurabilidad: ScoreBreakdownFactor | null;
    bureauUnavailable: boolean;
  } | null;
}

export function partitionScoreBreakdown(breakdown: ScoreBreakdown): PartitionedScoreBreakdown {
  const subKeys = CREDIT_SUBCOMPONENT_KEYS as readonly string[];

  /*
   * De mayor a menor PESO.
   *
   * El orden fijo anterior abría con `credito`, que pesa 30 pero suele ser el
   * puntaje más bajo —y cuando el buró no responde baja a 13—, así que la
   * lista empezaba con lo peor y daba una impresión más dura que el total. Por
   * peso, arriba queda lo que de verdad mueve el score: con solvencia en 40 y
   * en 100, un crédito flojo pesa lo que pesa y se lee en su lugar.
   *
   * A peso igual manda el orden conocido, y las dimensiones nuevas van al
   * final: sin desempate estable, dos llaves con el mismo peso se cruzarían
   * entre renders.
   */
  const main = Object.entries(breakdown)
    .filter(([key]) => !subKeys.includes(key))
    .sort(([a, fa], [b, fb]) => {
      if (fb.weight !== fa.weight) return fb.weight - fa.weight;
      const ia = MAIN_DIMENSION_ORDER.indexOf(a);
      const ib = MAIN_DIMENSION_ORDER.indexOf(b);
      return (
        (ia === -1 ? MAIN_DIMENSION_ORDER.length : ia) -
        (ib === -1 ? MAIN_DIMENSION_ORDER.length : ib)
      );
    });

  const bureau = breakdown.bureau ?? null;
  const asegurabilidad = breakdown.asegurabilidad ?? null;

  const creditDetail =
    bureau || asegurabilidad
      ? {
          bureau,
          asegurabilidad,
          bureauUnavailable: bureau?.source === BUREAU_UNAVAILABLE_SOURCE,
        }
      : null;

  return { main, creditDetail };
}
