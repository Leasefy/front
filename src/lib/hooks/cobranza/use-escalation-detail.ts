'use client'

/**
 * use-escalation-detail.ts — Phase 34 plan 34-06.
 *
 * Polls GET /api/agency/:agencyId/cobranza/escalations/:id every 60s.
 * Powers the detail page (kanban deep-link target).
 *
 * Shape mirrors backend Plan 34-03 DetailResponseSchema:
 *   EscalationCard + { state_trace_json, assignee_email, assigned_at,
 *                      linked_call: {id, initiatedAt, outcome}|null,
 *                      resolution_category?, resolution_text? }
 */

import { useCallback, useEffect, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { Escalation } from './use-escalations'

export interface EscalationLinkedCall {
  id: string
  initiatedAt: string
  outcome: string | null
}

export interface EscalationDetail extends Escalation {
  state_trace_json: unknown | null
  assignee_email: string | null
  assigned_at: string | null
  linked_call: EscalationLinkedCall | null
  resolution_category?: string | null
  resolution_text?: string | null
}

const POLL_INTERVAL_MS = 60_000

export interface UseEscalationDetailResult {
  data: EscalationDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEscalationDetail(
  escalationId: string | null,
): UseEscalationDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<EscalationDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !escalationId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/escalations/${escalationId}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as EscalationDetail
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, escalationId])

  useEffect(() => {
    if (!agencyId || !escalationId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId, escalationId])

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, Boolean(agencyId && escalationId))

  return { data, isLoading, error, refetch: fetchOnce }
}
