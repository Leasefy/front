'use client'

/**
 * use-estudio-run.ts — Tier-B estudio UX (data hook for the detail page).
 *
 * Reads ONE tenant-scoring run from the functional backend:
 *
 *   GET ${NEXT_PUBLIC_AGENT_URL}/tenant-scoring/{runId}   (NOT under /api/agency)
 *
 * Response: { success, runId, status: 'pending'|'processing'|'completed'|'failed',
 *             data: TenantScoringResult|null, error: string|null }.
 *   - 404 → the run is foreign/missing → `notAvailable = true` (NOT an error;
 *     mirrors use-agent-overview's notAvailable convention).
 *   - 503 → backend stub → surfaced as an error.
 *
 * Polls every 5s via useVisibilityPolling ONLY while status is pending/processing
 * (a completed/failed run is terminal — stop hitting the agent). The UX-only
 * DECISION is derived in the front from the result via deriveEstudioDecision once
 * the run reaches `completed`.
 *
 * Pattern: mirrors use-debtor-detail.ts (useState + useCallback fetch +
 * useVisibilityPolling) with the NEXT_PUBLIC_AGENT_URL + agentAuthHeaders +
 * agency.id null-guards (v2.1 visual smoke env workaround).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import {
  deriveEstudioDecision,
  type TenantScoringResult,
  type EstudioDecision,
} from '@/lib/estudio/decision'

export type EstudioRunStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** Shape of GET /tenant-scoring/:runId. */
export interface TenantScoringRunResponse {
  success: boolean
  runId: string
  status: EstudioRunStatus
  data: TenantScoringResult | null
  error: string | null
}

export interface UseEstudioRunResult {
  /** null until the first response resolves. */
  status: EstudioRunStatus | null
  /** the raw functional result (present once status === 'completed'). */
  result: TenantScoringResult | null
  /** UX-only derived decision — non-null only when status === 'completed'. */
  decision: EstudioDecision | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — el run no existe o no pertenece a esta agencia (NOT an error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useEstudioRun(runId: string): UseEstudioRunResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [status, setStatus] = useState<EstudioRunStatus | null>(null)
  const [result, setResult] = useState<TenantScoringResult | null>(null)
  const [decision, setDecision] = useState<EstudioDecision | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useEstudioRun] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!runId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/tenant-scoring/${encodeURIComponent(runId)}`,
        { headers: agentAuthHeaders() },
      )
      if (res.status === 404) {
        // Run foreign / missing — friendly "no disponible", NOT an error banner.
        setNotAvailable(true)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as TenantScoringRunResponse
      setNotAvailable(false)
      setStatus(json.status)
      const nextResult = json.data ?? null
      setResult(nextResult)
      setDecision(
        nextResult && json.status === 'completed'
          ? deriveEstudioDecision(nextResult)
          : null,
      )
      setError(json.error ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch estudio run')
    } finally {
      setIsLoading(false)
    }
  }, [runId])

  useEffect(() => {
    if (!runId) return
    void fetchData()
  }, [fetchData, runId])

  // Poll only while the run is still in flight; terminal states stop polling.
  const inFlight = status === 'pending' || status === 'processing'
  useVisibilityPolling(
    () => void fetchData(),
    5_000,
    Boolean(runId && inFlight && !notAvailable),
  )

  return { status, result, decision, isLoading, error, notAvailable, refetch: fetchData }
}
