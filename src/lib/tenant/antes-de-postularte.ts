/**
 * antes-de-postularte — qué ofrecerle sobre el estudio a quien llega a /aplicar.
 *
 * 🔴 El estudio de arrendamiento es OPCIONAL (Nico, 04-10-2026: «el estudio es
 * opcional, no es obligatorio»; reemplaza F-08 y lo que se hizo en PO-01/PO-02
 * la noche del 04-10). Antes esto decidía si la persona PODÍA empezar el
 * asistente; ahora sólo decide qué se le OFRECE (`OfertaDelEstudio`), nunca un
 * freno: se postula igual y la inmobiliaria ve la postulación marcada.
 *
 * Con sesión, el dato lo da el MISMO veredicto del back
 * (`GET /pre-scoring/elegibilidad`). Si no se puede saber (red caída, error),
 * no se ofrece nada: no se le inventa un estado a nadie.
 */

import { apiClient } from '@/lib/api/client'
import type { OfertaDelEstudio } from '@/components/tenant/PostularButton'

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

/** El veredicto del back, o `null` si no se pudo saber. */
export async function leerElegibilidad(): Promise<Elegibilidad | null> {
  try {
    const r = await apiClient.get<Elegibilidad>('/pre-scoring/elegibilidad')
    return r && typeof r.apto === 'boolean' ? r : null
  } catch {
    return null
  }
}

/** Qué ofrecerle sobre el estudio. `null` = tiene estudio vigente (o no se sabe). */
export function ofertaPorElegibilidad(e: Elegibilidad | null | undefined): OfertaDelEstudio | null {
  if (!e || e.apto) return null
  switch (e.motivo) {
    case 'ESTUDIO_VENCIDO':
      return 'vencido'
    case 'ESTUDIO_EN_CURSO':
      return 'en_curso'
    case 'NO_ASEGURABLE':
      return 'sin_respaldo'
    case 'SIN_ESTUDIO':
      return 'sin_estudio'
    default:
      return null
  }
}
