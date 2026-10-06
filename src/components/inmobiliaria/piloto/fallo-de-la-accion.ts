import type { OpcionesDelMensaje } from '@/lib/errores/traductor-de-errores'

/**
 * Los textos del traductor (`mensajeParaLaPersona`) para una acción que el
 * micro declaró en la bandeja o en el cajón del Piloto (02-10-2026).
 *
 * El `label` de la acción ya es un verbo en infinitivo («Tomar caso»,
 * «Aprobar y llamar», «Registrar el envío»): con la primera letra en
 * minúscula sirve de `accion` («No pudimos aprobar y llamar: algo falló de
 * nuestro lado…») y arma el `porDefecto` de un 4xx que no trae nada legible.
 * Sólo la primera letra: un nombre propio dentro del label se respeta.
 */
export function textosDelFallo(label: string): Required<OpcionesDelMensaje> {
  const limpio = label.trim()
  const accion = limpio ? limpio.charAt(0).toLocaleLowerCase('es-CO') + limpio.slice(1) : 'hacer esto'
  return { accion, porDefecto: `No se pudo ${accion}.` }
}
