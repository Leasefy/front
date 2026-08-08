'use client'

/**
 * use-daily-report.ts — Phase 34 plan 34-08 (D-34-04 1h TTL, D-34-06 per-user opt-in).
 *
 * Three hooks + one helper for the daily-report viewer page:
 *
 *   useDailyReport()                       → GET /daily-report/today (no auto-poll —
 *                                             report is daily; 34-05 enforces 1h cache TTL)
 *   useDailyReportHistory(days = 30)       → GET /daily-report/history?days=30 (cursor paginated)
 *   downloadHistoryCsv(agencyId, agentUrl) → GET /daily-report/history.csv → blob → anchor download
 *
 * Follows the same fetch + credentials-include + NEXT_PUBLIC_AGENT_URL pattern
 * as use-compliance-overview.ts (34-07) and use-cartera-overview.ts (Phase 29).
 *
 * Refs: 34-05 SUMMARY endpoint inventory; 34-CONTEXT.md D-34-04 / D-34-06.
 */

import { useCallback, useEffect, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useAuth } from '@/lib/auth'
import type { components } from '@/lib/api/generated/agent'

// ----- GET /daily-report/today ---------------------------------------------

export interface DailyReportSummary {
  pkr_7d_pct?: number
  pkr_pct?: number
  indice_morosidad_pct: number
  compliance_violations_count?: number
  calls_outside_window_count: number
  payments_today_total_cop?: number
  payments_today_count?: number
  connect_rate_pct?: number
}

export interface DailyReportDebtor {
  debtor_id: string
  debtor_id_masked?: string
  dpd: number
  balance_cop: number
  last_contact_at?: string | null
}

/**
 * ⚠️ Esto estaba escrito a mano como `{ kpi, threshold, actual, severity }` y de
 * los cuatro campos sólo acertaba `threshold`. El banner del reporte quedaba
 * literalmente así:
 *
 *     ⚠  : undefined (umbral 12)
 *
 * Y lo peor no es el «undefined»: el agente YA manda `message_es` con la frase
 * completa —«Índice de morosidad en 62.22% — por encima del umbral 12%»— y la
 * pantalla la tiraba a la basura para armar la suya con campos inexistentes.
 * Además `severity` nunca coincidía con `level`, así que una alerta CRITICAL se
 * pintaba siempre como advertencia.
 *
 * Se toma del contrato generado (`pnpm api:gen`) y no se vuelve a transcribir.
 */
export type DailyReportAlert = components['schemas']['CarteraDailyReportAlert']

export interface DailyReportResponse {
  report_date: string
  computed_at?: string
  summary: DailyReportSummary
  top_debtors: DailyReportDebtor[]
  alerts: DailyReportAlert[]
}

export interface UseDailyReportResult {
  data: DailyReportResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDailyReport(): UseDailyReportResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<DailyReportResponse | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/today`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as DailyReportResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}

// ----- GET /daily-report/history -------------------------------------------

export interface DailyReportHistoryEntry {
  report_date: string
  summary: DailyReportSummary
}

export interface DailyReportHistoryResponse {
  items: DailyReportHistoryEntry[]
  next_cursor?: string | null
}

export interface UseDailyReportHistoryResult {
  items: DailyReportHistoryEntry[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

export function useDailyReportHistory(days = 30): UseDailyReportHistoryResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [items, setItems] = useState<DailyReportHistoryEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }
      try {
        const sp = new URLSearchParams()
        sp.set('days', String(days))
        if (cursor) sp.set('cursor', cursor)
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/history?${sp.toString()}`,
          { headers: agentAuthHeaders() },
        )
        if (!res.ok) throw new Error(`${res.status}`)
        const json = (await res.json()) as DailyReportHistoryResponse
        setItems((prev) => (append ? [...prev, ...(json.items ?? [])] : json.items ?? []))
        setNextCursor(json.next_cursor ?? null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch_failed')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [agencyId, days],
  )

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    setIsLoading(true)
    void fetchPage(null, false)
  }, [agencyId, fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    await fetchPage(nextCursor, true)
  }, [nextCursor, isLoadingMore, fetchPage])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchPage(null, false)
  }, [fetchPage])

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
    refetch,
  }
}

// ----- GET /daily-report/history.csv ---------------------------------------

/**
 * Streams the history CSV as a Blob and triggers a browser download via a
 * temporary <a> element. No new deps. Returns a promise that resolves when
 * the click is dispatched (the download itself runs out-of-band).
 */
export async function downloadHistoryCsv(
  agencyId: string,
  agentUrl: string | undefined = process.env.NEXT_PUBLIC_AGENT_URL,
  days = 30,
): Promise<void> {
  if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
  const res = await globalThis.fetch(
    `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/history.csv?days=${days}`,
    { headers: agentAuthHeaders() },
  )
  if (!res.ok) throw new Error(`${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-report-history-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // Free the blob after a tick so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
