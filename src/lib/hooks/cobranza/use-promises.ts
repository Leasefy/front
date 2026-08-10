'use client'

/**
 * use-promises.ts — histórico agency-wide de promesas de pago.
 *
 * GET /api/agency/:agencyId/cobranza/promises — devuelve TODAS las promesas de
 * pago del tenant (no solo las de hoy), con PII enmascarada y un `derivedStatus`
 * de presentación ya calculado por el backend a partir de (status persistido +
 * dueDate): activa | incumplida | parcial | por_vencer | cumplida.
 *
 * A diferencia de useDailyReport (que solo expone `payment_promises_today`),
 * este hook es la fuente HISTÓRICA agregada que la vista de Promesas necesitaba.
 *
 * Filtros server-side soportados por el endpoint: ?status (PERSISTIDO:
 * open|kept|broken|partially_kept), ?debtorId, ?from/?to (cotas sobre dueDate),
 * ?limit/?offset (paginación offset). El filtro por ESTADO de la pantalla es por
 * estado DERIVADO (varios derivados salen del mismo persistido: por_vencer/activa
 * ambos vienen de 'open') → ese filtro se aplica client-side sobre `derivedStatus`.
 *
 * Patrón (copiado de use-cartera-overview.ts): "use client"; useAuth() → agency.id;
 * agentAuthHeaders(); base = NEXT_PUBLIC_AGENT_URL; sin URL o sin agencyId →
 * setIsLoading(false) + return (fail-soft, sin warn ruidoso); fetch en try/catch.
 *
 * FAIL-SOFT: el backend aún no está desplegado (Victor aplica migración + deploy).
 * 404/empty/error → data = null + lista vacía; nunca rompe ni muestra error feo.
 * El propio endpoint ya degrada a 200 con lista vacía si la tabla no está migrada.
 */

import { useCallback, useEffect, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'

// ── Shapes (espejo del contrato del backend) ─────────────────────────────────

/** Estado DERIVADO de presentación — idéntico al `PromesaEstado` de la UI. */
export type PromiseDerivedStatus =
  | 'activa'
  | 'incumplida'
  | 'parcial'
  | 'por_vencer'
  | 'cumplida'

/** Estado PERSISTIDO (lo que acepta el filtro ?status del endpoint). */
export type PromisePersistedStatus = 'open' | 'kept' | 'broken' | 'partially_kept'

export interface CobranzaPromiseItem {
  id: string
  debtorId: string
  callId: string | null
  debtorName: string
  cedulaMasked: string
  phoneMasked: string
  emailMasked: string | null
  amount: number
  dueDate: string
  channel: string | null
  conditions: string | null
  status: string
  derivedStatus: PromiseDerivedStatus
  createdAt: string
  resolvedAt: string | null
}

export interface CobranzaPromisesResponse {
  items: CobranzaPromiseItem[]
  total: number
  limit: number
  offset: number
  generatedAt: string
}

export interface UsePromisesParams {
  /** Filtro server-side por estado PERSISTIDO (omitir → todas). */
  status?: PromisePersistedStatus
  /** Restringir a un solo deudor. */
  debtorId?: string
  /** Cota inferior (inclusive) ISO-8601 sobre dueDate. */
  from?: string
  /** Cota superior (inclusive) ISO-8601 sobre dueDate. */
  to?: string
  /** Tamaño de página (1..200; default backend 50). */
  limit?: number
  /** Offset de paginación (default 0). */
  offset?: number
}

export interface UsePromisesResult {
  data: CobranzaPromisesResponse | null
  promises: CobranzaPromiseItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePromises(params: UsePromisesParams = {}): UsePromisesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CobranzaPromisesResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const { status, debtorId, from, to, limit, offset } = params

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      // Fail-soft silencioso: sin backend configurado → estado vacío.
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const sp = new URLSearchParams()
      if (status) sp.set('status', status)
      if (debtorId) sp.set('debtorId', debtorId)
      if (from) sp.set('from', from)
      if (to) sp.set('to', to)
      if (typeof limit === 'number') sp.set('limit', String(limit))
      if (typeof offset === 'number') sp.set('offset', String(offset))
      const qs = sp.toString()
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/promises${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as CobranzaPromisesResponse
      setData(json)
      setError(null)
    } catch (err) {
      // Fail-soft: 404/empty/error → degradamos a vacío, sin romper la pantalla.
      setData(null)
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, status, debtorId, from, to, limit, offset])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, agencyId])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchData()
  }, [fetchData])

  return {
    data,
    promises: data?.items ?? [],
    isLoading,
    error,
    refetch,
  }
}
