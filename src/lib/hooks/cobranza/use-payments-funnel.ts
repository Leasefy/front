'use client'

/**
 * use-payments-funnel.ts — Phase 32 plan 32-07 (COBR-UI-05).
 *
 * Cursor-paginated payments funnel hook. Mirrors use-debtor-list.ts pattern:
 * useState + useEffect + useRef + setInterval; NO SWR (not a mvp dep).
 *
 * Behavior:
 *  - First page: GET …/cobranza/pagos?<filters>
 *  - loadMore: GET …/cobranza/pagos?<filters>&cursor=<prev.nextCursor>
 *  - Changing any filter resets rows = [], cursor = null, re-fetches page 1
 *  - Polls page 1 every 30s; polling REPLACES page 1 only — operator scroll
 *    position preserved across already-loaded subsequent pages
 *  - KPIs (atomic snapshot from server) refresh on every page-1 fetch
 *  - When NEXT_PUBLIC_AGENT_URL is unset: console.warn + isLoading=false +
 *    return immediately (no rows, no kpis)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { paths } from '@/lib/api/generated/agent'

// ── Derived types ───────────────────────────────────────────────────────────

type PaymentsFunnelOp = paths['/api/agency/{agencyId}/cobranza/pagos']['get']

export type PaymentsFunnelResponse =
  PaymentsFunnelOp['responses']['200']['content']['application/json']

export type PaymentsFunnelItem = PaymentsFunnelResponse['items'][number]
export type PaymentsFunnelKpis = PaymentsFunnelResponse['kpis']

export type PaymentsFunnelSort = 'created_at' | 'amount' | 'disbursement_pending_days'

export interface UsePaymentsFunnelFilters {
  /** provider CSV ("wompi,bold") or single ("wompi") */
  provider?: string
  /** status CSV ("approved,pending") */
  status?: string
  /** 'pending' | 'settled' — derived disbursement state */
  disbursementState?: 'pending' | 'settled'
  /** UI date-window selector — translated to date_from on the wire. */
  dateWindow?: 'today' | '7d' | '30d' | '90d' | 'mtd'
  /** sort dimension — defaults to created_at on the server */
  sort?: PaymentsFunnelSort
}

export interface UsePaymentsFunnelResult {
  rows: PaymentsFunnelItem[]
  kpis: PaymentsFunnelKpis | null
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  generatedAt: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Translate a UI date-window selector into an ISO date_from string. */
function dateWindowToDateFrom(window: UsePaymentsFunnelFilters['dateWindow']): string | undefined {
  if (!window) return undefined
  const now = new Date()
  switch (window) {
    case 'today': {
      const d = new Date(now)
      d.setUTCHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    case 'mtd': {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
      return d.toISOString()
    }
    default:
      return undefined
  }
}

function buildQs(filters: UsePaymentsFunnelFilters, cursor: string | null): string {
  const qs = new URLSearchParams()
  if (filters.provider) qs.set('provider', filters.provider)
  if (filters.status) qs.set('status', filters.status)
  if (filters.disbursementState) qs.set('disbursement_state', filters.disbursementState)
  if (filters.sort) qs.set('sort', filters.sort)
  const dateFrom = dateWindowToDateFrom(filters.dateWindow)
  if (dateFrom) qs.set('date_from', dateFrom)
  if (cursor) qs.set('cursor', cursor)
  return qs.toString()
}

/** Stable serialization of filters for useEffect dep arrays. */
function serializeFilters(f: UsePaymentsFunnelFilters): string {
  return JSON.stringify({
    provider: f.provider ?? '',
    status: f.status ?? '',
    disbursementState: f.disbursementState ?? '',
    dateWindow: f.dateWindow ?? '',
    sort: f.sort ?? '',
  })
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function usePaymentsFunnel(
  filters: UsePaymentsFunnelFilters = {},
): UsePaymentsFunnelResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [rows, setRows] = useState<PaymentsFunnelItem[]>([])
  const [kpis, setKpis] = useState<PaymentsFunnelKpis | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const filtersKey = serializeFilters(filters)
  const loadMoreInFlight = useRef<boolean>(false)
  const hasLoadedFirstPage = useRef<boolean>(false)

  // ── Page 1 fetch (initial + filter change + polling) ──────────────────────
  const fetchFirstPage = useCallback(async (): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[usePaymentsFunnel] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    const qs = buildQs(filters, null)
    const suffix = qs ? `?${qs}` : ''
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/pagos${suffix}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as PaymentsFunnelResponse
      setRows((prev) => {
        if (!hasLoadedFirstPage.current) {
          return json.items
        }
        // Polling refresh: replace page-1 slice, preserve any appended tail.
        const newFirstSize = json.items.length
        const tail = prev.slice(newFirstSize)
        return [...json.items, ...tail]
      })
      setKpis(json.kpis)
      setNextCursor(json.nextCursor)
      setGeneratedAt(json.generatedAt)
      setError(null)
      hasLoadedFirstPage.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments funnel')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, filtersKey])

  // ── Filter change / mount: reset and refetch ──────────────────────────────
  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    hasLoadedFirstPage.current = false
    setRows([])
    setNextCursor(null)
    void fetchFirstPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, filtersKey])

  // ── 30s polling of page 1 only (tab-visibility-gated) ─────────────────────
  useVisibilityPolling(
    () => void fetchFirstPage(),
    30_000,
    Boolean(agencyId && process.env.NEXT_PUBLIC_AGENT_URL),
  )

  // ── loadMore: append next cursor page ─────────────────────────────────────
  const loadMore = useCallback(async (): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return
    if (!nextCursor) return
    if (loadMoreInFlight.current) return

    loadMoreInFlight.current = true
    setIsLoadingMore(true)
    try {
      const qs = buildQs(filters, nextCursor)
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/pagos?${qs}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as PaymentsFunnelResponse
      setRows((prev) => [...prev, ...json.items])
      setNextCursor(json.nextCursor)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more payments')
    } finally {
      setIsLoadingMore(false)
      loadMoreInFlight.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, nextCursor, filtersKey])

  return {
    rows,
    kpis,
    isLoading,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
    refetch: fetchFirstPage,
    generatedAt,
  }
}
