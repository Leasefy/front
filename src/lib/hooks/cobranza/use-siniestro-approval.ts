'use client'

/**
 * use-siniestro-approval.ts — Phase 32 plan 32-09 (COBR-UI-07).
 *
 * Approval state + POST handlers for the operator-side siniestro flow:
 *   - approve(claimId, selectedInsurers) → POST /cartera/insurance-claims/{claimId}/approve
 *     body: { selectedInsurers } per CarteraSiniestroApproveRequest (codegen ground truth).
 *     response: { claimId, approved, insurerResults[] } per CarteraSiniestroApproveResponse.
 *   - reject(claimId, reject_reason, reject_comment?) → POST .../reject
 *     body: { rejectReason, rejectComment? } per CarteraApprovalRejectRequest (camelCase, codegen).
 *
 * Null-guards on agency.id + NEXT_PUBLIC_AGENT_URL (v2.1 visual smoke workaround).
 *
 * Deviation note (Rule 1 — codegen ground truth):
 *   Plan 32-09 spec body for approve was `{ confirmation: "yes" }` and reject
 *   used snake_case `reject_reason` / `reject_comment`. The regenerated
 *   `agent.ts` (post-32-06) exposes the operator-side endpoints with the new
 *   schemas `CarteraSiniestroApproveRequest` (`selectedInsurers` array) and
 *   `CarteraApprovalRejectRequest` (camelCase `rejectReason` / `rejectComment`).
 *   This hook follows the typed contract.
 */

import { useCallback, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { getAccessToken } from '@/lib/api/client'
import type { components } from '@/lib/api/generated/agent'

import type { RejectReasonSlug } from '@/components/inmobiliaria/cobranza/approval/RechazarForm'

export type SiniestroInsurer = 'sura' | 'mapfre' | 'solidaria' | 'accion'

export type SiniestroApproveResponse =
  components['schemas']['CarteraSiniestroApproveResponse']
export type SiniestroInsurerResult =
  components['schemas']['CarteraSiniestroInsurerResult']

export interface UseSiniestroApprovalResult {
  isApproving: boolean
  isRejecting: boolean
  approveResult: SiniestroApproveResponse | null
  rejectResult: { ok: boolean } | null
  approveError: string | null
  rejectError: string | null
  /** Snapshot of the insurers the operator selected at approve-time (UI overlay). */
  approvedInsurers: SiniestroInsurer[]
  approve: (claimId: string, selectedInsurers: SiniestroInsurer[]) => Promise<void>
  reject: (
    claimId: string,
    reject_reason: RejectReasonSlug,
    reject_comment?: string,
  ) => Promise<void>
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return globalThis.fetch(input, { credentials: 'include', ...init, headers })
}

export function useSiniestroApproval(): UseSiniestroApprovalResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [isRejecting, setIsRejecting] = useState<boolean>(false)
  const [approveResult, setApproveResult] = useState<SiniestroApproveResponse | null>(
    null,
  )
  const [rejectResult, setRejectResult] = useState<{ ok: boolean } | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [approvedInsurers, setApprovedInsurers] = useState<SiniestroInsurer[]>([])

  const approve = useCallback(
    async (claimId: string, selectedInsurers: SiniestroInsurer[]): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !claimId) {
        setApproveError('ENV_OR_AGENCY_MISSING')
        return
      }
      if (selectedInsurers.length === 0) {
        setApproveError('NO_INSURERS_SELECTED')
        return
      }
      setIsApproving(true)
      setApproveError(null)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cartera/insurance-claims/${claimId}/approve`,
          {
            method: 'POST',
            body: JSON.stringify({ selectedInsurers }),
          },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          setApproveError(text || `approve ${res.status}`)
          return
        }
        const json = (await res.json()) as SiniestroApproveResponse
        setApproveResult(json)
        setApprovedInsurers(selectedInsurers)
      } catch (err) {
        setApproveError(err instanceof Error ? err.message : 'approve failed')
      } finally {
        setIsApproving(false)
      }
    },
    [agencyId],
  )

  const reject = useCallback(
    async (
      claimId: string,
      reject_reason: RejectReasonSlug,
      reject_comment?: string,
    ): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !claimId) {
        setRejectError('ENV_OR_AGENCY_MISSING')
        return
      }
      if (!reject_reason) {
        setRejectError('REJECT_REASON_REQUIRED')
        return
      }
      setIsRejecting(true)
      setRejectError(null)
      try {
        const body: Record<string, string> = { rejectReason: reject_reason }
        if (reject_comment) body.rejectComment = reject_comment
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cartera/insurance-claims/${claimId}/reject`,
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          setRejectError(text || `reject ${res.status}`)
          return
        }
        setRejectResult({ ok: true })
      } catch (err) {
        setRejectError(err instanceof Error ? err.message : 'reject failed')
      } finally {
        setIsRejecting(false)
      }
    },
    [agencyId],
  )

  return {
    isApproving,
    isRejecting,
    approveResult,
    rejectResult,
    approveError,
    rejectError,
    approvedInsurers,
    approve,
    reject,
  }
}

export type UseSiniestroApprovalReturn = ReturnType<typeof useSiniestroApproval>
