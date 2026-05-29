'use client'

/**
 * use-insights.ts — Phase 35 plan 35-09.
 *
 * Polls all four cotizador insights endpoints in parallel every 60s.
 * Follows the same fetch + credentials-include + NEXT_PUBLIC_AGENT_URL
 * pattern as use-compliance-overview.ts (Phase 34) and use-cotizador-overview.ts.
 *
 * Endpoints consumed:
 *   GET /api/agency/:agencyId/cotizador/insights/approval-rate-monthly
 *   GET /api/agency/:agencyId/cotizador/insights/prima-distribution
 *   GET /api/agency/:agencyId/cotizador/insights/assumptions
 *   GET /api/agency/:agencyId/cotizador/insights/monthly-cost-trend
 *
 * CRITICAL: monthly-cost-trend values come back as strings (Decimal/BigInt safety).
 * Parse via parseFloat() before rendering — handled by InsightsMonthlyCostPreview.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Response types (mirrors backend 35-04 shapes)
// ---------------------------------------------------------------------------

export interface ApprovalRateMonthlyRow {
  carrier: string
  month: string           // ISO "2026-01"
  approval_rate_pct: number
}

export interface PrimaDistributionRow {
  carrier: string
  canon_range: string     // "[0-1M]", "[1M-3M]", "[3M-5M]", "[5M+]"
  p25: number
  p50: number
  p75: number
  min_val: number
  max_val: number
  n: number
}

export interface AssumptionRow {
  id: string
  carrier: string | null
  statement: string
  source: string | null
  status: string          // 'active' | 'deprecated' | 'under_review'
  validatedAt: string | null
  validationEvidence: string | null
  factorsUsed: string | null
  carrierKey: string | null
  createdAt: string
}

export interface MonthlyCostTrendRow {
  month: string           // ISO "2026-01"
  anthropic: string       // string — parse via parseFloat (Decimal/BigInt safety)
  carrier_api: string
  sekure_commission: string
  datacredito: string
  total: string
}

export interface InsightsData {
  approvalRateMonthly: ApprovalRateMonthlyRow[]
  primaDistribution: PrimaDistributionRow[]
  assumptions: AssumptionRow[]
  monthlyCostTrend: MonthlyCostTrendRow[]
}

// Backend wraps arrays in { rows: [...] } for most endpoints, { assumptions: [...] } for assumptions
interface ApprovalRateMonthlyResponse {
  rows: ApprovalRateMonthlyRow[]
}
interface PrimaDistributionResponse {
  rows: PrimaDistributionRow[]
}
interface AssumptionsResponse {
  assumptions: AssumptionRow[]
}
interface MonthlyCostTrendResponse {
  rows: MonthlyCostTrendRow[]
}

const POLL_INTERVAL_MS = 60_000

export interface UseInsightsResult extends InsightsData {
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInsights(): UseInsightsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [approvalRateMonthly, setApprovalRateMonthly] = useState<ApprovalRateMonthlyRow[]>([])
  const [primaDistribution, setPrimaDistribution] = useState<PrimaDistributionRow[]>([])
  const [assumptions, setAssumptions] = useState<AssumptionRow[]>([])
  const [monthlyCostTrend, setMonthlyCostTrend] = useState<MonthlyCostTrendRow[]>([])
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

    const base = `${agentUrl}/api/agency/${agencyId}/cotizador/insights`
    const opts: RequestInit = { credentials: 'include' }

    try {
      const [approvalRes, primaRes, assumptionsRes, costRes] = await Promise.all([
        globalThis.fetch(`${base}/approval-rate-monthly`, opts),
        globalThis.fetch(`${base}/prima-distribution`, opts),
        globalThis.fetch(`${base}/assumptions`, opts),
        globalThis.fetch(`${base}/monthly-cost-trend`, opts),
      ])

      // Parse each response; on individual failure preserve previous data
      if (approvalRes.ok) {
        const json = (await approvalRes.json()) as ApprovalRateMonthlyResponse
        setApprovalRateMonthly(json.rows ?? [])
      }
      if (primaRes.ok) {
        const json = (await primaRes.json()) as PrimaDistributionResponse
        setPrimaDistribution(json.rows ?? [])
      }
      if (assumptionsRes.ok) {
        const json = (await assumptionsRes.json()) as AssumptionsResponse
        setAssumptions(json.assumptions ?? [])
      }
      if (costRes.ok) {
        const json = (await costRes.json()) as MonthlyCostTrendResponse
        setMonthlyCostTrend(json.rows ?? [])
      }

      // Only surface an error if ALL responses failed
      const allFailed = [approvalRes, primaRes, assumptionsRes, costRes].every((r) => !r.ok)
      if (allFailed) {
        throw new Error('all_endpoints_failed')
      }

      setError(null)
    } catch (err) {
      // Non-destructive: preserve previously loaded data, only update error state
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

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

  return {
    approvalRateMonthly,
    primaDistribution,
    assumptions,
    monthlyCostTrend,
    isLoading,
    error,
    refetch,
  }
}
