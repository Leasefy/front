/**
 * Los topes de una oportunidad del pipeline, con las MISMAS cifras y frases
 * que el back (02-10-2026).
 *
 * Las columnas de `pipeline_items` son `VarChar(n)`: un nombre de 300 letras o
 * un motivo de pérdida largo llegaban a Prisma y volvían como 500. El back ya
 * los para con una frase por campo; acá se atajan antes de mandar.
 *
 * 🔁 Espejo de `back/src/inmobiliaria/pipeline/dto/limites-del-pipeline.ts`.
 * Si cambia uno, cambia el otro.
 */

export const MAX_LARGO_NOMBRE_DEL_CANDIDATO = 200
export const MAX_LARGO_CORREO_DEL_CANDIDATO = 255
export const MAX_LARGO_TELEFONO_DEL_CANDIDATO = 20
export const MAX_LARGO_MOTIVO_DE_PERDIDA = 500
export const MAX_LARGO_PROXIMA_ACCION = 500

export const MENSAJES_DEL_PIPELINE = {
  nombreLargo: 'El nombre puede tener hasta 200 caracteres.',
  correoLargo: 'El correo puede tener hasta 255 caracteres.',
  telefonoLargo: 'El teléfono puede tener hasta 20 caracteres.',
  motivoLargo: 'El motivo puede tener hasta 500 caracteres.',
  proximaAccionLarga: 'La próxima acción puede tener hasta 500 caracteres.',
} as const

/** El motivo de pérdida, revisado como lo revisa el back (`MoveStageDto`). */
export function revisarMotivoDePerdida(motivo: string): string | undefined {
  return motivo.trim().length > MAX_LARGO_MOTIVO_DE_PERDIDA ? MENSAJES_DEL_PIPELINE.motivoLargo : undefined
}
