'use client'

/**
 * use-carrier-sla.ts — Phase 35 plan 35-08 (Task 1)
 *
 * Polls GET /api/agency/:agencyId/cotizador/aseguradoras/:carrier/sla every 60s.
 * Returns the SLA state + breach windows payload.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

// =============================================================================
// Types
// =============================================================================

export interface BreachWindow {
  startedAt: string
  endedAt: string | null        // null = ongoing
  durationMinutes: number | null
  maxP95LatencyMs: number
  maxErrorRate: number
}

export interface CarrierSlaPayload {
  state: 'healthy' | 'degraded' | 'breached'
  since: string | null          // ISO timestamp
  reason: string | null
  p95Sparkline: Array<{ hour: string; p95LatencyMs: number }>      // last 30d
  errorRateSparkline: Array<{ hour: string; errorRate: number }>   // last 30d
  breachWindows: BreachWindow[]
}

export interface UseCarrierSlaResult {
  data: CarrierSlaPayload | null
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

export function useCarrierSla(carrier: string): UseCarrierSlaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CarrierSlaPayload | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrier}/sla`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as CarrierSlaPayload
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
