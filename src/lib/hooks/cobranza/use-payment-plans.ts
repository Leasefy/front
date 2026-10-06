'use client'

/**
 * use-payment-plans.ts — los planes de pago (acuerdos con cuotas) de la
 * inmobiliaria: `GET {micro}/api/agency/{agencyId}/cartera/payment-plans`.
 *
 * 🔴 Por qué existe (QA-IA-B, 04-10-2026): «Acuerdos de pago» y «Qué necesita
 * tu atención» buscaban los planes en el embudo de pagos (`/cobranza/pagos`),
 * que sólo trae filas de `agent.payments` y cuyo `paymentPlanId` apunta a una
 * PROMESA. Un plan recién ofrecido no tiene pagos: en el laboratorio había
 * cinco planes y las dos pantallas decían que no había ninguno, y el que
 * esperaba aprobación no le aparecía a nadie para aprobarlo.
 *
 * La ruta es `hide: true` en el contrato público del micro (ver
 * `cartera-payment-plans-lista.ts`), así que el tipo vive acá, calcado del
 * handler.
 *
 * Un fallo NO se disfraza de lista vacía: queda en `fallo` (el `ApiError` de
 * `falloDelMicro`, o el error de red tal cual) para que la pantalla lo diga.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { useAuth } from '@/lib/auth'

/** Los estados de `agent.payment_plans` (CHECK `payment_plans_status_check`). */
export type EstadoDelPlanDePago =
  | 'offered'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'cancelled'

export interface PlanDePagoItem {
  planId: string
  debtorId: string
  debtorName: string
  cedulaMasked: string
  phoneMasked: string
  status: EstadoDelPlanDePago | string
  /** La inmobiliaria ya lo aprobó. */
  aprobado: boolean
  totalDueCop: number
  initialAmountCop: number
  discountAppliedPct: number
  cuotas: number
  cuotasPagadas: number
  proximaCuota: { numero: number; vence: string; valorCop: number } | null
  offeredAt: string
  acceptedAt: string | null
  defaultedAt: string | null
  operatorApprovedAt: string | null
}

export interface UsePaymentPlansResult {
  planes: PlanDePagoItem[]
  isLoading: boolean
  /** Texto corto del fallo (compatibilidad con las tablas que reciben `error: string`). */
  error: string | null
  /** El fallo entero, para `mensajeParaLaPersona` / `FalloDeCarga`. */
  fallo: unknown
  refetch: () => Promise<void>
}

export function usePaymentPlans(params: { status?: readonly EstadoDelPlanDePago[] } = {}): UsePaymentPlansResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [planes, setPlanes] = useState<PlanDePagoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fallo, setFallo] = useState<unknown>(null)
  const controlador = useRef<AbortController | null>(null)
  const estados = params.status?.join(',') ?? ''

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) {
      setIsLoading(false)
      return
    }
    controlador.current?.abort()
    const actual = new AbortController()
    controlador.current = actual
    setIsLoading(true)
    try {
      const qs = estados ? `?status=${encodeURIComponent(estados)}` : ''
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cartera/payment-plans${qs}`, {
        signal: actual.signal,
      })
      if (actual.signal.aborted) return
      if (!res.ok) throw await falloDelMicro(res)
      const json = (await res.json()) as { items?: PlanDePagoItem[] }
      setPlanes(Array.isArray(json.items) ? json.items : [])
      setFallo(null)
    } catch (err) {
      if (actual.signal.aborted) return
      setPlanes([])
      setFallo(err)
    } finally {
      if (!actual.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, estados])

  useEffect(() => {
    void fetchData()
    return () => controlador.current?.abort()
  }, [fetchData])

  const error = fallo == null ? null : fallo instanceof Error ? fallo.message : 'No se pudieron leer los planes de pago'
  return { planes, isLoading, error, fallo, refetch: fetchData }
}
