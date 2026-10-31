import { PIPELINE_STAGES, type PipelineStage } from '@/lib/types/inmobiliaria';

/**
 * «Postulación» y «Evaluación» son UNA etapa en el tablero (reunión con Juan, 31-10-2026: «fusionar Postulación y
 * Evaluación en una sola etapa, actualmente redundantes»). La base conserva las dos —la sincronización con la
 * postulación sigue escribiendo una u otra—; el tablero, la barra del embudo y «Mover a…» las ven como una sola
 * columna, «Postulación y evaluación».
 */
export function columnaDe(etapa: PipelineStage): PipelineStage {
  return etapa === 'evaluation' ? 'application' : etapa;
}

/** Las columnas del tablero en el orden del embudo (sin «Perdido», que va aparte, ni «Evaluación», que es la misma). */
export const ETAPAS_DEL_TABLERO: readonly PipelineStage[] = PIPELINE_STAGES.filter(
  (s) => s.stage !== 'lost' && s.stage !== 'evaluation',
).map((s) => s.stage);

/** ¿Soltarla ahí es dejarla donde está? */
export function mismaColumna(a: PipelineStage, b: PipelineStage): boolean {
  return columnaDe(a) === columnaDe(b);
}
