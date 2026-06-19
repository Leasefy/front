'use client'

/**
 * use-conciliacion-settlements.ts — Conciliación Sala wiring (build C).
 *
 * Connects the "Liquidaciones a propietario" surface to the real Build C
 * owner-settlement endpoints (verified against conciliacion-settlements.ts):
 *
 *   GET  /api/agency/{agencyId}/conciliacion/settlements?status=…   (paginated list)
 *   POST /api/agency/{agencyId}/conciliacion/settlements/generate   (create borrador)
 *   POST /api/agency/{agencyId}/conciliacion/settlements/{id}/approve (T-323 human gate)
 *
 * The settlement records STATE only — money never moves here. netCop is the
 * server's figure-of-record (gross − commission − other). The PAGO real
 * (desembolso/dispersión) is owned by pagos, never by this surface.
 *
 * FAIL-SOFT (regla de oro): the Build C backend may not be deployed yet → the
 * GET can 404 (route absent) or 503 (table absent / stub mode). Every path
 * degrades to the existing EmptyState / empty list — never breaks:
 *   - missing NEXT_PUBLIC_AGENT_URL / no agencyId → isLoading=false, empty (return).
 *   - 404 (route not deployed) / 503 (table absent) → empty list, NO error wall.
 *   - any other non-OK / network error             → empty list (degrade), error set.
 *   Action POSTs that fail return { ok:false, error } so the caller can toast
 *   honestly and leave the row untouched.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── API shapes (matched to conciliacion-settlements.ts backend route) ────────

/** OwnerSettlement.status state machine: borrador → pendiente_aprobacion → aprobado → pagado */
export type SettlementStatus =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'aprobado'
  | 'pagado'

/** The two transitions the approve route may produce (pagado is pagos' job, T-323). */
export type ApproveTargetStatus = 'pendiente_aprobacion' | 'aprobado'

/** An OwnerSettlement row as returned by GET / POST. */
export interface ConciliacionSettlement {
  id: string
  tenantId: string
  propertyId: string | null
  ownerId: string | null
  ownerName: string | null
  period: string
  grossCop: number
  commissionCop: number
  otherDeductionsCop: number
  netCop: number
  status: SettlementStatus
  linkedPayoutId: string | null
  createdAt: string // ISO
}

export interface ConciliacionSettlementsResponse {
  items: ConciliacionSettlement[]
  total: number
  page: number
  pageSize: number
}

// ── Filter shape ─────────────────────────────────────────────────────────────

export interface SettlementsFilters {
  status?: SettlementStatus
  page?: number
  pageSize?: number
}

// ── Action results ───────────────────────────────────────────────────────────

export interface GenerateResult {
  ok: boolean
  error?: string
  settlement?: ConciliacionSettlement
}

export interface ApproveResult {
  ok: boolean
  error?: string
  settlement?: ConciliacionSettlement
}

/** Body for POST .../settlements/generate (real figures the caller has). */
export interface GenerateSettlementInput {
  period: string
  grossCop: number
  commissionCop: number
  otherDeductionsCop?: number
  propertyId?: string
  ownerId?: string
  ownerName?: string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseConciliacionSettlementsResult {
  items: ConciliacionSettlement[]
  total: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  generateSettlement: (input: GenerateSettlementInput) => Promise<GenerateResult>
  approveSettlement: (
    settlementId: string,
    targetStatus: ApproveTargetStatus,
    linkedPayoutId?: string,
  ) => Promise<ApproveResult>
}

export function useConciliacionSettlements(
  filters?: SettlementsFilters,
): UseConciliacionSettlementsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<ConciliacionSettlement[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const status = filters?.status
  const page = filters?.page
  const pageSize = filters?.pageSize

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useConciliacionSettlements] NEXT_PUBLIC_AGENT_URL is not configured')
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

    const url = new URL(`${agentUrl}/api/agency/${agencyId}/conciliacion/settlements`)
    if (status) url.searchParams.set('status', status)
    if (page) url.searchParams.set('page', String(page))
    if (pageSize) url.searchParams.set('pageSize', String(pageSize))

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url.toString(), {
        headers: agentAuthHeaders(),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      // 404 (route not deployed) / 503 (table absent / stub) → graceful empty, NOT an error.
      if (res.status === 404 || res.status === 503) {
        setItems([])
        setTotal(0)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ConciliacionSettlementsResponse
      setItems(json.items)
      setTotal(json.total)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      // Degrade to empty list so the surface shows its EmptyState, never breaks.
      setItems([])
      setTotal(0)
      setError(err instanceof Error ? err.message : 'Failed to fetch settlements')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, status, page, pageSize])

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

  // ── Actions ────────────────────────────────────────────────────────────────

  const generateSettlement = useCallback(
    async (input: GenerateSettlementInput): Promise<GenerateResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/settlements/generate`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(input),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        const settlement = (await res.json()) as ConciliacionSettlement
        await fetchData()
        return { ok: true, settlement }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'generate_failed' }
      }
    },
    [agencyId, fetchData],
  )

  const approveSettlement = useCallback(
    async (
      settlementId: string,
      targetStatus: ApproveTargetStatus,
      linkedPayoutId?: string,
    ): Promise<ApproveResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/settlements/${settlementId}/approve`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({
              targetStatus,
              ...(linkedPayoutId ? { linkedPayoutId } : {}),
            }),
          },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: body.error ?? `${res.status}` }
        }
        const settlement = (await res.json()) as ConciliacionSettlement
        await fetchData()
        return { ok: true, settlement }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'approve_failed' }
      }
    },
    [agencyId, fetchData],
  )

  return {
    items,
    total,
    isLoading,
    error,
    refetch: fetchData,
    generateSettlement,
    approveSettlement,
  }
}
