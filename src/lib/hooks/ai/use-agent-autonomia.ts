'use client'

/**
 * use-agent-autonomia.ts — F6 of the Agent Workspace initiative.
 *
 * Reads the per-agent autonomy posture (modo + valla + T-323):
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia
 *
 * Same shape/conventions as use-agent-work-items.ts. A 404 sets
 * `notAvailable` (endpoint not deployed yet) — data null, NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAgentAutonomia, type AgentAutonomiaResponse } from '@/lib/api/agent-workspace'
import type { AgenteId } from '@/lib/api/work-item'

export interface UseAgentAutonomiaResult {
  data: AgentAutonomiaResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — autonomía aún no configurada (not an error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useAgentAutonomia(agente: AgenteId): UseAgentAutonomiaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<AgentAutonomiaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[useAgentAutonomia] NEXT_PUBLIC_AGENT_URL is not configured')
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
      const res = await fetchAgentAutonomia(agencyId, agente, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch agent autonomia')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, agente])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
