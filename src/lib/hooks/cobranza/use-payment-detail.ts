'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

// Mirrors CobranzaPaymentDetail from the agent backend
// (src/server/routes/agency-cobranza-payment-verify.ts). `status` is a
// free-form TEXT column: pending | approved | declined | voided | refunded |
// self_reported. The self-report / verify metadata is null until the row goes
// through the self-report flow (or the cobranza-UX migration is applied).
export interface PaymentDetailDebtor {
  id: string
  fullName: string
  cedulaMasked: string
  phoneMasked: string
  emailMasked: string | null
}

export interface PaymentDetailResponse {
  id: string
  debtorId: string
  amount: number
  status: string
  paymentMethod: string | null
  paymentProvider: string | null
  paidAt: string | null
  createdAt: string
  selfReportedAt: string | null
  selfReportedBy: string | null
  comprobanteUrl: string | null
  verifiedAt: string | null
  verifiedByUserId: string | null
  debtor: PaymentDetailDebtor
}

// Wire shape the backend returns: { payment: PaymentDetail | null, generatedAt }.
interface PaymentDetailEnvelope {
  payment: PaymentDetailResponse | null
  generatedAt: string
}

export type VerifyAction = 'approve' | 'reject'

export interface UsePaymentDetailArgs {
  paymentId: string
}

export interface UsePaymentDetailResult {
  data: PaymentDetailResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  /**
   * Human verification step (T-323) — ALWAYS triggered by an explicit operator
   * click, never auto. POSTs action="approve"|"reject" then refetches. Returns
   * true on success, false on failure (the page surfaces a non-blocking note).
   */
  verifyPayment: (action: VerifyAction, note?: string) => Promise<boolean>
  isVerifying: boolean
  /**
   * Por qué falló la última verificación: el `ApiError` del micro o el error
   * de la red, tal cual, para `mensajeParaLaPersona`. `null` si la última salió
   * (o no se intentó). Antes el fallo se escribía en `error` —el de la CARGA—
   * como «500» y la pantalla no lo leía: verificar fallaba en silencio.
   */
  falloDeVerificacion: unknown
  /** El fallo de la verificación todavía «sin avisar»: la pantalla lo limpia al mostrarlo. */
  limpiarFalloDeVerificacion: () => void
}

export function usePaymentDetail({ paymentId }: UsePaymentDetailArgs): UsePaymentDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<PaymentDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [falloDeVerificacion, setFalloDeVerificacion] = useState<unknown>(null)
  const limpiarFalloDeVerificacion = useCallback(() => setFalloDeVerificacion(null), [])

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      // Fail-soft: backend not configured → render the EmptyState fallback.
      setIsLoading(false)
      return
    }
    if (!agencyId || !paymentId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/pagos/${paymentId}`)
      // Fail-soft: 404 (not found / cross-tenant / unmigrated) degrades to the
      // EmptyState, NOT an error banner.
      if (res.status === 404) {
        setData(null)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json: PaymentDetailEnvelope = await res.json()
      setData(json.payment ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment detail')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, paymentId])

  const verifyPayment = useCallback(
    async (action: VerifyAction, note?: string): Promise<boolean> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !paymentId) return false
      setIsVerifying(true)
      setFalloDeVerificacion(null)
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/pagos/${paymentId}/verify`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(note ? { action, note } : { action }),
          },
        )
        if (!res.ok) {
          setFalloDeVerificacion(await falloDelMicro(res))
          return false
        }
        await fetchData()
        return true
      } catch (err) {
        // Un `fetch` que no salió llega tal cual (el traductor lo lee como conexión).
        setFalloDeVerificacion(err)
        return false
      } finally {
        setIsVerifying(false)
      }
    },
    [agencyId, paymentId, fetchData],
  )

  useEffect(() => {
    if (!agencyId || !paymentId) {
      setIsLoading(false)
      return
    }
    fetchData()
  }, [fetchData, agencyId, paymentId])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    verifyPayment,
    isVerifying,
    falloDeVerificacion,
    limpiarFalloDeVerificacion,
  }
}
