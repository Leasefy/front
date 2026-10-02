/**
 * La fecha de una visita, validada con las MISMAS reglas y frases que el back
 * (02-10-2026, sistema de errores).
 *
 * `PropertyVisit.visitDate` es `@db.Date`: acepta años absurdos (0001, 99999)
 * y JavaScript los convierte a medias. El DTO del back (`date` al crear,
 * `newDate` al reprogramar) exige un día real del calendario entre el año 2000
 * y el 2100; acá se ataja ANTES de mandar, con la misma frase.
 *
 * 🔁 Espejo de los límites de `back/src/visits/dto/` (`date` / `newDate`):
 * mismos números y mismas frases. Si cambia uno, cambia el otro.
 */

import { esDiaDelCalendario } from '@/lib/onboarding/preferencias-del-inquilino'

export const FECHA_DE_VISITA_DESDE = '2000-01-01'
export const FECHA_DE_VISITA_HASTA = '2100-12-31'

export const MENSAJES_DE_LA_VISITA = {
  fechaDeVisita: 'Elige una fecha de visita válida.',
  fechaDeVisitaFueraDeRango: 'La fecha de la visita debe estar entre el año 2000 y el 2100.',
} as const

/** Qué tiene de malo la fecha de la visita, o `null` si se puede mandar. */
export function revisarFechaDeVisita(valor: string): string | null {
  if (!esDiaDelCalendario(valor)) return MENSAJES_DE_LA_VISITA.fechaDeVisita
  const dia = valor.trim().slice(0, 10)
  if (dia < FECHA_DE_VISITA_DESDE || dia > FECHA_DE_VISITA_HASTA) {
    return MENSAJES_DE_LA_VISITA.fechaDeVisitaFueraDeRango
  }
  return null
}
