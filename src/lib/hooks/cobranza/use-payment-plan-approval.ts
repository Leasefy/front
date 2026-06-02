'use client'

/**
 * use-payment-plan-approval.ts — Phase 32 plan 32-08 (COBR-UI-06).
 *
 * Composite hook for the payment-plan approval surface:
 *   - GETs the plan detail + debtor header + agency policy on mount (and every
 *     30s as the polling fallback for Realtime).
 *   - Derives isMaxDiscountExceeded = (plan.proposed.discount > agency.maxDiscount).
 *   - Exposes approvePlan / rejectPlan / modifyPlan mutations.
 *
 * Pattern: useState + useEffect + setInterval(30_000) per Phase 29 inheritance
 * (no SWR). Null-guards on agencyId + NEXT_PUBLIC_AGENT_URL (v2.1 visual smoke
 * env workaround). The hook accepts an optional `canApprove` flag so the
 * permission gate stays a single source of truth in the caller (the UI does
 * canAccess('cobranza','approve') and threads it in).
 *
 * Spec notes:
 *  - The approve endpoint body requires { decision: 'approve', planUpdatedAt }
 *    (PaymentPlanApproveRequest). When planUpdatedAt is unknown we synthesize
 *    it from the local plan.offeredAt — backend rejects stale tokens with 409.
 *  - The reject endpoint requires a canned reject_reason slug (6 values).
 *    Caller-side validation throws an Error before fetch.
 *  - Modificar is a two-step composite: POST /offer (new plan) then POST
 *    /reject(reject_reason='counter_offer') on the CURRENT planId. Note the
 *    typed enum excludes 'counter_offer'; we send it anyway per plan 32-08
 *    spec — server may downgrade to 'other' but the caller's contract is met.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import type { components } from '@/lib/api/generated/agent'

// =============================================================================
// Types
// =============================================================================

export type RejectReasonSlug =
  | 'discount_too_high'
  | 'debtor_history_poor'
  | 'wrong_cuota_count'
  | 'policy_violation'
  | 'out_of_scope'
  | 'other'

const REJECT_REASONS: ReadonlyArray<RejectReasonSlug> = [
  'discount_too_high',
  'debtor_history_poor',
  'wrong_cuota_count',
  'policy_violation',
  'out_of_scope',
  'other',
]

type PlanDetail = components['schemas']['CarteraPaymentPlanDetailResponse']
type DebtorHeader = components['schemas']['CobranzaDebtorDetailHeaderResponse']
type AgencyPolicy = components['schemas']['AgencyPolicyResponse']

/** UI-derived "view" of the plan (proposed/agency/debtor projection). */
export interface PaymentPlanApprovalView {
  planId: string
  status: string
  offeredAt: string
  wompiLink: string | null
  proposed: {
    discount: number
    cuotas: number
    montoPorCuota: number
    fechaPrimerPago: string
    totalDueCop: number
  }
  agency: {
    maxDiscount: number
  }
  debtor: {
    id: string
    nombreMasked: string
    cedulaMasked: string
  }
}

export interface ModifyPlanInput {
  discount: number
  cuotas: number
  montoPorCuota: number
  fechaPrimerPago: string
}

export interface UsePaymentPlanApprovalOptions {
  planId: string
  /** Permission gate from PermissionsContext (canAccess('cobranza','approve')). */
  canApprove?: boolean
}

export interface UsePaymentPlanApprovalResult {
  plan: PaymentPlanApprovalView | null
  isLoading: boolean
  error: string | null
  isMaxDiscountExceeded: boolean
  refetch: () => Promise<void>
  approvePlan: () => Promise<{ wompiLink: string } | { error: string }>
  rejectPlan: (input: {
    reject_reason: RejectReasonSlug | undefined
    reject_comment?: string
  }) => Promise<{ ok: true } | { error: string }>
  modifyPlan: (
    input: ModifyPlanInput,
  ) => Promise<{ ok: true; newPlanId?: string } | { error: string; newPlanId?: string }>
}

// =============================================================================
// Helpers
// =============================================================================

