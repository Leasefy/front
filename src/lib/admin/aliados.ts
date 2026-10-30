/** Los enlaces de los aliados del mes gratis en el admin (`/admin/aliados`, back `/api/v1/admin/alianzas`). */

import type { PillTone } from '@/lib/admin/types'

export interface AlianzaDelAdmin {
  id: string
  codigo: string
  nombre: string
  diasGratis: number
  activa: boolean
  validaHasta: string | null
  maxUsos: number | null
  usos: number
  creadaEn: string
  enlace: string
  vigentes: number
  pagan: number
}

export interface RespuestaDeAlianzas {
  disponible: boolean
  migracion: string | null
  alianzas: AlianzaDelAdmin[]
}

/** De cada 100 que entraron por el aliado, cuántos ya pagan. `null` sin usos. */
export function conversionDelAliado(a: Pick<AlianzaDelAdmin, 'usos' | 'pagan'>): number | null {
  return a.usos > 0 ? (a.pagan / a.usos) * 100 : null
}

/** En qué está el enlace: pausado, vencido, sin cupos o vigente. */
export function estadoDelEnlace(a: Pick<AlianzaDelAdmin, 'activa' | 'validaHasta' | 'maxUsos' | 'usos'>, hoy = new Date()): {
  texto: string
  tono: PillTone
} {
  if (!a.activa) return { texto: 'Pausado', tono: 'muted' }
  if (a.validaHasta && new Date(a.validaHasta) < hoy) return { texto: 'Vencido', tono: 'warn' }
  if (a.maxUsos !== null && a.usos >= a.maxUsos) return { texto: 'Sin cupos', tono: 'warn' }
  return { texto: 'Vigente', tono: 'ok' }
}
