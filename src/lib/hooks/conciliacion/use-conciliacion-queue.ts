'use client'

/**
 * use-conciliacion-queue.ts — Phase 41 frontend wiring.
 *
 * Connects the human review-queue UI to the real Phase 41 backend endpoints:
 *
 *   GET  /api/agency/{agencyId}/conciliacion/queue
 *   POST /api/agency/{agencyId}/conciliacion/queue/{matchId}/confirm
 *   POST /api/agency/{agencyId}/conciliacion/queue/{matchId}/reject
 *   POST /api/agency/{agencyId}/conciliacion/queue/{matchId}/reverse
 *
 * Types are derived from the actual API response shape (conciliacion-queue.ts
 * backend route): ReconciliationMatch rows with an included `movement` relation.
 *
 * Summary is derived client-side from the queue items — the backend exposes no
 * dedicated summary/overview endpoint (Phase 41 scope). A `// TODO(backend):`
 * note marks where a server-side summary endpoint would replace derivation.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── API shapes (matched to conciliacion-queue.ts backend) ─────────────────

/** Embedded BankMovement fields returned by the queue include */
export interface QueueMovement {
  id: string
  amountCop: number
  description: string | null
  reference: string | null
  valueDate: string | null   // ISO date string
  status: string             // 'unmatched' | 'matched' | ...
  source: string             // e.g. 'bancolombia_csv'
}

/**
 * A ReconciliationMatch row as returned by GET .../conciliacion/queue.
 * The backend uses z.record(z.unknown()) for items so we type the known fields.
 */
export interface ConciliacionQueueItem {
  id: string
  tenantId: string
  movementId: string
  domain: string             // contract domain / lease identifier
  matchedAmountCop: number
  confidenceScore: number    // 0–1
  matchLayer: string         // e.g. 'reference_exact' | 'fuzzy_amount' etc.
  status: 'suggested' | 'unidentified' | 'confirmed' | 'rejected' | 'reversed'
  reason: string | null
  decidedBy: string | null
  decidedAt: string | null   // ISO
  createdAt: string          // ISO
  movement: QueueMovement
}

export interface ConciliacionQueueResponse {
  items: ConciliacionQueueItem[]
  total: number
  page: number
  pageSize: number
}

// ── Client-side summary derivation ────────────────────────────────────────
// TODO(backend): replace with a dedicated GET .../conciliacion/summary endpoint
// once the backend exposes aggregate counts.

export interface ConciliacionSummary {
  total: number
  conciliados: number    // confirmed
  parciales: number      // suggested with matchedAmountCop < movement.amountCop
  duplicados: number     // matchLayer contains 'duplicate'
  noIdentificados: number // status === 'unidentified'
  diferencias: number    // suggested + matchedAmountCop !== movement.amountCop (non-partial)
  fueraDeFecha: number   // matchLayer contains 'out_of_window'
}

function deriveQueueSummary(items: ConciliacionQueueItem[]): ConciliacionSummary {
  let conciliados = 0
  let parciales = 0
  let duplicados = 0
  let noIdentificados = 0
  let diferencias = 0
  let fueraDeFecha = 0

  for (const item of items) {
    if (item.status === 'confirmed') {
      conciliados++
      continue
    }
    if (item.status === 'unidentified') {
      noIdentificados++
      continue
    }
    if (item.matchLayer?.includes('duplicate')) {
      duplicados++
      continue
    }
    if (item.matchLayer?.includes('out_of_window')) {
      fueraDeFecha++
      continue
    }
    // suggested: partial vs value difference
    if (item.matchedAmountCop < item.movement.amountCop) {
      parciales++
    } else if (item.matchedAmountCop !== item.movement.amountCop) {
      diferencias++
    }
  }

  return {
    total: items.length,
    conciliados,
    parciales,
    duplicados,
    noIdentificados,
    diferencias,
    fueraDeFecha,
  }
}

// ── Filter shape ───────────────────────────────────────────────────────────

export interface ConciliacionQueueFilters {
  status?: 'suggested' | 'unidentified'
  page?: number
  pageSize?: number
}

// ── Action result ──────────────────────────────────────────────────────────

export interface ActionResult {
  ok: boolean
  error?: string
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseConciliacionQueueResult {
  items: ConciliacionQueueItem[]
  summary: ConciliacionSummary
  total: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  confirmMatch: (matchId: string) => Promise<ActionResult>
  rejectMatch: (matchId: string, reason: string) => Promise<ActionResult>
  reverseMatch: (matchId: string) => Promise<ActionResult>
}

export function useConciliacionQueue(
  filters?: ConciliacionQueueFilters,
): UseConciliacionQueueResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<ConciliacionQueueItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useConciliacionQueue] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    const url = new URL(`${agentUrl}/api/agency/${agencyId}/conciliacion/queue`)
    if (filters?.status) url.searchParams.set('status', filters.status)
    if (filters?.page) url.searchParams.set('page', String(filters.page))
    if (filters?.pageSize) url.searchParams.set('pageSize', String(filters.pageSize))

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url.toString(), {
        headers: agentAuthHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ConciliacionQueueResponse
      setItems(json.items)
      setTotal(json.total)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reconciliation queue')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, filters?.status, filters?.page, filters?.pageSize])

  useEffect(() => {
    if (!agencyId) return
    void fetchData()
  }, [fetchData, agencyId])

  // ── Actions ──────────────────────────────────────────────────────────────

  const confirmMatch = useCallback(
    async (matchId: string): Promise<ActionResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/queue/${matchId}/confirm`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({}),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        await fetchData()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'confirm_failed' }
      }
    },
    [agencyId, fetchData],
  )

  const rejectMatch = useCallback(
    async (matchId: string, reason: string): Promise<ActionResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/queue/${matchId}/reject`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({ reason }),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        await fetchData()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'reject_failed' }
      }
    },
    [agencyId, fetchData],
  )

  const reverseMatch = useCallback(
    async (matchId: string): Promise<ActionResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/queue/${matchId}/reverse`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({}),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        await fetchData()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'reverse_failed' }
      }
    },
    [agencyId, fetchData],
  )

  const summary = deriveQueueSummary(items)

  return {
    items,
    summary,
    total,
    isLoading,
    error,
    refetch: fetchData,
    confirmMatch,
    rejectMatch,
    reverseMatch,
  }
}
