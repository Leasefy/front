'use client'

/**
 * use-recovery.ts — Cobranza "Resultados del agente" recovery aggregate.
 *
 *   useRecovery() → GET /api/agency/:agencyId/cobranza/recovery
 *
 * Mismo patrón fail-soft que use-cartera-overview.ts / use-daily-report.ts:
 * sin NEXT_PUBLIC_AGENT_URL o sin agencyId → setIsLoading(false) y return
 * (no rompe, no warn ruidoso). El backend nuevo aún NO está desplegado, así
 * que el endpoint puede responder 404/empty → degradamos a data=null y la
 * pantalla cae a su EmptyState.
 *
 * Cada métrica del backend es OPTIONAL (`null` cuando su señal no existe), así
 * la UI muestra "—" en vez de un número inventado (T-323: no inventar números).
 */

import { useCallback, useEffect, useState } from 'react'

import { agentFetch } from '@/lib/api/agent-fetch'
import { useAuth } from '@/lib/auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'

export interface RecoveryResponse {
  /** valor recuperado (COP) — null cuando no hay señal de pago/recuperación. */
  recoveredValueCop: number | null
  /** Fuente de recoveredValueCop. */
  recoveredValueSource: 'recovery_outcomes' | 'payments' | null
  /** casos cerrados (RecoveryOutcome con outcome terminal). */
  casesClosed: number | null
  /** casos gestionados (deudores con un RecoveryOutcome). */
  casesManaged: number | null
  /** tiempo promedio de recuperación (días). */
  avgRecoveryDays: number | null
  /** tasa de respuesta (%) — promesas que aterrizaron / promesas resueltas. */
  responseRatePct: number | null
  /** promesas cumplidas. */
  promisesKept: number | null
  promisesTotal: number | null
  /** acuerdos cumplidos (planes de pago). */
  agreementsKept: number | null
  agreementsTotal: number | null
  /** casos escalados. */
  casesEscalated: number | null
  /** mora reducida (puntos % — positivo = la mora bajó en la ventana). */
  moraReducedPct: number | null
  moraWindowDays: number
  generatedAt: string
}

export interface UseRecoveryResult {
  data: RecoveryResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecovery(): UseRecoveryResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<RecoveryResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/recovery`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as RecoveryResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchData()
  }, [fetchData, agencyId])

  useVisibilityPolling(fetchData, 30_000, Boolean(agencyId))

  return { data, isLoading, error, refetch: fetchData }
}
