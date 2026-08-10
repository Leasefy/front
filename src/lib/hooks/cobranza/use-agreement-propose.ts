'use client'

/**
 * use-agreement-propose.ts — POST de PROPUESTA (borrador) de acuerdo de pago.
 *
 * Cablea el formulario "Crear acuerdo" al endpoint nuevo del backend del agente:
 *
 *   POST /api/agency/:agencyId/cobranza/agreements/propose
 *
 * El endpoint reutiliza el motor de payment-plans (computeOffer) y devuelve un
 * BORRADOR calculado: descuento aplicado (clamp por política de la agencia),
 * total efectivo, pago inicial, cuotas y el texto del acuerdo. No persiste un
 * plan vivo, no aprueba, no activa, no genera link de pago ni contacta al
 * inquilino (T-323 / Ley 2300): la aprobación es una acción humana aparte que
 * vive en /ai/cobranza/pagos/planes/[planId].
 *
 * Body (el backend valida `.strict()` — SÓLO estos campos):
 *   { debtorId: uuid, stage: CarteraStage, totalDueCop: int>0, interestsCop: int>=0 }
 *
 * Patrón (copiado de use-cartera-overview.ts): "use client"; useAuth() →
 * agency.id; agentAuthHeaders(); base = NEXT_PUBLIC_AGENT_URL; sin URL o sin
 * agencyId → no hace nada (fail-soft). El POST va dentro de try/catch.
 *
 * FAIL-SOFT: el backend aún no está desplegado (Victor aplica migración +
 * deploy). Si el POST responde 404 (ruta inexistente) → marcamos `notDeployed`
 * para que la pantalla muestre un aviso suave y deje el formulario intacto; no
 * rompe ni muestra error feo. Cualquier otro error (validación, 403, red) →
 * mensaje de error legible.
 */

import { useCallback, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'

// ── Shapes (espejo del contrato del backend) ─────────────────────────────────

export type CarteraStage = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'SX'

export type AgreementDiscountKind =
  | 'intereses_total'
  | 'intereses_parcial'
  | 'none'

export interface AgreementProposalInstallment {
  number: number
  /** ISO-8601 datetime. */
  dueDate: string
  amountCop: number
}

/** Borrador devuelto por el endpoint — nada persistido ni activo. */
export interface AgreementProposalDraft {
  isDraft: true
  debtorId: string
  stage: CarteraStage
  discountAppliedPct: number
  discountKind: AgreementDiscountKind
  discountAmountCop: number
  effectiveTotalCop: number
  initialAmountCop: number
  installments: AgreementProposalInstallment[]
  agreementText: string
  agencyMaxDiscountPct: number
  requiresHumanApproval: true
  generatedAt: string
}

export interface ProposeAgreementInput {
  debtorId: string
  stage: CarteraStage
  /** Deuda total en COP (entero positivo). */
  totalDueCop: number
  /** Intereses incluidos en la deuda, en COP (entero ≥ 0). */
  interestsCop: number
}

export interface UseAgreementProposeResult {
  /** Ejecuta el POST. Devuelve el borrador en éxito, o null si falló. */
  propose: (input: ProposeAgreementInput) => Promise<AgreementProposalDraft | null>
  /** POST en vuelo. */
  isSubmitting: boolean
  /** Mensaje de error legible (validación / 403 / red). null si no hay. */
  error: string | null
  /**
   * true cuando el endpoint respondió 404 → backend no desplegado todavía.
   * La pantalla lo usa para mostrar un aviso suave SIN romper el formulario.
   */
  notDeployed: boolean
  /** Limpia error/notDeployed (p.ej. al volver a editar el formulario). */
  reset: () => void
}

export function useAgreementPropose(): UseAgreementProposeResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [notDeployed, setNotDeployed] = useState<boolean>(false)

  const reset = useCallback(() => {
    setError(null)
    setNotDeployed(false)
  }, [])

  const propose = useCallback(
    async (input: ProposeAgreementInput): Promise<AgreementProposalDraft | null> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      // Fail-soft silencioso: sin backend configurado → no se puede proponer.
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
          `${agentUrl}/api/agency/${agencyId}/cobranza/agreements/propose`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({
              debtorId: input.debtorId,
              stage: input.stage,
              totalDueCop: input.totalDueCop,
              interestsCop: input.interestsCop,
            }),
          },
        )

        if (res.status === 404) {
          // Ruta inexistente → backend aún no desplegado. Aviso suave, form intacto.
          setNotDeployed(true)
          return null
        }

        if (!res.ok) {
          // 400 (validación / etapa sin negociación) / 403 (sin permiso) / 503.
          let detail = `${res.status}`
          try {
            const body = (await res.json()) as { error?: string }
            if (body?.error) detail = body.error
          } catch {
            // cuerpo no-JSON → conservamos el código de estado
          }
          setError(detail)
          return null
        }

        const draft = (await res.json()) as AgreementProposalDraft
        return draft
      } catch {
        // Error de red / CORS → degradamos a mensaje legible (form intacto).
        setError('No se pudo crear la propuesta. Verifica tu conexión e inténtalo de nuevo.')
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [agencyId],
  )

  return { propose, isSubmitting, error, notDeployed, reset }
}
