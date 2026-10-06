/**
 * El tope del texto que acompaña una decisión sobre una postulación
 * (02-10-2026): el mensaje al aprobar, el motivo del rechazo y lo que se pide
 * al solicitar información.
 *
 * 🔁 Espejo de `@MaxLength(1000)` en `ApproveCandidateDto.message`,
 * `RejectCandidateDto.reason` y `RequestInfoDto.message`
 * (`back/src/landlord/dto/`). El campo no deja escribir más, así que el back
 * no tiene por qué rechazarlo.
 */
export const MAX_LARGO_DEL_TEXTO_AL_CANDIDATO = 1000
