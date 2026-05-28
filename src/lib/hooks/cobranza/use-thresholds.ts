'use client'

/**
 * use-thresholds.ts — Phase 34 plan 34-08.
 *
 * Hook for daily-report threshold versioning admin surface:
 *
 *   useThresholds() → {
 *     active: ThresholdRow | null     // current effective version (DEFAULTS if no row yet)
 *     versions: ThresholdRow[]        // history if backend exposes /history (else empty array)
 *     versionsListSupported: boolean  // false if /history returned 404 — UI stubs the table
 *     updateThresholds(body)          // PUT → mutate → returns new row
 *     rollbackTo(version)             // POST /rollback → mutate → returns new row
 *     refetch()
 *   }
 *
 * Per the plan: if backend does NOT expose GET /thresholds/history, the
 * versions table renders only the active version and the executor SUMMARY
 * surfaces this gap as a follow-up for 34-05.
 *
 * Refs: 34-05 SUMMARY endpoint inventory, DAILY_REPORT_THRESHOLD_DEFAULTS.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'

export interface ThresholdRow {
  version: number | null
  top_n_debtors_in_report: number
  mora_dias_bucket_boundaries: number[]
  pkr_pct_alert_below: number
  indice_morosidad_pct_alert_above: number
  compliance_violations_critical_at_least: number
  calls_outside_window_critical_at_least: number
  created_at?: string
  created_by_user_id?: string | null
  created_by_email?: string | null
  is_rollback_of_version?: number | null
}

export interface ThresholdUpdateBody {
  top_n_debtors_in_report: number
  mora_dias_bucket_boundaries: number[]
  pkr_pct_alert_below: number
  indice_morosidad_pct_alert_above: number
  compliance_violations_critical_at_least: number
  calls_outside_window_critical_at_least: number
}

export interface UseThresholdsResult {
  active: ThresholdRow | null
  versions: ThresholdRow[]
  versionsListSupported: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateThresholds: (body: ThresholdUpdateBody) => Promise<ThresholdRow>
  rollbackTo: (version: number) => Promise<ThresholdRow>
}

export function useThresholds(): UseThresholdsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [active, setActive] = useState<ThresholdRow | null>(null)
  const [versions, setVersions] = useState<ThresholdRow[]>([])
  const [versionsListSupported, setVersionsListSupported] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const base = useCallback(
    (suffix: string): string | null => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return null
      return `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/thresholds${suffix}`
    },
    [agencyId],
  )

  const fetchAll = useCallback(async () => {
    const activeUrl = base('')
    if (!activeUrl) {
      setIsLoading(false)
      if (!process.env.NEXT_PUBLIC_AGENT_URL) setError('NEXT_PUBLIC_AGENT_URL not configured')
      return
    }
    try {
      const activeRes = await globalThis.fetch(activeUrl, { credentials: 'include' })
      if (!activeRes.ok) throw new Error(`${activeRes.status}`)
      const activeJson = (await activeRes.json()) as ThresholdRow
      setActive(activeJson)

      // Attempt versions list — if backend doesn't expose it, stub with active.
      const historyUrl = base('/history?limit=20')
      if (historyUrl) {
        try {
          const histRes = await globalThis.fetch(historyUrl, { credentials: 'include' })
          if (histRes.status === 404) {
            setVersionsListSupported(false)
            setVersions(activeJson.version != null ? [activeJson] : [])
          } else if (histRes.ok) {
            const histJson = (await histRes.json()) as { items?: ThresholdRow[] }
            setVersions(histJson.items ?? [])
            setVersionsListSupported(true)
          } else {
            // Treat any other failure as list-unsupported (graceful degrade)
            setVersionsListSupported(false)
            setVersions(activeJson.version != null ? [activeJson] : [])
          }
        } catch {
          setVersionsListSupported(false)
          setVersions(activeJson.version != null ? [activeJson] : [])
        }
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [base])

  useEffect(() => {
    if (!agencyId) return
    void fetchAll()
  }, [agencyId, fetchAll])

  const updateThresholds = useCallback(
    async (body: ThresholdUpdateBody): Promise<ThresholdRow> => {
      const url = base('')
      if (!url) throw new Error('not_ready')
      const res = await globalThis.fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status}: ${text || 'update_failed'}`)
      }
      const row = (await res.json()) as ThresholdRow
      await fetchAll()
      return row
    },
    [base, fetchAll],
  )

  const rollbackTo = useCallback(
    async (version: number): Promise<ThresholdRow> => {
      const url = base('/rollback')
      if (!url) throw new Error('not_ready')
      const res = await globalThis.fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to_version: version }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status}: ${text || 'rollback_failed'}`)
      }
      const row = (await res.json()) as ThresholdRow
      await fetchAll()
      return row
    },
    [base, fetchAll],
  )

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchAll()
  }, [fetchAll])

  return {
    active,
    versions,
    versionsListSupported,
    isLoading,
    error,
    refetch,
    updateThresholds,
    rollbackTo,
  }
}
