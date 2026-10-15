/**
 * afirmaciones.ts — la clase de una afirmación de Naira y las bandas de probabilidad con que se pinta una hipótesis
 * (Fase 13, plan 13-02; D13-10, CLM-01, CLM-03, UI-SPEC §6.4-§6.5).
 *
 * Las clases (`CLAIM_CLASSES`), los id de banda (`IDS_DE_BANDA`) y la forma de la cita (`NairaSignalCitation`: texto,
 * clase e hipótesis con banda, alternativa y discriminador) SALEN del espejo del contrato de 13-01 (D13-23, G8): acá no
 * se redeclaran. Lo único propio del front es lo que pinta de cada banda: `min`, `max` y `termino`, copiados fila por
 * fila del ADR-005 del agente (un test los compara contra el ADR en disco).
 *
 * La clase JAMÁS se deriva del texto: la deriva el linter del agente (09-03, RESEARCH T5) y llega en un campo. Una cita
 * con `claimClass: null` (la fila no la trae: la parte de 09-06 sigue pendiente) cae en fail-closed (C5) en
 * `OracionesCausales`. Este archivo no busca palabras en ningún texto.
 *
 * Los términos de las bandas son vocabulario del ADR, en español siempre (como los textos del agente, CONTEXT Q12): no
 * son copy de i18n.
 */

import { CLAIM_CLASSES, IDS_DE_BANDA, type NairaSignalCitation } from '@/lib/api/naira/contrato'

export const CLASES_DE_AFIRMACION = CLAIM_CLASSES
export type ClaseDeAfirmacion = (typeof CLAIM_CLASSES)[number]

export type BandaId = (typeof IDS_DE_BANDA)[number]

// fuente: vocabulario-probabilidad.ts:49-57 (ADR-005 :55-65)
// estado: EXISTE
export const BANDAS_DE_PROBABILIDAD = [
  { id: 'casi_imposible', min: 1, max: 5, termino: 'casi imposible' },
  { id: 'muy_poco_probable', min: 5, max: 20, termino: 'muy poco probable' },
  { id: 'poco_probable', min: 20, max: 45, termino: 'poco probable' },
  { id: 'tan_probable_como_no', min: 45, max: 55, termino: 'tan probable como no' },
  { id: 'probable', min: 55, max: 80, termino: 'probable' },
  { id: 'muy_probable', min: 80, max: 95, termino: 'muy probable' },
  { id: 'casi_seguro', min: 95, max: 99, termino: 'casi seguro' },
] as const satisfies readonly { readonly id: BandaId; readonly min: number; readonly max: number; readonly termino: string }[]

/** Si IDS_DE_BANDA gana una banda que esta tabla no tiene, esto deja de compilar. */
type IdsDeLaTabla = (typeof BANDAS_DE_PROBABILIDAD)[number]['id']
type Afirmar<T extends true> = T
type _LaTablaCubreElContrato = Afirmar<BandaId extends IdsDeLaTabla ? true : false>

/** El render EXACTO del ADR-005: `<termino> (<min>-<max> %)`. */
export function renderizarBanda(id: BandaId): string {
  const banda = BANDAS_DE_PROBABILIDAD.find((b) => b.id === id)
  // Inalcanzable: la tabla cubre IDS_DE_BANDA (tipo de arriba) y el esquema del contrato solo deja pasar esos id.
  if (banda === undefined) return ''
  return banda.termino + ' (' + banda.min + '-' + banda.max + ' %)'
}

/** La hipótesis de una cita (E13-3): banda, alternativa y discriminador, sin driver. */
export type HipotesisDeLaCita = NonNullable<NairaSignalCitation['hipotesis']>
/** = EntityRef del agente: un tipo y un id, nunca el nombre de una persona. */
export type EntidadDeHipotesis = Extract<HipotesisDeLaCita['alternativa'], { kind: 'driver' }>['entidad']
/** Una oración causal TAL CUAL la trae el contrato. */
export type OracionCausal = NairaSignalCitation
