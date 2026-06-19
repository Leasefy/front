'use client'

/**
 * use-conciliacion-bulk.ts — Conciliación bulk action wiring (Build C).
 *
 * Connects the human review-queue UI to the batch confirmation endpoint:
 *
 *   POST /api/agency/{agencyId}/conciliacion/queue/bulk-confirm
 *     body: { matchIds: string[] }            — confirm an explicit set, OR
 *           { filter: { minConfidence: f } }  — confirm every suggested match
 *                                                at/above a confidence floor.
 *
 * The backend (conciliacion-bulk.ts) enforces:
 *   - HIGH-CONFIDENCE ONLY (server floor 0.8). Below-floor ids land in fallidos[]
 *     (reason='below_confidence_floor'); a filter.minConfidence below the floor is
 *     a 400.
 *   - EXACTLY ONE of matchIds | filter (refine).
 *   - Idempotent, per-match isolated. Reuses the single-confirm commit path.
 *   - T-323: a human triggers the batch — there is no auto path.
 *
 * Fail-soft contract (REGLA DE ORO): the endpoint may 404 until the backend is
 * merged/deployed. Every call returns a structured { ok } result and never
 * throws — the caller degrades to the current screen state (no row confirmed,
 * honest error toast) rather than breaking.
 *
 * Mirrors the NEXT_PUBLIC_AGENT_URL + agentAuthHeaders pattern of
 * use-conciliacion-queue.ts.
 */

import { useCallback } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

/**
 * Server-side high-confidence floor mirrored from the backend
 * (conciliacion-bulk.ts HIGH_CONFIDENCE_FLOOR). The UI uses it to pre-select /
 * label which matches are bulk-confirmable; the backend re-enforces it
 * authoritatively, so this is only a UX hint.
 */
export const BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR = 0.8

// ── Result shape ─────────────────────────────────────────────────────────────

/** Per-match failure as returned by the backend ({ matchId, reason }). */
export interface BulkConfirmFailure {
  matchId: string
  reason: string
}

/** Outcome of a bulk-confirm call. `ok=false` → wiring/transport/backend error. */
export interface BulkConfirmResult {
  ok: boolean
  /** Count of matches successfully confirmed (0 when ok=false). */
  confirmados: number
  /** Per-match failures (below_confidence_floor | not_found | …). */
  fallidos: BulkConfirmFailure[]
  /** Transport / backend error code when ok=false (e.g. '404', 'not_configured'). */
  error?: string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseConciliacionBulkResult {
  /** Confirm an explicit set of high-confidence suggested matches. */
  bulkConfirmByIds: (matchIds: string[]) => Promise<BulkConfirmResult>
  /** Confirm every suggested match at/above a confidence floor (>= 0.8). */
  bulkConfirmByConfidence: (minConfidence: number) => Promise<BulkConfirmResult>
}

export function useConciliacionBulk(): UseConciliacionBulkResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<BulkConfirmResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { ok: false, confirmados: 0, fallidos: [], error: 'not_configured' }
      }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/queue/bulk-confirm`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(body),
          },
        )
        const json = (await res.json().catch(() => ({}))) as {
          error?: string
          confirmados?: number
          fallidos?: BulkConfirmFailure[]
        }
        if (!res.ok) {
          return {
            ok: false,
            confirmados: 0,
            fallidos: Array.isArray(json.fallidos) ? json.fallidos : [],
            error: json.error ?? `${res.status}`,
          }
        }
        return {
          ok: true,
          confirmados: typeof json.confirmados === 'number' ? json.confirmados : 0,
          fallidos: Array.isArray(json.fallidos) ? json.fallidos : [],
        }
      } catch (err) {
        return {
          ok: false,
          confirmados: 0,
          fallidos: [],
          error: err instanceof Error ? err.message : 'bulk_confirm_failed',
        }
      }
    },
    [agencyId],
  )

  const bulkConfirmByIds = useCallback(
    (matchIds: string[]) => post({ matchIds }),
    [post],
  )

  const bulkConfirmByConfidence = useCallback(
    (minConfidence: number) => post({ filter: { minConfidence } }),
    [post],
  )

  return { bulkConfirmByIds, bulkConfirmByConfidence }
}
