'use client'

/**
 * use-agent-analitica.ts — F10 of the Agent Workspace initiative.
 *
 * Reads the per-agent Analítica (resumen KPIs + 30-day daily series):
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/analitica
 *
 * Same shape/conventions as use-agent-overview.ts. A 404 sets
 * `notAvailable` (endpoint not deployed yet) — data null, NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAgentAnalitica, type AgentAnaliticaResponse } from '@/lib/api/agent-workspace'
import type { AgenteId } from '@/lib/api/work-item'

export interface UseAgentAnaliticaResult {
  data: AgentAnaliticaResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — "el agente aún no reporta analítica" (not an error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useAgentAnalitica(agente: AgenteId): UseAgentAnaliticaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<AgentAnaliticaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[useAgentAnalitica] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setIsLoading(true)
      const res = await fetchAgentAnalitica(agencyId, agente, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch agent analitica')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, agente])

  useEffect(() => {
    if (!agencyId) return
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
