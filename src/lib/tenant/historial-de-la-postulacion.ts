'use client'

/**
 * historial-de-la-postulacion — lo que de verdad pasó con la postulación,
 * leído de `GET /applications/:id/timeline` (los eventos que guarda el back).
 *
 * 🔴 QA-IA-A (04-10-2026), medido en el laboratorio: la pantalla del inquilino
 * FABRICABA el historial a partir del estado: «Solicitud iniciada» = el envío
 * menos 2 horas, «El propietario está revisando» = el envío MÁS UN DÍA (salía
 * con fecha de mañana), aprobada = +5 días, rechazada = +4. Fechas inventadas
 * en una pantalla que la persona usa para saber en qué va su arriendo.
 *
 * Si el historial no se puede leer, se muestra sólo lo que consta en la
 * postulación misma (la fecha de envío): nunca un paso que no ocurrió.
 */

import { useEffect, useState } from 'react'

import { apiClient } from '@/lib/api/client'

/** Un evento tal como lo guarda el back (`application_events`). */
export interface EventoDeLaPostulacion {
  id: string
  type: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

/** Una fila del historial, con el `type` que entiende el ícono de la pantalla. */
export interface PasoDelHistorial {
  id: string
  type: 'created' | 'submitted' | 'under_review' | 'needs_info' | 'approved' | 'rejected' | 'withdrawn' | 'no_adjudicado' | 'info_provided'
  timestamp: string
  description: string
  /** El mensaje que dejó la inmobiliaria (al aprobar, rechazar o pedir información). */
  nota?: string
}

const ESTADOS: Record<string, { type: PasoDelHistorial['type']; es: string; en: string }> = {
  UNDER_REVIEW: { type: 'under_review', es: 'La inmobiliaria está revisando tu solicitud', en: 'The agency is reviewing your application' },
  NEEDS_INFO: { type: 'needs_info', es: 'La inmobiliaria te pidió más información', en: 'The agency asked for more information' },
  APPROVED: { type: 'approved', es: '¡Tu solicitud fue aprobada!', en: 'Your application was approved!' },
  REJECTED: { type: 'rejected', es: 'Tu solicitud no fue aprobada', en: 'Your application was not approved' },
  WITHDRAWN: { type: 'withdrawn', es: 'Retiraste la solicitud', en: 'You withdrew the application' },
  NO_ADJUDICADO: { type: 'no_adjudicado', es: 'El inmueble quedó para otra persona', en: 'The property went to someone else' },
}

function textoDe(metadata: Record<string, unknown> | null | undefined, ...claves: string[]): string | undefined {
  for (const c of claves) {
    const v = metadata?.[c]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

/**
 * Los eventos que le dicen algo a la persona, en orden. Los pasos del
 * asistente y cada documento subido son ruido para este historial; el texto
 * interno de la adjudicación («ganador=…») no se muestra.
 */
export function historialDeLaPostulacion(eventos: EventoDeLaPostulacion[], locale: string): PasoDelHistorial[] {
  const es = locale !== 'en'
  const pasos: PasoDelHistorial[] = []
  const ordenados = [...eventos].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const e of ordenados) {
    switch (e.type) {
      case 'CREATED':
        pasos.push({ id: e.id, type: 'created', timestamp: e.createdAt, description: es ? 'Empezaste la solicitud' : 'You started the application' })
        break
      case 'SUBMITTED':
        pasos.push({ id: e.id, type: 'submitted', timestamp: e.createdAt, description: es ? 'Enviaste la solicitud a la inmobiliaria' : 'You sent the application' })
        break
      case 'INFO_REQUESTED':
        pasos.push({ id: e.id, type: 'needs_info', timestamp: e.createdAt, description: ESTADOS.NEEDS_INFO[es ? 'es' : 'en'], nota: textoDe(e.metadata, 'message', 'reason') })
        break
      case 'INFO_PROVIDED':
        pasos.push({ id: e.id, type: 'info_provided', timestamp: e.createdAt, description: es ? 'Enviaste la información que te pidieron' : 'You sent the requested information' })
        break
      case 'WITHDRAWN':
        pasos.push({ id: e.id, type: 'withdrawn', timestamp: e.createdAt, description: ESTADOS.WITHDRAWN[es ? 'es' : 'en'] })
        break
      case 'STATUS_CHANGED': {
        const hacia = textoDe(e.metadata, 'to')
        const estado = hacia ? ESTADOS[hacia] : undefined
        if (!estado) break
        // El pedido de información ya sale por su propio evento (INFO_REQUESTED).
        if (hacia === 'NEEDS_INFO' && ordenados.some((o) => o.type === 'INFO_REQUESTED')) break
        if (hacia === 'WITHDRAWN' && ordenados.some((o) => o.type === 'WITHDRAWN')) break
        const nota = hacia === 'NO_ADJUDICADO' ? undefined : textoDe(e.metadata, 'reason', 'message')
        pasos.push({ id: e.id, type: estado.type, timestamp: e.createdAt, description: estado[es ? 'es' : 'en'], nota })
        break
      }
      default:
        break
    }
  }
  return pasos
}

/** Sólo lo que consta en la postulación: la fecha de envío. */
export function historialMinimo(submittedAt: string | null | undefined, locale: string): PasoDelHistorial[] {
  if (!submittedAt) return []
  return [{ id: 'envio', type: 'submitted', timestamp: submittedAt, description: locale !== 'en' ? 'Enviaste la solicitud a la inmobiliaria' : 'You sent the application' }]
}

/** Lee el historial real; se vuelve a leer cuando cambia el estado de la postulación. */
export function useHistorialDeLaPostulacion(applicationId: string, estado: string | undefined) {
  const [eventos, setEventos] = useState<EventoDeLaPostulacion[] | null>(null)
  const [fallo, setFallo] = useState(false)
  useEffect(() => {
    if (!applicationId) return
    let cancelado = false
    apiClient
      .get<EventoDeLaPostulacion[]>(`/applications/${applicationId}/timeline`)
      .then((r) => {
        if (cancelado) return
        setEventos(Array.isArray(r) ? r : [])
        setFallo(false)
      })
      .catch(() => {
        if (!cancelado) setFallo(true)
      })
    return () => {
      cancelado = true
    }
  }, [applicationId, estado])
  return { eventos, fallo }
}
