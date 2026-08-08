'use client'

/**
 * use-disputes.ts — controversias (disputas) de cobranza, agency-wide.
 *
 * Cablea la superficie de Disputas a los endpoints NUEVOS del agente:
 *
 *   GET  /api/agency/:agencyId/cobranza/disputes            — lista (?status filtro)
 *   GET  /api/agency/:agencyId/cobranza/disputes/:id        — detalle
 *   POST /api/agency/:agencyId/cobranza/disputes            — abrir una disputa
 *   POST /api/agency/:agencyId/cobranza/disputes/:id/resolve — resolver (HUMANO, T-323)
 *
 * Una disputa registra una controversia del deudor sobre su saldo/cargo. Abrirla
 * NO pausa la cobranza automáticamente (T-323) — solo deja constancia y, fail-soft,
 * una escalación en la cola humana. Resolverla es HUMANO-only (requiere outcome +
 * nota + el userId del operador) y tampoco reactiva cobranza automáticamente; el
 * backend devuelve una recomendación sobre la que un humano decide.
 *
 * Patrón (copiado de use-cartera-overview.ts / use-promises.ts): "use client";
 * useAuth() → agency.id; agentAuthHeaders() de @/lib/api/agent-auth; base =
 * NEXT_PUBLIC_AGENT_URL; sin URL o sin agencyId → setIsLoading(false) + return
 * (fail-soft, sin warn ruidoso); fetch en try/catch.
 *
 * REGLA DE ORO — FAIL-SOFT: el backend aún no está desplegado (Victor aplica
 * migración + deploy). 404/empty/error → data = null + lista vacía; nunca rompe ni
 * muestra error feo. El propio endpoint ya degrada a 200 con lista vacía si la
 * tabla no está migrada; este hook degrada igual ante cualquier fallo de red.
 */

import { useCallback, useEffect, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'

// ── Shapes (espejo del contrato del backend) ─────────────────────────────────

/** Estados de una disputa — mirror del disputes_status_check del backend. */
export type DisputeStatus = 'open' | 'in_review' | 'resolved'

/** Outcomes de resolución — mirror del disputes_outcome_check del backend. */
export type DisputeOutcome = 'procedente' | 'improcedente' | 'parcial'

export interface CobranzaDispute {
  id: string
  debtor_id: string
  payment_id: string | null
  reason: string
  disputed_amount: number | null
  evidence_url: string | null
  status: string
  outcome: string | null
  opened_by_user_id: string | null
  opened_at: string
  resolved_by_user_id: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
}

interface DisputesListResponse {
  disputes: CobranzaDispute[]
  generatedAt: string
}

/** Cuerpo para abrir una disputa (POST /disputes). */
export interface OpenDisputeBody {
  debtorId: string
  reason: string
  disputedAmount?: number
  evidenceUrl?: string
  paymentId?: string
}

interface OpenDisputeResponse {
  dispute: CobranzaDispute | null
  escalationCreated: boolean
  persisted: boolean
}

/** Cuerpo para resolver una disputa (POST /disputes/:id/resolve). */
export interface ResolveDisputeBody {
  outcome: DisputeOutcome
  resolutionNote: string
  resolvedByUserId: string
}

interface ResolveDisputeResponse {
  id: string
  status: string
  outcome: string
  resolved_at: string
  resolved_by_user_id: string
  recommendation: string
  persisted: boolean
}

/** Resultado de una mutación — la UI muestra errores inline sin romper. */
export interface DisputeMutationResult<T> {
  ok: boolean
  status: number
  data: T | null
}

export interface UseDisputesParams {
  /** Filtro server-side por estado (omitir → todas). */
  status?: DisputeStatus
}

export interface UseDisputesResult {
  disputes: CobranzaDispute[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  /** GET un detalle puntual. null si no existe / 404 / sin backend. */
  getDispute: (id: string) => Promise<CobranzaDispute | null>
  /** POST abrir una disputa. Fail-soft: persisted=false si no migró la tabla. */
  openDispute: (
    body: OpenDisputeBody,
  ) => Promise<DisputeMutationResult<OpenDisputeResponse>>
  /** POST resolver una disputa (HUMANO, T-323). */
  resolveDispute: (
    id: string,
    body: ResolveDisputeBody,
  ) => Promise<DisputeMutationResult<ResolveDisputeResponse>>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDisputes(params: UseDisputesParams = {}): UseDisputesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [disputes, setDisputes] = useState<CobranzaDispute[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const { status } = params

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      // Fail-soft silencioso: sin backend configurado → estado vacío.
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const sp = new URLSearchParams()
      if (status) sp.set('status', status)
      const qs = sp.toString()
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/disputes${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as DisputesListResponse
      setDisputes(Array.isArray(json.disputes) ? json.disputes : [])
      setError(null)
    } catch (err) {
      // Fail-soft: 404/empty/error → lista vacía, sin romper la pantalla.
      setDisputes([])
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, status])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, agencyId])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchData()
  }, [fetchData])

  const getDispute = useCallback(
    async (id: string): Promise<CobranzaDispute | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return null
      try {
        const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/disputes/${id}`)
        if (!res.ok) return null
        return (await res.json()) as CobranzaDispute
      } catch {
        return null
      }
    },
    [agencyId],
  )

  const openDispute = useCallback(
    async (
      body: OpenDisputeBody,
    ): Promise<DisputeMutationResult<OpenDisputeResponse>> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { ok: false, status: 0, data: null }
      }
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/disputes`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(body),
          },
        )
        let data: OpenDisputeResponse | null = null
        try {
          data = (await res.json()) as OpenDisputeResponse
        } catch {
          data = null
        }
        return { ok: res.ok, status: res.status, data }
      } catch {
        return { ok: false, status: 0, data: null }
      }
    },
    [agencyId],
  )

  const resolveDispute = useCallback(
    async (
      id: string,
      body: ResolveDisputeBody,
    ): Promise<DisputeMutationResult<ResolveDisputeResponse>> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { ok: false, status: 0, data: null }
      }
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/disputes/${id}/resolve`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(body),
          },
        )
        let data: ResolveDisputeResponse | null = null
        try {
          data = (await res.json()) as ResolveDisputeResponse
        } catch {
          data = null
        }
        return { ok: res.ok, status: res.status, data }
      } catch {
        return { ok: false, status: 0, data: null }
      }
    },
    [agencyId],
  )

  return {
    disputes,
    isLoading,
    error,
    refetch,
    getDispute,
    openDispute,
    resolveDispute,
  }
}
