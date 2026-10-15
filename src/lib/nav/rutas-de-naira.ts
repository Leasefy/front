/**
 * rutas-de-naira.ts — el registro de las rutas de Naira en el panel (Fase 13, plan 13-03; D13-1, D13-1′, E13-1).
 *
 * Es la ÚNICA fuente de las rutas de Naira fuera de sus páginas (`src/app/panel/inmobiliaria/reportes/naira/**`). Vive
 * en `src/lib/nav/` y no en `src/lib/naira/` a propósito: los puros, hooks y componentes de Naira no conocen dónde está
 * montado su workspace (reciben el enlace por props). Si la ubicación cambia, cambian este archivo, las páginas y el
 * registro de navegación; nada más.
 *
 * Las cuatro formas de E13-1(a) —las que el correo y el WhatsApp del briefing enlazan (10-04, `RUTAS_DEL_PANEL`)—:
 *   · el briefing de hoy            B
 *   · el briefing de un día         B?dia=YYYY-MM-DD
 *   · la ficha de una señal         B/senales/<promocionId>
 *   · la pregunta semanal del lunes B?dia=<lunes>#recall
 * con B = RUTA_DE_NAIRA. Todo parámetro entra codificado: un id con `/`, `?`, `#` o `..` no puede cambiar la ruta.
 * Validar el día (forma y día real) es del llamador (`esDiaValido` de src/lib/naira/briefing-y-senal.ts).
 *
 * Sin imports: es un registro. 13-04..13-07 AGREGAN acá su función de ruta si tienen deep links (p. ej. la de un loop).
 */

export const RUTA_DE_NAIRA = '/panel/inmobiliaria/reportes/naira'

/** El ancla de la pregunta semanal dentro del briefing del lunes. */
export const ANCLA_DEL_RECALL = 'recall'

/** Sin día (o con un día vacío) ⇒ el briefing de hoy; con día ⇒ `?dia=` codificado. */
export function rutaDelBriefing(dia?: string): string {
  if (dia === undefined || dia === '') return RUTA_DE_NAIRA
  return RUTA_DE_NAIRA + '?dia=' + encodeURIComponent(dia)
}

/** La ficha N4 de una señal congelada. */
export function rutaDeLaSenal(promocionId: string): string {
  return RUTA_DE_NAIRA + '/senales/' + encodeURIComponent(promocionId)
}

// + 13-04 (seguimiento)
/** La pestaña Seguimiento (`B/seguimiento`). */
export const RUTA_DEL_SEGUIMIENTO = `${RUTA_DE_NAIRA}/seguimiento`

/** La bitácora de un loop, con el id codificado (un id vacío lo filtra el llamador). */
export function rutaDelLoop(loopId: string): string {
  return `${RUTA_DEL_SEGUIMIENTO}/${encodeURIComponent(loopId)}`
}

/** El briefing del lunes con el ancla de la pregunta semanal. */
export function rutaDelRecall(lunes: string): string {
  return rutaDelBriefing(lunes) + '#' + ANCLA_DEL_RECALL
}

// + 13-05 (aprobaciones)
/** La pestaña Aprobaciones (`B/aprobaciones`). */
export const RUTA_DE_APROBACIONES = `${RUTA_DE_NAIRA}/aprobaciones`

/** La ficha de una propuesta, con el id codificado (un id vacío lo filtra el llamador). */
export function rutaDeLaPropuesta(proposalId: string): string {
  return `${RUTA_DE_APROBACIONES}/${encodeURIComponent(proposalId)}`
}

// + 13-07 (memoria)

/** La pestaña «Qué cree Naira» (B/memoria). */
export const RUTA_DE_LA_MEMORIA = `${RUTA_DE_NAIRA}/memoria`

/** La pestaña de la memoria con sus filtros en la URL: solo los elegidos, codificados, en orden (capa y luego procedencia). */
export function rutaDeLaMemoria(filtros?: { readonly capa: string; readonly procedencia: string }): string {
  if (filtros === undefined) return RUTA_DE_LA_MEMORIA
  const partes: string[] = []
  if (filtros.capa !== 'todas') partes.push('capa=' + encodeURIComponent(filtros.capa))
  if (filtros.procedencia !== 'todas') partes.push('procedencia=' + encodeURIComponent(filtros.procedencia))
  return partes.length === 0 ? RUTA_DE_LA_MEMORIA : RUTA_DE_LA_MEMORIA + '?' + partes.join('&')
}
