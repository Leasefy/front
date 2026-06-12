'use client'

/**
 * use-calls.ts
 *
 * Fetches the agency-level paginated list of cobranza calls:
 *   GET /api/agency/{agencyId}/cobranza/calls
 *   → CallListResponse { calls: CallSummary[], nextCursor: string|null, generatedAt: string }
 *
 * Optional filter params: outcome, channel, direction, from, to, limit, cursor.
 * Auth: agency bearer JWT via agentAuthHeaders() + NEXT_PUBLIC_AGENT_URL.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface CallSummary {
  id: string
  debtorId: string
  debtorNameMasked: string
  debtorCedulaMasked: string
  debtorPhoneMasked: string
  channel: CallChannelFilter
  direction: CallDirectionFilter
  outcome: string | null
  durationSeconds: number | null
  initiatedAt: string
  endedAt: string | null
  qaScore: number | null
  complianceFlagsCount: number
}

export interface CallListResponse {
  calls: CallSummary[]
  nextCursor: string | null
  generatedAt: string
}

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

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url.toString(), {
        headers: agentAuthHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CallListResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calls')
    } finally {
      setIsLoading(false)
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
    if (!agencyId) return
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
