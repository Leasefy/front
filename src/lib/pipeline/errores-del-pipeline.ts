/**
 * Lo que se le dice a la persona cuando una tarjeta del pipeline no se pudo
 * mover (02-10-2026).
 *
 * Antes el toast pintaba `error.message` crudo: un 500 llegaba como «Internal
 * server error» y sin respuesta salía «Failed to fetch». Ahora pasa por el
 * traductor: un 400 dice qué está mal (el motivo de pérdida demasiado largo,
 * con la frase del back), un 409 la transición que no se permite, un 5xx que
 * es nuestro con la referencia, y «conexión» sólo si no hubo respuesta.
 */
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

export const TITULO_AL_NO_MOVER_EL_LEAD = 'No se pudo mover el lead'

export function mensajeAlNoMoverElLead(error: unknown): string {
  return mensajeParaLaPersona(error, {
    porDefecto: 'La tarjeta volvió a su etapa anterior. Prueba de nuevo.',
    accion: 'mover el lead',
  })
}
