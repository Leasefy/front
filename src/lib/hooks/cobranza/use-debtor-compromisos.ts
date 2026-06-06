'use client'

/**
 * use-debtor-compromisos.ts — Phase 31 plan 31-09 (COBR-UI-03 compromisos tab).
 *
 * Polling cadence per D-31-17; realtime channel wiring deferred to 31-11.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { components } from '@/lib/api/generated/agent'

export type DebtorCompromisosResponse =
  components['schemas']['CobranzaDebtorCompromisosResponse']

export interface UseDebtorCompromisosResult {
  data: DebtorCompromisosResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDebtorCompromisos(args: { debtorId: string }): UseDebtorCompromisosResult {
  const { debtorId } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<DebtorCompromisosResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorCompromisos] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !debtorId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/compromisos`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: DebtorCompromisosResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debtor compromisos')
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
