'use client'

/**
 * use-costos.ts — Phase 35 plan 35-10 (D-35-08)
 *
 * Dual-interval polling hook for the cost dashboard page.
 *   - fetchSummary: GET /costos/summary  — polled every 30s (KPI strip refresh rate)
 *   - fetchSeries:  GET /costos/series   — polled every 60s (aggregate chart refresh rate)
 *
 * Both fetch cycles are INDEPENDENT — separate useState/useCallback/useEffect/setInterval pairs.
 * agencyId sourced exclusively from useAuth().agency?.id (JWT-derived). Never from URL/body (T-35-15).
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// =============================================================================
// Interfaces — declared inline (types not yet in generated OpenAPI types)
// =============================================================================

export interface CostSourceRow {
  key: string
  label: string
  populated: boolean
  notes: string | null
}

export interface CostosSummaryResponse {
  kpis: {
    costPerQuoteUsd: number | null      // null when no quotes processed
    monthlyBurnUsd: number | null
    forecast30dUsd: number | null       // null when <7d of data (T-35-09)
  }
  sources: {
    anthropicTotal: number
    carrierApiTotal: number
    sekureCommissionTotal: number
    datacreditoTotal: number
  }
  costSources: CostSourceRow[]
  generatedAt: string
}

export interface CostSeriesRow {
  period: string
  anthropic: number
  carrier_api: number
  sekure_commission: number
  datacredito: number
  total: number
  isForecast?: boolean
}

export interface CostSeriesResponse {
  rows: CostSeriesRow[]
}

// =============================================================================
// Interval constants (D-35-08)
// =============================================================================

const KPI_POLL_INTERVAL_MS = 30_000     // 30s — KPI strip
const CHART_POLL_INTERVAL_MS = 60_000   // 60s — charts / aggregates

// =============================================================================
// Hook: useCostos
// =============================================================================

export function useCostos(): {
  summaryData: CostosSummaryResponse | null
  seriesData: CostSeriesResponse | null
  isLoadingSummary: boolean
  isLoadingSeries: boolean
  summaryError: string | null
  seriesError: string | null
  refetchSummary: () => Promise<void>
  refetchSeries: () => Promise<void>
} {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  // ---------------------------------------------------------------------------
  // Summary state (30s polling)
  // ---------------------------------------------------------------------------

  const [summaryData, setSummaryData] = useState<CostosSummaryResponse | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCostos] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoadingSummary(false)
      return
    }
    if (!agencyId) {
      setIsLoadingSummary(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/costos/summary`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CostosSummaryResponse = await res.json()
      setSummaryData(json)
      setSummaryError(null)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to fetch cost summary')
    } finally {
      setIsLoadingSummary(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoadingSummary(false); return }
    void fetchSummary()
    const id = setInterval(() => void fetchSummary(), KPI_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchSummary, agencyId])

  // ---------------------------------------------------------------------------
  // Series state (60s polling)
  // ---------------------------------------------------------------------------

  const [seriesData, setSeriesData] = useState<CostSeriesResponse | null>(null)
  const [isLoadingSeries, setIsLoadingSeries] = useState(true)
  const [seriesError, setSeriesError] = useState<string | null>(null)

  const fetchSeries = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setIsLoadingSeries(false)
      return
    }
    if (!agencyId) {
      setIsLoadingSeries(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/costos/series?group_by=month`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CostSeriesResponse = await res.json()
      setSeriesData(json)
      setSeriesError(null)
    } catch (err) {
      setSeriesError(err instanceof Error ? err.message : 'Failed to fetch cost series')
    } finally {
      setIsLoadingSeries(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoadingSeries(false); return }
    void fetchSeries()
    const id = setInterval(() => void fetchSeries(), CHART_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchSeries, agencyId])

  return {
    summaryData,
    seriesData,
    isLoadingSummary,
    isLoadingSeries,
    summaryError,
    seriesError,
    refetchSummary: fetchSummary,
    refetchSeries: fetchSeries,
  }
}
