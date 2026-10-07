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
 * stage, totalDueCop, interestsCop, initialAmountCop?, installmentCount?,
 * firstDueDate? }. Con lo pedido, el plan es ése si cabe en la política de la
 * etapa (si no, 400 con `campos`); sin él, el motor calcula descuento/cuotas/
 * inicial según la política (CB-05).
 */

import { useCallback, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
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
  /**
   * 🔴 CB-05 (QA-PAGOS-95 r2): lo que la persona escribió. Antes no viajaba y el
   * micro guardaba lo de la política (o «pago único») aunque la vista previa
   * mostrara otra cosa. El micro lo valida contra la política de la etapa: si
   * no cabe, 400 con `campos` (cada uno bajo su campo).
   */
  initialAmountCop?: number
  /** Cuotas después de la inicial (0 = pago único). */
  installmentCount?: number
  /** `AAAA-MM-DD`: vencimiento de la primera cuota. */
  firstDueDate?: string
}

export interface UseAgreementOfferResult {
  offer: (input: OfferAgreementInput) => Promise<AgreementOfferResult | null>
  isSubmitting: boolean
  /**
   * Lo que se le dice a la persona cuando no se guardó, ya traducido
   * (`mensajeParaLaPersona`): un 400 dice qué está mal, un 5xx que fue
   * nuestro (con la referencia) y «conexión» sólo si el `fetch` no salió.
   */
  error: string | null
  /** El error tal cual (el `ApiError` del micro o el de la red), por si la pantalla lo necesita. */
  fallo: unknown
  /** 404 → backend no desplegado. Aviso suave, form intacto. */
  notDeployed: boolean
  reset: () => void
}

export function useAgreementOffer(): UseAgreementOfferResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallo, setFallo] = useState<unknown>(null)
  const [notDeployed, setNotDeployed] = useState(false)

  const reset = useCallback(() => {
    setError(null)
    setFallo(null)
    setNotDeployed(false)
  }, [])

  const registrarFallo = useCallback((e: unknown) => {
    setFallo(e)
    setError(
      mensajeParaLaPersona(e, {
        porDefecto: 'No pudimos guardar la propuesta.',
        accion: 'guardar la propuesta',
      }),
    )
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
      setFallo(null)
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
              ...(input.initialAmountCop !== undefined ? { initialAmountCop: input.initialAmountCop } : {}),
              ...(input.installmentCount !== undefined ? { installmentCount: input.installmentCount } : {}),
              ...(input.firstDueDate ? { firstDueDate: input.firstDueDate } : {}),
            }),
          },
        )
        if (res.status === 404) {
          setNotDeployed(true)
          return null
        }
        if (!res.ok) {
          // Antes se pintaba el `error` del cuerpo (un código en inglés) o el
          // status crudo («500»).
          registrarFallo(await falloDelMicro(res))
          return null
        }
        return (await res.json()) as AgreementOfferResult
      } catch (e) {
        // Un `fetch` que no salió llega tal cual: el traductor lo lee como
        // conexión. Cualquier otra cosa NO es la conexión.
        registrarFallo(e)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [agencyId, registrarFallo],
  )

  return { offer, isSubmitting, error, fallo, notDeployed, reset }
}