function buildView(
  plan: PlanDetail,
  debtor: DebtorHeader | null,
  policy: AgencyPolicy | null,
): PaymentPlanApprovalView {
  const installments = plan.installments ?? []
  const cuotas = installments.length
  const firstInstallment = installments[0]
  return {
    planId: plan.planId,
    status: plan.status,
    offeredAt: plan.offeredAt,
    wompiLink: plan.paymentUrl,
    proposed: {
      discount: Number(plan.discountAppliedPct ?? 0),
      cuotas,
      montoPorCuota: firstInstallment ? Number(firstInstallment.amountCop) : 0,
      fechaPrimerPago: firstInstallment ? firstInstallment.dueDate : '',
      totalDueCop: Number(plan.totalDueCop ?? 0),
    },
    agency: {
      maxDiscount: Number(policy?.maxDiscountPct ?? 0),
    },
    debtor: {
      id: plan.debtorId,
      nombreMasked: debtor?.fullName ?? '',
      cedulaMasked: debtor?.cedulaMasked ?? '',
    },
  }
}

async function fetchJson(input: string, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, { ...init, headers: agentAuthHeaders(init?.headers) })
}

// =============================================================================
// Hook
// =============================================================================

export function usePaymentPlanApproval(
  options: UsePaymentPlanApprovalOptions,
): UsePaymentPlanApprovalResult {
  const { planId, canApprove = false } = options
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [plan, setPlan] = useState<PaymentPlanApprovalView | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const canApproveRef = useRef<boolean>(canApprove)
  useEffect(() => {
    canApproveRef.current = canApprove
  }, [canApprove])

  const fetchData = useCallback(async (): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[usePaymentPlanApproval] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !planId) {
      setIsLoading(false)
      return
    }
    try {
      const planRes = await fetchJson(
        `${agentUrl}/api/agency/${agencyId}/cartera/payment-plans/${planId}`,
      )
      if (!planRes.ok) throw new Error(`plan ${planRes.status}`)
      const planJson = (await planRes.json()) as PlanDetail

      // Fetch debtor header + policy in parallel (best-effort — failures
      // degrade gracefully to empty masked fields / maxDiscount=0).
      const [debtorRes, policyRes] = await Promise.all([
        fetchJson(
          `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${planJson.debtorId}`,
        ).catch(() => null),
        fetchJson(`${agentUrl}/api/agency/${agencyId}/policy`).catch(() => null),
      ])
      const debtorJson =
        debtorRes && debtorRes.ok ? ((await debtorRes.json()) as DebtorHeader) : null
      const policyJson =
        policyRes && policyRes.ok ? ((await policyRes.json()) as AgencyPolicy) : null

      setPlan(buildView(planJson, debtorJson, policyJson))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment plan')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, planId])

  useEffect(() => {
    if (!agencyId || !planId) return
    void fetchData()
    const id = setInterval(() => void fetchData(), 30_000)
    return () => clearInterval(id)
  }, [fetchData, agencyId, planId])

  // ── Mutations ────────────────────────────────────────────────────────────

  const approvePlan = useCallback(async (): Promise<
    { wompiLink: string } | { error: string }
  > => {
    if (!canApproveRef.current) {
      return { error: 'PERMISSION_DENIED' }
    }
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) {
      return { error: 'ENV_OR_AGENCY_MISSING' }
    }
    const current = plan
    if (!current) return { error: 'NO_PLAN_LOADED' }
    try {
      const res = await fetchJson(
        `${agentUrl}/api/agency/${agencyId}/cartera/payment-plans/${planId}/approve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            decision: 'approve',
            planUpdatedAt: current.offeredAt,
          }),
        },
      )
      if (!res.ok) {
        return { error: `approve ${res.status}` }
      }
      const json = (await res.json()) as components['schemas']['PaymentPlanApproveResponse']
      // Optimistic local update — no second GET.
      setPlan((prev) =>
        prev ? { ...prev, status: 'approved', wompiLink: json.wompiUrl } : prev,
      )
      return { wompiLink: json.wompiUrl }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'approve failed' }
    }
  }, [agencyId, planId, plan])

  const rejectPlan = useCallback(
    async (input: {
      reject_reason: RejectReasonSlug | undefined
      reject_comment?: string
    }): Promise<{ ok: true } | { error: string }> => {
      if (!input.reject_reason) {
        throw new Error('reject_reason is required')
      }
      if (!REJECT_REASONS.includes(input.reject_reason)) {
        throw new Error('invalid reject_reason')
      }
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { error: 'ENV_OR_AGENCY_MISSING' }
      }
      const current = plan
      if (!current) return { error: 'NO_PLAN_LOADED' }
      try {
        const res = await fetchJson(
          `${agentUrl}/api/agency/${agencyId}/cartera/payment-plans/${planId}/reject`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              decision: 'reject',
              reject_reason: input.reject_reason,
              ...(input.reject_comment ? { reject_comment: input.reject_comment } : {}),
              planUpdatedAt: current.offeredAt,
            }),
          },
        )
        if (!res.ok) return { error: `reject ${res.status}` }
        setPlan((prev) => (prev ? { ...prev, status: 'rejected' } : prev))
        return { ok: true }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'reject failed' }
      }
    },
    [agencyId, planId, plan],
  )

  const modifyPlan = useCallback(
    async (
      input: ModifyPlanInput,
    ): Promise<{ ok: true; newPlanId?: string } | { error: string; newPlanId?: string }> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { error: 'ENV_OR_AGENCY_MISSING' }
      }
      const current = plan
      if (!current) return { error: 'NO_PLAN_LOADED' }
      // Hard-cap discount to agency.maxDiscount before sending.
      const clampedDiscount = Math.min(current.agency.maxDiscount, input.discount)

      try {
        // Step 1 — POST /offer with the counter-offer body.
        const offerRes = await fetchJson(
          `${agentUrl}/api/agency/${agencyId}/cartera/payment-plans/offer`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              agencyId,
              debtorId: current.debtor.id,
              callId: null,
              totalDueCop: current.proposed.totalDueCop,
              interestsCop: 0,
              // Counter-offer extras — server may ignore unknown fields.
              discount: clampedDiscount,
              cuotas: input.cuotas,
              montoPorCuota: input.montoPorCuota,
              fechaPrimerPago: input.fechaPrimerPago,
            }),
          },
        )
        if (!offerRes.ok) return { error: `offer ${offerRes.status}` }
        const offerJson = (await offerRes.json()) as { planId?: string }

        // Step 2 — POST /reject on the CURRENT planId. The typed enum has no
        // 'counter_offer' value (the server 400s on it), so use 'other' and
        // carry the intent in reject_comment.
        const rejectRes = await fetchJson(
          `${agentUrl}/api/agency/${agencyId}/cartera/payment-plans/${planId}/reject`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              decision: 'reject',
              reject_reason: 'other',
              reject_comment: 'Counter-offer submitted via Modificar',
              planUpdatedAt: current.offeredAt,
            }),
          },
        )
        if (!rejectRes.ok) {
          // Step 1 already persisted a NEW plan (offerJson.planId) with its own
          // Wompi link. There is no void/delete endpoint, so we cannot roll
          // back — surface the dual-plan state truthfully instead of a bare
          // reject error so the operator (and audit) know both plans may be
          // active. A durable atomic counter-offer needs a new backend endpoint.
          return {
            error: `DUPLICATE_PLAN_RISK: counter-offer ${offerJson.planId ?? '(created)'} exists but original ${planId} could not be rejected (reject ${rejectRes.status}). Both plans may be active — resolve manually.`,
            newPlanId: offerJson.planId,
          }
        }

        setPlan((prev) => (prev ? { ...prev, status: 'counter_offered' } : prev))
        return { ok: true, newPlanId: offerJson.planId }
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'modify failed' }
      }
    },
    [agencyId, planId, plan],
  )

  const isMaxDiscountExceeded =
    plan !== null && plan.proposed.discount > plan.agency.maxDiscount

  return {
    plan,
    isLoading,
    error,
    isMaxDiscountExceeded,
    refetch: fetchData,
    approvePlan,
    rejectPlan,
    modifyPlan,
  }
}
