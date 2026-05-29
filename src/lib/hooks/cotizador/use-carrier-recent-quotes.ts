'use client'

/**
 * use-carrier-recent-quotes.ts — Phase 35 plan 35-08 (Task 1)
 *
 * Polls GET /api/agency/:agencyId/cotizador/aseguradoras/:carrier/recent-quotes every 60s.
 * Returns the last 50 quotes for the given carrier (cédula as 8-char hash prefix only).
 *
 * IMPORTANT (T-35-11): cedulaHashPrefix8 is NEVER raw cédula data — backend always
 * returns only the first 8 characters of the hash. Frontend must render via <Mask>.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

// =============================================================================
// Types
// =============================================================================

export interface RecentQuote {
  id: string
  createdAt: string
  cedulaHashPrefix8: string    // NEVER full hash — backend only returns prefix8
  canonMensualCop: number
  verdict: 'approved' | 'rejected' | 'error'
  primaMensualCop: number | null
  latencyMs: number | null
}

export interface UseCarrierRecentQuotesResult {
  data: RecentQuote[] | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// =============================================================================
// Constants
// =============================================================================

const POLL_INTERVAL_MS = 60_000

// =============================================================================
// Hook
// =============================================================================

export function useCarrierRecentQuotes(carrier: string): UseCarrierRecentQuotesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<RecentQuote[] | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrier}/recent-quotes`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as RecentQuote[]
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, carrier])

  useEffect(() => {
    if (!agencyId) return
    void fetchOnce()
    const id = setInterval(() => {
      void fetchOnce()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchOnce, agencyId])

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
