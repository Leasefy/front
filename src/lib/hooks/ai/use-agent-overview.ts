'use client'

/**
 * use-agent-overview.ts — F6 of the Agent Workspace initiative.
 *
 * Reads the per-agent Sala overview (KPIs + pipeline + feed):
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/overview
 *
 * Same shape/conventions as use-agent-work-items.ts. A 404 sets
 * `notAvailable` (endpoint not deployed yet) — data null, NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAgentOverview, type AgentOverviewResponse } from '@/lib/api/agent-workspace'
import type { AgenteId } from '@/lib/api/work-item'

export interface UseAgentOverviewResult {
  data: AgentOverviewResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — "el agente aún no reporta métricas" (not an error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useAgentOverview(agente: AgenteId): UseAgentOverviewResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<AgentOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[useAgentOverview] NEXT_PUBLIC_AGENT_URL is not configured')
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
    // Upstream proxies can hang when the agent's service is unreachable —
    // never leave the Sala in eternal skeletons.
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 12_000)
    try {
      setIsLoading(true)
      const res = await fetchAgentOverview(agencyId, agente, controller.signal)
      if (controller.signal.aborted && !timedOut) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted && !timedOut) return
      setError(
        timedOut
          ? 'timeout'
          : err instanceof Error
            ? err.message
            : 'Failed to fetch agent overview',
      )
    } finally {
      clearTimeout(timeout)
      if (!controller.signal.aborted || timedOut) setIsLoading(false)
    }
  }, [agencyId, agente])

  useEffect(() => {
    if (!agencyId) {
      // Auth/agency context not resolved (or absent): stop the skeletons —
      // the effect re-runs and fetches as soon as the agency arrives.
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
