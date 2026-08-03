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
  // Exception taxonomy (Conciliación build C, additive). Present only once the
  // case_type migration is applied; absent (undefined) until then — the queue
  // route omits it fail-soft, so consumers must treat it as optional.
  caseType?: ConciliacionCaseType | null
  movement: QueueMovement
}

/** The 7 exception taxonomies for the ?caseType= filter (closed set). */
export type ConciliacionCaseType =
  | 'parcial'
  | 'duplicado'
  | 'diferencia_monto'
  | 'fuera_de_fecha'
  | 'sin_identificar'
  | 'multiple'
  | 'comision'

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
  // Exception taxonomy filter (Conciliación build C, additive). Sent as
  // ?caseType= on the queue GET. The backend fails soft (ignores the predicate
  // if the column is missing), so an unmigrated backend simply returns all rows.
  caseType?: ConciliacionCaseType
  page?: number
  pageSize?: number
}

// ── Action result ──────────────────────────────────────────────────────────

export interface ActionResult {
  ok: boolean
  error?: string
}

/** Bank statement CSV formats accepted by POST .../conciliacion/ingest. */
export type IngestBank = 'bancolombia' | 'davivienda'

/** Result of a statement ingest (POST .../conciliacion/ingest → 202). */
export interface IngestResult {
  ok: boolean
  error?: string
  created?: number
  skipped?: number
  processed?: number
  runEnqueued?: boolean
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
  ingestStatement: (bank: IngestBank, csvContent: string) => Promise<IngestResult>
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
    if (filters?.caseType) url.searchParams.set('caseType', filters.caseType)
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
  }, [agencyId, filters?.status, filters?.caseType, filters?.page, filters?.pageSize])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
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

  const ingestStatement = useCallback(
    async (bank: IngestBank, csvContent: string): Promise<IngestResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/ingest`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({ bank, csvContent }),
          },
        )
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
          created?: number
          skipped?: number
          processed?: number
          runEnqueued?: boolean
        }
        if (!res.ok) {
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        // The reconciliation run is enqueued asynchronously (Inngest), so new
        // suggestions surface on a later poll. Refetch to reflect already-persisted
        // rows; the operator can refresh again once matching completes.
        await fetchData()
        return {
          ok: true,
          created: body.created,
          skipped: body.skipped,
          processed: body.processed,
          runEnqueued: body.runEnqueued,
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'ingest_failed' }
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
    ingestStatement,
  }
}
