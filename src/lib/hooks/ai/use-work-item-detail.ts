'use client'

/**
 * use-work-item-detail.ts — F6 of the Agent Workspace initiative.
 *
 * Reads a single work-item with its contexto blocks + traza:
 *
 *   GET /api/agency/{agencyId}/ai-hub/work-items/{agente}/{id}
 *
 * Same shape/conventions as use-agent-work-items.ts. A 404 sets
 * `notAvailable` (case not found / endpoint not deployed) — data null, NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchWorkItemDetail, type WorkItemDetailResponse } from '@/lib/api/agent-workspace'
import type { AgenteId } from '@/lib/api/work-item'

export interface UseWorkItemDetailResult {
  data: WorkItemDetailResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — caso no encontrado (not an error banner). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useWorkItemDetail(agente: AgenteId, id: string): UseWorkItemDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<WorkItemDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[useWorkItemDetail] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !id) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setIsLoading(true)
      const res = await fetchWorkItemDetail(agencyId, agente, id, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch work item detail')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, agente, id])

  useEffect(() => {
    if (!agencyId || !id) return
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId, id])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
