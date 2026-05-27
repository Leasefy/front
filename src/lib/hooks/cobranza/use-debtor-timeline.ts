'use client'

/**
 * use-debtor-timeline.ts — Phase 31 plan 31-09 (COBR-UI-03 timeline tab).
 *
 * Polling cadence per D-31-17; realtime channel wiring deferred to 31-11.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import type { components } from '@/lib/api/generated/agent'

export type DebtorTimelineResponse =
  components['schemas']['CobranzaDebtorTimelineResponse']
export type DebtorTimelineEvent = components['schemas']['CobranzaDebtorTimelineEvent']

export interface UseDebtorTimelineResult {
  data: DebtorTimelineResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDebtorTimeline(args: { debtorId: string }): UseDebtorTimelineResult {
  const { debtorId } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<DebtorTimelineResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorTimeline] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !debtorId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/timeline`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: DebtorTimelineResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debtor timeline')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, debtorId])

  useEffect(() => {
    if (!agencyId || !debtorId) return
    void fetchData()
    const id = setInterval(() => void fetchData(), 30_000)
    return () => clearInterval(id)
  }, [fetchData, agencyId, debtorId])

  return { data, isLoading, error, refetch: fetchData }
}
