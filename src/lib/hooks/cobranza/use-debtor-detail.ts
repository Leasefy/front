'use client'

/**
 * use-debtor-detail.ts — Phase 31 plan 31-09 (COBR-UI-03).
 *
 * Polling cadence per D-31-17; realtime channel wiring deferred to 31-11.
 *
 * Pattern: mirrors Phase 29 `use-cartera-overview.ts` — useState + useEffect +
 * setInterval (no SWR per Phase 29 inheritance). Null-guards on agency.id and
 * NEXT_PUBLIC_AGENT_URL (v2.1 visual smoke env workaround).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { components } from '@/lib/api/generated/agent'

// ── Manual augmentation of NEW backend sidebar fields ─────────────────────────
// The generated `agent` client does not yet contain these fields. We extend the
// response TYPE here (instead of regenerating the whole client) and keep the new
// fields OPTIONAL so the UI degrades gracefully if the API hasn't shipped them.

/** Per-channel + total contact-attempts breakdown (NEW — see backend shapes). */
export interface DebtorContactAttempts {
  total: number
  lastAttemptAt: string | null
  lastChannel: 'voice' | 'whatsapp' | 'email' | 'sms' | null
  byChannel: { voice: number; whatsapp: number; email: number; sms: number }
}

/** Agent-recommended next step derived from the last call (NEW). */
export interface DebtorRecommendedNextStep {
  action: string | null
  label: string | null
  reason: string | null
  basedOnCallAt: string | null
}

type GeneratedDetail =
  components['schemas']['CobranzaDebtorDetailHeaderResponse']

export type DebtorDetailResponse = Omit<GeneratedDetail, 'sidebar'> & {
  sidebar: GeneratedDetail['sidebar'] & {
    /** NEW — real per-channel contact-attempts breakdown. */
    contactAttempts?: DebtorContactAttempts
    /** NEW — agent-recommended next step (hidden when action is null). */
    recommendedNextStep?: DebtorRecommendedNextStep
  }
}

export interface UseDebtorDetailResult {
  data: DebtorDetailResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDebtorDetail(args: { debtorId: string }): UseDebtorDetailResult {
  const { debtorId } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<DebtorDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorDetail] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !debtorId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: DebtorDetailResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debtor detail')
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
