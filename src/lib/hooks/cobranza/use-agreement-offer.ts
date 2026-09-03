'use client'

/**
 * use-agreement-offer.ts — POST que PERSISTE el acuerdo como propuesta.
 *
 *   POST /api/agency/:agencyId/cartera/payment-plans/offer
 *
 * La diferencia con `use-agreement-propose.ts` es la que importa: `propose`
 * SÓLO calcula un borrador (no toca la base), mientras `offer` PERSISTE el
 * plan con `status: 'offered'` + sus cuotas + auditoría. Es lo que hace que
 * «Guardar como propuesta» de verdad guarde algo — antes llamaba a propose y
 * nada quedaba en la base (reportado por Nico 2026-08-25: «no funciona»).
 *
 * NO envía nada al inquilino ni acuña el link de pago definitivo: eso ocurre
 * en la aprobación humana (`/payment-plans/{id}/approve`), que es una acción
 * aparte. Verificado en el handler: offer no contacta al inquilino (T-323 /
 * Ley 2300). El plan queda «Pendiente aprobación», tal como promete el aviso.
 *
 * Body (el backend valida `.strict()`): { agencyId, debtorId, callId,
 * stage, totalDueCop, interestsCop }. El motor calcula descuento/cuotas/
 * inicial según la política de la etapa.
 */

import { useCallback, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'
import type { CarteraStage } from './use-agreement-propose'

export interface AgreementOfferResult {
  planId: string
  paymentUrl: string
  paymentProvider: 'wompi' | 'bold' | 'stub'
  stage: CarteraStage
  discountAppliedPct: number
  discountKind: 'intereses_total' | 'intereses_parcial' | 'none'
  discountAmountCop: number
  effectiveTotalCop: number
  initialAmountCop: number
  installments: Array<{ number: number; dueDate: string; amountCop: number }>
  agreementText: string
}

export interface OfferAgreementInput {
  debtorId: string
  stage: CarteraStage
  totalDueCop: number
  interestsCop: number
}

export interface UseAgreementOfferResult {
  offer: (input: OfferAgreementInput) => Promise<AgreementOfferResult | null>
  isSubmitting: boolean
  error: string | null
  /** 404 → backend no desplegado. Aviso suave, form intacto. */
  notDeployed: boolean
  reset: () => void
}

export function useAgreementOffer(): UseAgreementOfferResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notDeployed, setNotDeployed] = useState(false)

  const reset = useCallback(() => {
    setError(null)
    setNotDeployed(false)
  }, [])

  const offer = useCallback(
    async (input: OfferAgreementInput): Promise<AgreementOfferResult | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) {
        setNotDeployed(true)
        return null
      }
      if (!agencyId) {
        setError('No se pudo identificar la agencia.')
        return null
      }

      setIsSubmitting(true)
      setError(null)
      setNotDeployed(false)
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cartera/payment-plans/offer`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({
              agencyId,
              debtorId: input.debtorId,
              callId: null,
              stage: input.stage,
              totalDueCop: input.totalDueCop,
              interestsCop: input.interestsCop,
            }),
          },
        )
        if (res.status === 404) {
          setNotDeployed(true)
          return null
        }
        if (!res.ok) {
          let detail = `${res.status}`
          try {
            const body = (await res.json()) as { error?: string }
            if (body?.error) detail = body.error
          } catch {
            /* cuerpo no-JSON */
          }
          setError(detail)
          return null
        }
        return (await res.json()) as AgreementOfferResult
      } catch {
        setError('No se pudo guardar la propuesta. Verifica tu conexión e inténtalo de nuevo.')
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [agencyId],
  )

  return { offer, isSubmitting, error, notDeployed, reset }
}
