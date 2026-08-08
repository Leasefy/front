'use client'

/**
 * use-arco-detail — detalle de una solicitud ARCO.
 *
 * ⚠️ Igual que la bandeja, el contrato del agente no era el que esperaba el
 * front. `GET /api/agency/:agencyId/arco/requests/:id` devuelve un objeto
 * **plano** (no `{ request, timeline }`), con `sla_remaining_days` en vez de una
 * fecha límite y un `timeline` de `{ event, at }` (no `{ status, timestamp }`).
 * Acá se normaliza a la forma que usa la UI.
 *
 * A diferencia de la lista, el detalle SÍ trae `requesterEmail` y
 * `subjectDescription`: son los datos que el operador necesita para responder,
 * y por eso no viajan en el listado.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import {
  ARCO_URGENT_THRESHOLD_DAYS,
  toCedulaRef,
  type ArcoRequestStatus,
  type ArcoRequestType,
} from './use-arco-requests'

const POLL_INTERVAL_MS = 60_000

/** Eventos del timeline, en el orden en que el agente los emite. */
export type ArcoTimelineEvent = 'submitted' | 'email_verified' | 'triaged' | 'resolved'

export interface ArcoDetailTimelineEntry {
  event: ArcoTimelineEvent | string
  at: string
}

export interface ArcoDetailData {
  id: string
  type: ArcoRequestType
  status: ArcoRequestStatus
  requesterName: string
  requesterEmail: string
  requesterCedulaHash: string
  /** Referencia corta del hash — la cédula no se almacena en claro. */
  cedulaRef: string
  subjectDescription: string
  /** Días hábiles restantes. Cero o negativo = plazo vencido. */
  slaRemainingDays: number
  isClosed: boolean
  isOverdue: boolean
  isUrgent: boolean
  resolutionPayload: Record<string, unknown> | null
  auditLogIds: string[]
  timeline: ArcoDetailTimelineEntry[]
}

/** Forma cruda que devuelve el agente. */
interface ArcoDetailApiResponse {
  id: string
  type: ArcoRequestType
  status: ArcoRequestStatus
  requesterName: string
  requesterEmail: string
  requesterCedulaHash: string
  subjectDescription: string
  sla_remaining_days: number
  resolutionPayload: Record<string, unknown> | null
  auditLogIds: string[]
  timeline: ArcoDetailTimelineEntry[]
}

export interface UseArcoDetailResult {
  data: ArcoDetailData | null
  isLoading: boolean
  error: string | null
  lastUpdatedAt: Date | null
  refetch: () => Promise<void>
}

export function normalizeArcoDetail(raw: ArcoDetailApiResponse): ArcoDetailData {
  const isClosed = raw.status === 'resolved' || raw.status === 'rejected'
  const remaining = Number.isFinite(raw.sla_remaining_days) ? raw.sla_remaining_days : 0

  return {
    id: raw.id,
    type: raw.type,
    status: raw.status,
    requesterName: raw.requesterName,
    requesterEmail: raw.requesterEmail,
    requesterCedulaHash: raw.requesterCedulaHash,
    cedulaRef: toCedulaRef(raw.requesterCedulaHash),
    subjectDescription: raw.subjectDescription,
    slaRemainingDays: remaining,
    isClosed,
    isOverdue: !isClosed && remaining <= 0,
    isUrgent: !isClosed && remaining > 0 && remaining <= ARCO_URGENT_THRESHOLD_DAYS,
    resolutionPayload: raw.resolutionPayload ?? null,
    auditLogIds: raw.auditLogIds ?? [],
    timeline: raw.timeline ?? [],
  }
}

export function useArcoDetail(requestId: string | null): UseArcoDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<ArcoDetailData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('agent_url_missing')
      setIsLoading(false)
      return
    }
    if (!agencyId || !requestId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/arco/requests/${requestId}`,
      )
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as ArcoDetailApiResponse
      setData(normalizeArcoDetail(json))
      setError(null)
      setLastUpdatedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, requestId])

  useEffect(() => {
    if (!agencyId || !requestId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId, requestId])

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, Boolean(agencyId && requestId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, lastUpdatedAt, refetch }
}
