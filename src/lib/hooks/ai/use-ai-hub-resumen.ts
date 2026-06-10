'use client'

/**
 * use-ai-hub-resumen.ts — F10 of the Agent Workspace initiative.
 *
 * Reads the hub "Equipo de agentes" summary (6 colas grouped by owner role —
 * decisión 2026-06-08):
 *
 *   GET /api/agency/{agencyId}/ai-hub/resumen
 *
 * Same shape/conventions as use-agent-overview.ts. A 404 sets `notAvailable`
 * (endpoint not deployed yet) — data null, NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAiHubResumen, type AiHubResumenResponse } from '@/lib/api/agent-workspace'

export interface UseAiHubResumenResult {
  data: AiHubResumenResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — "el equipo aún no reporta" (not an error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useAiHubResumen(): UseAiHubResumenResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<AiHubResumenResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[useAiHubResumen] NEXT_PUBLIC_AGENT_URL is not configured')
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
      const res = await fetchAiHubResumen(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch ai-hub resumen')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) return
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
