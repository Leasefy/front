'use client'

/**
 * use-compliance-overview.ts — Phase 34 plan 34-07 (D-34-03, D-34-07).
 *
 * Polls GET /api/agency/:agencyId/cobranza/compliance/overview every 60s
 * (D-34-03 — matches the server-side 60s cache TTL, so polling is cheap).
 *
 * Returns the single aggregated payload shipped by 34-04:
 *   { ley_2300, habeas_data.open_requests[], retention, sparkline, generated_at }
 *
 * Follows the same fetch + credentials-include + NEXT_PUBLIC_AGENT_URL
 * pattern as use-cartera-overview.ts (Phase 29) and use-escalations.ts
 * (Phase 34 plan 34-06).
 */

import { useCallback, useEffect, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useAuth } from '@/lib/auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'

export type HabeasDataColor = 'green' | 'yellow' | 'red' | 'red-pulse'

export interface HabeasDataOpenRequest {
  id: string
  debtor_id: string
  /** ISO timestamp when the Habeas Data request was anchored (D-34-RES-A1). */
  timestamp: string
  /** Server-computed Math.ceil(15 - daysSince(timestamp)). May go negative on overdue. */
  remaining_days: number
  color: HabeasDataColor
}

export interface ComplianceOverviewResponse {
  ley_2300: {
    weekly_outside_hours_count: number
    target: number
  }
  habeas_data: {
    open_requests: HabeasDataOpenRequest[]
  }
  retention: {
    compliance_pct: number
    target: number
  }
  sparkline: {
    daily_buckets_30d: Array<{ date: string; flag_rate_pct: number }>
  }
  generated_at: string
}

const POLL_INTERVAL_MS = 60_000

export interface UseComplianceOverviewResult {
  data: ComplianceOverviewResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useComplianceOverview(): UseComplianceOverviewResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<ComplianceOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/overview`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ComplianceOverviewResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
