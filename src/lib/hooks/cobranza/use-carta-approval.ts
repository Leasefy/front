'use client'

/**
 * use-carta-approval.ts — Phase 32 plan 32-09 (COBR-UI-08).
 *
 * Approval state + POST handlers for the operator-side pre-judicial letter flow:
 *   - approve(artifactId, physicalSendMethod, sentToAddress) →
 *     POST /cartera/legal-artifacts/{artifactId}/approve
 *     body per codegen: CarteraPreJudicialApproveRequest = { confirmation: 'yes' }.
 *     response: { artifactId, approved, signedUrl } per CarteraPreJudicialApproveResponse.
 *     The signedUrl from the response IS the 7-day download link (S3 presigned).
 *   - reject(artifactId, reject_reason, reject_comment?) → POST .../reject
 *     body per codegen: CarteraApprovalRejectRequest = { rejectReason, rejectComment? }.
 *
 * ⚠️ Acá vivía una nota que decía que `physicalSendMethod` y `sentToAddress`
 *   se aceptaban «para la compuerta de la UI» pero NO viajaban. Eso convertía
 *   el formulario en una mentira: el panel no deja aprobar hasta que elegís
 *   método de envío y escribís la dirección a la que se manda una carta
 *   PREJURÍDICA, y después los tiraba. Las dos columnas quedaban NULL y la
 *   tabla de Cartas mostraba «—» en «Método de envío» para todas las filas.
 *   Desde 2026-08-10 viajan y el agente las persiste y las deja en `audit_log`.
 *
 *   The 7-day download link is the `signedUrl` field returned by the server
 *   (S3 presigned, TTL enforced server-side) — NOT a derived
 *   `${agentUrl}/.../pdf` URL as the plan suggested.
 */

import { useCallback, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import type { components } from '@/lib/api/generated/agent'

import type { RejectReasonSlug } from '@/components/inmobiliaria/cobranza/approval/RechazarForm'

export type CartaPhysicalSendMethod =
  | 'servicio_472'
  | 'email_only'
  | 'operator_manual'

export type CartaApproveResponse =
  components['schemas']['CarteraPreJudicialApproveResponse']

export interface UseCartaApprovalResult {
  isApproving: boolean
  isRejecting: boolean
  approveResult: CartaApproveResponse | null
  rejectResult: { ok: boolean } | null
  approveError: string | null
  rejectError: string | null
  /** S3 presigned download URL — 7-day TTL enforced server-side. */
  pdfDownloadUrl: string | null
  /** Wall-clock at approve-success — drives client-side TTL countdown. */
  pdfApprovedAt: Date | null
  approve: (
    artifactId: string,
    physicalSendMethod: CartaPhysicalSendMethod,
    sentToAddress: string,
  ) => Promise<void>
  reject: (
    artifactId: string,
    reject_reason: RejectReasonSlug,
    reject_comment?: string,
  ) => Promise<void>
}

/**
 * Va por `agentFetch`, NO por `fetch` a secas: si el token venció mientras la
 * pestaña estaba en segundo plano, el 401 se reintenta una vez con sesión
 * fresca. Con `fetch` crudo la pantalla queda clavada en «Error: 401» sobre
 * datos que sí existen.
 */
async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = agentAuthHeaders(init.headers)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return agentFetch(input, { ...init, headers })
}

export function useCartaApproval(): UseCartaApprovalResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [isRejecting, setIsRejecting] = useState<boolean>(false)
  const [approveResult, setApproveResult] = useState<CartaApproveResponse | null>(null)
  const [rejectResult, setRejectResult] = useState<{ ok: boolean } | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null)
  const [pdfApprovedAt, setPdfApprovedAt] = useState<Date | null>(null)

  const approve = useCallback(
    async (
      artifactId: string,
      physicalSendMethod: CartaPhysicalSendMethod,
      sentToAddress: string,
    ): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !artifactId) {
        setApproveError('ENV_OR_AGENCY_MISSING')
        return
      }
      if (!physicalSendMethod || !sentToAddress.trim()) {
        setApproveError('SEND_METHOD_OR_ADDRESS_MISSING')
        return
      }
      setIsApproving(true)
      setApproveError(null)
      try {
        const res = await authFetch(
          `${agentUrl}/api/agency/${agencyId}/cartera/legal-artifacts/${artifactId}/approve`,
          {
            method: 'POST',
            body: JSON.stringify({
              confirmation: 'yes',
              physicalSendMethod,
              sentToAddress: sentToAddress.trim(),
            }),
          },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          setApproveError(text || `approve ${res.status}`)
          return
        }
        const json = (await res.json()) as CartaApproveResponse
        setApproveResult(json)
        setPdfDownloadUrl(json.signedUrl)
        setPdfApprovedAt(new Date())
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
      artifactId: string,
      reject_reason: RejectReasonSlug,
      reject_comment?: string,
    ): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !artifactId) {
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
          `${agentUrl}/api/agency/${agencyId}/cartera/legal-artifacts/${artifactId}/reject`,
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
    pdfDownloadUrl,
    pdfApprovedAt,
    approve,
    reject,
  }
}

export type UseCartaApprovalReturn = ReturnType<typeof useCartaApproval>
