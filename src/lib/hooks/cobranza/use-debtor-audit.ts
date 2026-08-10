'use client'

/**
 * use-debtor-audit.ts — Phase 31 plan 31-09 (Acciones tab audit ribbon).
 *
 * Polling cadence per D-31-17; realtime channel wiring deferred to 31-11.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { components } from '@/lib/api/generated/agent'

export type DebtorAuditResponse =
  components['schemas']['CobranzaDebtorAuditResponse']
export type DebtorAuditEntry = components['schemas']['CobranzaDebtorAuditEntry']

export interface UseDebtorAuditResult {
  data: DebtorAuditResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDebtorAudit(args: { debtorId: string }): UseDebtorAuditResult {
  const { debtorId } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<DebtorAuditResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorAudit] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !debtorId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/audit`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json: DebtorAuditResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debtor audit')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, debtorId])

  useEffect(() => {
    if (!agencyId || !debtorId) return
    void fetchData()
  }, [fetchData, agencyId, debtorId])

  useVisibilityPolling(() => void fetchData(), 30_000, Boolean(agencyId && debtorId))

  return { data, isLoading, error, refetch: fetchData }
}
