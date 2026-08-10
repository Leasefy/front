'use client'

/**
 * use-calls.ts
 *
 * Lista paginada de llamadas de cobranza a nivel agencia:
 *   GET /api/agency/{agencyId}/cobranza/calls
 *
 * Los tipos salen del contrato generado (`pnpm api:gen`) — NO se transcriben
 * a mano. Un tipo inventado es internamente coherente, así que `tsc`, `lint`
 * y `next build` quedan en verde mientras la pantalla se rompe sólo en el
 * navegador; ya nos pasó cinco veces en este mismo panel.
 *
 * Auth: `agentFetch`, que reintenta UNA vez ante 401 con sesión fresca. El
 * `fetch` pelado deja la pantalla clavada en «Error: 401» cuando el token
 * venció o todavía no llegó.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import type { paths } from '@/lib/api/generated/agent'

// ── Tipos derivados del contrato ──────────────────────────────────────────────

type CallsResponse =
  paths['/api/agency/{agencyId}/cobranza/calls']['get']['responses'][200]['content']['application/json']

export type CallSummary = CallsResponse['calls'][number]

/** El resumen del CallSummarizer que viaja en cada fila. `null` si no hay. */
export type CallAiSummary = CallSummary['summary']

export type CallListResponse = CallsResponse

// Los filtros del endpoint son `string` en el contrato (no enums), así que el
// vocabulario permitido vive acá — es el mismo que documenta la ruta.
export type CallOutcomeFilter =
  | 'no_answer'
  | 'voicemail'
  | 'wrong_party'
  | 'completed'
  | 'failed'
  | 'opt_out'
  | 'escalated'

export type CallChannelFilter = 'voice' | 'whatsapp' | 'sms' | 'email'

export type CallDirectionFilter = 'outbound' | 'inbound'

export interface UseCallsFilters {
  outcome?: CallOutcomeFilter
  channel?: CallChannelFilter
  direction?: CallDirectionFilter
  from?: string
  to?: string
  limit?: number
  cursor?: string
}

export interface UseCallsResult {
  calls: CallSummary[]
  nextCursor: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCalls(filters?: UseCallsFilters): UseCallsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<CallListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Guarda contra respuestas fuera de orden. Sin esto, dos fetches en vuelo
   * (StrictMode en dev, o un cambio de filtro encima de un refresh) pueden
   * resolver al revés: el que falla llega último, pisa el `setError(null)` del
   * que funcionó, y queda el banner rojo ARRIBA de una tabla con datos buenos
   * — exactamente lo que se veía en Llamadas.
   */
  const requestSeq = useRef(0)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCalls] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    const url = new URL(`${agentUrl}/api/agency/${agencyId}/cobranza/calls`)
    if (filters?.outcome) url.searchParams.set('outcome', filters.outcome)
    if (filters?.channel) url.searchParams.set('channel', filters.channel)
    if (filters?.direction) url.searchParams.set('direction', filters.direction)
    if (filters?.from) url.searchParams.set('from', filters.from)
    if (filters?.to) url.searchParams.set('to', filters.to)
    if (filters?.limit != null) url.searchParams.set('limit', String(filters.limit))
    if (filters?.cursor) url.searchParams.set('cursor', filters.cursor)

    const seq = ++requestSeq.current

    try {
      setIsLoading(true)
      const res = await agentFetch(url.toString())
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as CallListResponse
      if (seq !== requestSeq.current) return
      setData(json)
      setError(null)
    } catch (err) {
      if (seq !== requestSeq.current) return
      setError(err instanceof Error ? err.message : 'Failed to fetch calls')
    } finally {
      if (seq === requestSeq.current) setIsLoading(false)
    }
  }, [
    agencyId,
    filters?.outcome,
    filters?.channel,
    filters?.direction,
    filters?.from,
    filters?.to,
    filters?.limit,
    filters?.cursor,
  ])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, agencyId])

  return {
    calls: data?.calls ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    refetch: fetchData,
  }
}
