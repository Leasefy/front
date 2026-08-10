'use client'

/**
 * use-audit-log.ts — Phase 34 plan 34-07 (D-34-08).
 *
 * Cursor-paginated SWR-style hook for GET /api/agency/:agencyId/cobranza/audit-log
 * with 4 combinable filters: actor, action, from/to (default last 7d), q.
 *
 * Following the project's existing per-hook fetch pattern (no shared
 * agency-fetcher helper). Filter changes reset the cursor + accumulator;
 * loadMore() appends the next page.
 *
 * PII redaction is enforced server-side (Phase 34-04 redactPii() walks
 * payload.details). The frontend renders details as plain JSX text — never
 * dangerouslySetInnerHTML.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { components } from '@/lib/api/generated/agent'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'

/**
 * ⚠️ Esto estaba escrito a mano como `{ items, next_cursor }` y el agente
 * responde `{ entries, nextCursor }`. `json.items` era SIEMPRE `undefined`, así
 * que la Auditoría decía «Sin eventos de auditoría» con 243 filas en la tabla
 * y un 200 OK: la pantalla más importante para responderle a la SIC se veía
 * como si nunca hubiera pasado nada.
 *
 * Se tipa desde el contrato generado. `actor_id`, `entity_type` y `entity_id`
 * son nullables allá y acá se declaraban `string`, que es otra forma de que
 * TypeScript deje pasar un acceso que revienta en runtime.
 */
export type AuditLogResponse = components['schemas']['CobranzaAuditLogPage']
export type AuditLogEntry = AuditLogResponse['entries'][number]

export interface AuditLogFilters {
  /** Actor user id (email) — undefined clears. */
  actor?: string
  /** Audit action enum slug — undefined clears. */
  action?: string
  /** ISO date (YYYY-MM-DD). Default = today - 7d. */
  from?: string
  /** ISO date (YYYY-MM-DD). Default = today. */
  to?: string
  /** Free-text search ≥ 8 chars (cedula_hash_prefix8 OR entity_id UUID-prefix). */
  q?: string
}

export interface UseAuditLogResult {
  items: AuditLogEntry[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

function buildQs(filters: AuditLogFilters, cursor: string | null): string {
  const sp = new URLSearchParams()
  if (filters.actor) sp.set('actor', filters.actor)
  if (filters.action) sp.set('action', filters.action)
  if (filters.from) sp.set('from', filters.from)
  if (filters.to) sp.set('to', filters.to)
  if (filters.q && filters.q.length >= 8) sp.set('q', filters.q)
  if (cursor) sp.set('cursor', cursor)
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/** Stable key for the filter object so the reset-effect only fires on real changes. */
function filterKey(f: AuditLogFilters): string {
  return [f.actor ?? '', f.action ?? '', f.from ?? '', f.to ?? '', f.q ?? ''].join('|')
}

export function useAuditLog(filters: AuditLogFilters): UseAuditLogResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const key = useMemo(() => filterKey(filters), [filters])

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) {
        setError('NEXT_PUBLIC_AGENT_URL not configured')
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }
      if (!agencyId) {
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }
      try {
        const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/audit-log${buildQs(filters, cursor)}`)
        if (!res.ok) throw new Error(`${res.status}`)
        const json = (await res.json()) as AuditLogResponse
        setItems((prev) =>
          append ? [...prev, ...(json.entries ?? [])] : (json.entries ?? []),
        )
        setNextCursor(json.nextCursor ?? null)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch_failed')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    // filters is captured fresh by closure; fetchPage rebuilds when key changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agencyId, key],
  )

  // Reset + initial fetch whenever the filter key OR agencyId changes
  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    setIsLoading(true)
    setItems([])
    setNextCursor(null)
    void fetchPage(null, false)
  }, [agencyId, key, fetchPage])

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
