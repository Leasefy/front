/**
 * antes-de-postularte — ¿esta persona puede empezar el asistente de /aplicar?
 *
 * 🔴 QA-IA-A (04-10-2026), medido en el laboratorio: el botón «Postularme» de
 * la ficha ya explicaba qué faltaba, pero el asistente de /aplicar (al que se
 * llega por un enlace compartido, el «Ver mi postulación» de otro inmueble o
 * escribiendo la dirección) no miraba nada. Una persona SIN estudio llenaba los
 * cinco pasos y al enviar recibía un 409 que decía «An error occurred». Y sin
 * cuenta, la postulación de invitado entraba sin estudio ni documentos —F-08:
 * «NUNCA se postula sin el estudio de Leasefy»—.
 *
 * Con sesión, la respuesta la da el MISMO veredicto que aplica el back al
 * enviar (`GET /pre-scoring/elegibilidad`, la lectura de
 * `PreScoringEligibilityService`): no hay dos reglas. Si no se puede saber
 * (red caída, error), se deja pasar: el back sigue cuidando la puerta al enviar
 * y bloquear por una duda castiga a quien sí puede.
 */

import { apiClient } from '@/lib/api/client'
import type { MotivoBloqueo } from '@/components/tenant/PostularButton'

export type MotivoDeElegibilidad =
  | 'OK'
  | 'SIN_ESTUDIO'
  | 'ESTUDIO_EN_CURSO'
  | 'NO_ASEGURABLE'
  | 'ESTUDIO_VENCIDO'

export interface Elegibilidad {
  apto: boolean
  motivo: MotivoDeElegibilidad
  topeAprobadoCop: number | null
  elegibleHasta: string | null
}

/** El veredicto del back, o `null` si no se pudo saber (ante la duda, el formulario). */
export async function leerElegibilidad(): Promise<Elegibilidad | null> {
  try {
    const r = await apiClient.get<Elegibilidad>('/pre-scoring/elegibilidad')
    return r && typeof r.apto === 'boolean' ? r : null
  } catch {
    return null
  }
}

/** Qué explicación mostrar antes del asistente. `null` = puede empezar. */
export function motivoPorElegibilidad(e: Elegibilidad | null | undefined): MotivoBloqueo | null {
  if (!e || e.apto) return null
  switch (e.motivo) {
    case 'ESTUDIO_VENCIDO':
      return 'vencida'
    case 'ESTUDIO_EN_CURSO':
      return 'en_proceso'
    case 'NO_ASEGURABLE':
      return 'rechazado'
    case 'SIN_ESTUDIO':
      return 'sin_aprobacion'
    default:
      return null
  }
}
