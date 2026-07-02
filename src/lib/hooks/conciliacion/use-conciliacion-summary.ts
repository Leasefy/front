'use client'

/**
 * use-conciliacion-summary.ts — Conciliación Sala wiring (build C).
 *
 * Reads the server-side typed summary the queue UI previously derived
 * client-side (the `// TODO(backend)` in use-conciliacion-queue.ts):
 *
 *   GET /api/agency/{agencyId}/conciliacion/summary
 *
 * Response shape mirrors conciliacion-summary.ts (verified against the route):
 *   - taxonomy: { parciales, duplicados, diferencias_monto, fuera_de_fecha, sin_identificar }
 *   - totals:   { movimientos, conciliados, en_cola, monto_conciliado_cop }
 *   - tasa_conciliacion: number | null  (conciliados / movimientos × 100, one decimal;
 *                                        null when there are zero movimientos)
 *
 * FAIL-SOFT (the backend may not be deployed yet → 404, or stub-mode → 503):
 *   - missing NEXT_PUBLIC_AGENT_URL / no agencyId → isLoading=false, data=null (return).
 *   - 404 (route not deployed)                    → notAvailable=true, data=null, NO error.
 *   - any other non-OK / network error            → error set, data=null.
 *   The caller degrades to its existing zeros / EmptyState fallback — never breaks.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── API shape (matched to conciliacion-summary.ts backend route) ─────────────

export interface ConciliacionSummaryTaxonomy {
  parciales: number
  duplicados: number
  diferencias_monto: number
  fuera_de_fecha: number
  sin_identificar: number
}

export interface ConciliacionSummaryTotals {
  movimientos: number
  conciliados: number
  en_cola: number
  monto_conciliado_cop: number
}

export interface ConciliacionSummaryResponse {
  tenantId: string
  generatedAt: string
  taxonomy: ConciliacionSummaryTaxonomy
  totals: ConciliacionSummaryTotals
  /** conciliados / movimientos × 100, one decimal; null when no movimientos. */
  tasa_conciliacion: number | null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseConciliacionSummaryResult {
  data: ConciliacionSummaryResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — endpoint not deployed yet (NOT an error; caller falls back). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function useConciliacionSummary(): UseConciliacionSummaryResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<ConciliacionSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useConciliacionSummary] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const url = `${agentUrl}/api/agency/${agencyId}/conciliacion/summary`

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url, {
        headers: agentAuthHeaders(),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (res.status === 404) {
        // Route not deployed yet — graceful, NOT an error.
        setData(null)
        setNotAvailable(true)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ConciliacionSummaryResponse
      setData(json)
      setNotAvailable(false)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setData(null)
      setError(err instanceof Error ? err.message : 'Failed to fetch conciliación summary')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
