'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

// ── Polling interval (D-37-07: 60s for aggregate analytics widgets) ──────────
const POLL_INTERVAL_MS = 60_000

// ── Sub-types ─────────────────────────────────────────────────────────────────

type RecoveryRateRow = {
  bucket_date: string
  stage: string
  pct_n: number
  pct_cop: number
  debtors_recovered_count: number
  debtors_in_stage_count: number
  recovered_cop: string | number
  total_cop_in_stage: string | number
}

type TopObjectionRow = {
  rank: number
  literal: string
  count: number
  pct: number
}

type ChannelMixRow = {
  channel: 'voice' | 'whatsapp'
  outcome: string
  count: number
  pct: number
}

type HeatmapCell = {
  hour: number
  day_of_week: number
  call_count: number
  positive_outcome_pct: number
}

type SparklinePoint = {
  day: string
  cost_per_peso: number | null
}

type AgencyGateData = {
  populated: boolean
  calls_30d: number
}

type RecoveryData = {
  populated: boolean
  reason?: string
  rows: RecoveryRateRow[]
}

type ObjectionsData = {
  populated: boolean
  reason?: string
  objections: TopObjectionRow[]
}

type CadenceData = {
  populated: boolean
  reason?: string
  channelMix?: { populated: boolean; rows: ChannelMixRow[] }
  heatmap?: { populated: boolean; cells: HeatmapCell[] }
}

type CostPerPesoData = {
  populated: boolean
  reason?: string
  cost_per_peso?: number | null
  numerator_usd_voice?: number | null
  denominator_cop_paid?: number | null
  sparkline_90d?: SparklinePoint[]
}

// Phase 38 plan 38-04a — TopScripts type widened to support both stub (D-38-14
// not-yet-shipped backend) and real-data shapes. The Phase 37 stub remains valid
// in the unpopulated branch; the populated branch unlocks once D-38-14 ships the
// schema + handler swap (38-03-05).
export type TopScriptsRow = {
  scriptTemplateId: string
  scriptName: string
  stage: string
  nCalls: number
  conversionRate: number // 0..1
  lift: number // ratio vs baseline; can be negative
  sparkline?: number[] // 30-day rolling daily values
}

export type TopScriptsData =
  | {
      populated: false
      reason: 'schema_pending' | 'below-threshold' | string
      rows: never[]
      pendingPhase?: number
    }
  | { populated: true; rows: TopScriptsRow[] }

export type CobranzaAnalyticsData = {
  agencyGate: AgencyGateData
  recovery: RecoveryData
  objections: ObjectionsData
  cadence: CadenceData
  costPerPeso: CostPerPesoData
  topScripts: TopScriptsData
}

export interface UseCobranzaAnalyticsResult {
  data: CobranzaAnalyticsData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCobranzaAnalytics(): UseCobranzaAnalyticsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CobranzaAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    // memory phase_36_patch_13 — REQUIRED: both early-return branches MUST setIsLoading(false)
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false) // race-fix branch 1
      return
    }
    if (!agencyId) {
      setIsLoading(false) // race-fix branch 2 (memory phase_36_patch_13)
      return
    }

    const base = `${agentUrl}/api/agency/${agencyId}/cobranza/analytics`
    const opts: RequestInit = { credentials: 'include' }

    try {
      // Parallel fetch all 6 endpoints (D-37-07: Promise.all)
      const [
        resRecovery,
        resObjections,
        resCadence,
        resCostPerPeso,
        resTopScripts,
        resAgencyGate,
      ] = await Promise.all([
        globalThis.fetch(`${base}/recovery-rate`, opts),
        globalThis.fetch(`${base}/top-objections`, opts),
        globalThis.fetch(`${base}/cadence`, opts),
        globalThis.fetch(`${base}/cost-per-peso`, opts),
        globalThis.fetch(`${base}/top-scripts`, opts),
        globalThis.fetch(`${base}/agency-gate`, opts),
      ])

      // Check if ALL failed — only throw global error if no endpoint succeeded
      const allFailed =
        !resRecovery.ok &&
        !resObjections.ok &&
        !resCadence.ok &&
        !resCostPerPeso.ok &&
        !resTopScripts.ok &&
        !resAgencyGate.ok

      if (allFailed) {
        throw new Error('all_endpoints_failed')
      }

      // Parse each independently — log warn on individual failures, keep previous data
      const agencyGate: AgencyGateData = resAgencyGate.ok
        ? ((await resAgencyGate.json()) as AgencyGateData)
        : (data?.agencyGate ?? { populated: false, calls_30d: 0 })

      const recovery: RecoveryData = resRecovery.ok
        ? ((await resRecovery.json()) as RecoveryData)
        : (data?.recovery ?? { populated: false, rows: [] })

      const objections: ObjectionsData = resObjections.ok
        ? ((await resObjections.json()) as ObjectionsData)
        : (data?.objections ?? { populated: false, objections: [] })

      const cadence: CadenceData = resCadence.ok
        ? ((await resCadence.json()) as CadenceData)
        : (data?.cadence ?? { populated: false })

      const costPerPeso: CostPerPesoData = resCostPerPeso.ok
        ? ((await resCostPerPeso.json()) as CostPerPesoData)
        : (data?.costPerPeso ?? { populated: false })

      const topScripts: TopScriptsData = resTopScripts.ok
        ? ((await resTopScripts.json()) as TopScriptsData)
        : (data?.topScripts ?? { populated: false, reason: 'schema_pending', rows: [], pendingPhase: 38 })

      // Log individual failures as warnings (T-37-12-03: keep previous data, not global error)
      if (!resRecovery.ok)    console.warn(`[useCobranzaAnalytics] recovery-rate ${resRecovery.status}`)
      if (!resObjections.ok)  console.warn(`[useCobranzaAnalytics] top-objections ${resObjections.status}`)
      if (!resCadence.ok)     console.warn(`[useCobranzaAnalytics] cadence ${resCadence.status}`)
      if (!resCostPerPeso.ok) console.warn(`[useCobranzaAnalytics] cost-per-peso ${resCostPerPeso.status}`)
      if (!resTopScripts.ok)  console.warn(`[useCobranzaAnalytics] top-scripts ${resTopScripts.status}`)
      if (!resAgencyGate.ok)  console.warn(`[useCobranzaAnalytics] agency-gate ${resAgencyGate.status}`)

      setData({ agencyGate, recovery, objections, cadence, costPerPeso, topScripts })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false) // race-fix: always clear loading in finally
    }
  }, [agencyId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Note: `data` is intentionally excluded from deps to avoid re-fetch on data change.
  // It is captured via closure only in the fallback branches when an individual endpoint fails.

  useEffect(() => {
    // memory phase_36_patch_13 — REQUIRED: no-agencyId branch must setIsLoading(false)
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
    const id = setInterval(() => {
      void fetchOnce()
    }, POLL_INTERVAL_MS) // D-37-07: 60s for aggregate widgets
    return () => clearInterval(id)
  }, [fetchOnce, agencyId])

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
