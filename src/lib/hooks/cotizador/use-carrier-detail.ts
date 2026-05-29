'use client'

/**
 * use-carrier-detail.ts — Phase 35 plan 35-08 (Task 1)
 *
 * Polls GET /api/agency/:agencyId/cotizador/aseguradoras/:carrier every 60s.
 * Returns the aggregated per-carrier deep-dive payload:
 *   { kpis, latencySparkline, errorRateSeries, approvalByCanon }
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

// =============================================================================
// Types
// =============================================================================

export interface CarrierDetailPayload {
  kpis: {
    latencyP95Ms: number
    errorRate24h: number       // 0–1 fraction
    approvalRate30d: number    // 0–1 fraction
    costPerQuoteUsd30d: number
  }
  latencySparkline: Array<{ hour: string; p95LatencyMs: number }>      // 30d hourly
  errorRateSeries: Array<{ date: string; errorRate: number }>           // 30d daily
  approvalByCanon: Array<{ canonRange: string; approvalRate: number }>  // 4 buckets
}

export interface UseCarrierDetailResult {
  data: CarrierDetailPayload | null
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

export function useCarrierDetail(carrier: string): UseCarrierDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CarrierDetailPayload | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrier}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as CarrierDetailPayload
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
