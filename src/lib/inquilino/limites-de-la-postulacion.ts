/**
 * Los topes de una postulación y sus frases, los MISMOS del back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/applications/dto/limites-de-la-postulacion.ts`: las
 * tres listas de referencias van a `applications.references_info` (Json) y el
 * back no acepta más de 10 de cada tipo. Hoy el asistente no tiene paso de
 * referencias (T-0025): sólo llegan las que trae el prellenado de una
 * postulación anterior. Si cambia uno, cambia el otro.
 */

export const MAX_REFERENCIAS_POR_TIPO = 10

export const MENSAJES_DE_LA_POSTULACION = {
  arrendadoresMaximos: 'Puedes agregar hasta 10 arrendadores anteriores.',
  laboralesMaximas: 'Puedes agregar hasta 10 referencias laborales.',
  personalesMaximas: 'Puedes agregar hasta 10 referencias personales.',
} as const

const LISTAS = [
  ['previousLandlords', MENSAJES_DE_LA_POSTULACION.arrendadoresMaximos],
  ['employmentReferences', MENSAJES_DE_LA_POSTULACION.laboralesMaximas],
  ['personalReferences', MENSAJES_DE_LA_POSTULACION.personalesMaximas],
] as const

/** Lo que el back rechazaría de las referencias. Vacío = se pueden mandar. */
export function revisarReferencias(referencias: unknown): string[] {
  if (!referencias || typeof referencias !== 'object') return []
  const r = referencias as Record<string, unknown>
  return LISTAS.filter(([clave]) => Array.isArray(r[clave]) && (r[clave] as unknown[]).length > MAX_REFERENCIAS_POR_TIPO).map(
    ([, mensaje]) => mensaje,
  )
}
