'use client'

/**
 * use-debtor-memos.ts — Phase 31 plan 31-09 (COBR-UI-03 memos tab).
 *
 * Polling cadence per D-31-17; realtime channel wiring deferred to 31-11.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import type { components } from '@/lib/api/generated/agent'

export type DebtorMemosResponse =
  components['schemas']['CobranzaDebtorMemosResponse']
export type DebtorMemoItem = components['schemas']['CobranzaDebtorMemoItem']

export interface UseDebtorMemosResult {
  data: DebtorMemosResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDebtorMemos(args: { debtorId: string }): UseDebtorMemosResult {
  const { debtorId } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<DebtorMemosResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorMemos] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !debtorId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/memos`)
      if (!res.ok) throw await falloDelMicro(res)
      const json: DebtorMemosResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      // La frase para la persona (antes: «500» crudo detrás del título).
      setError(
        mensajeParaLaPersona(err, {
          porDefecto: 'No pudimos cargar las notas.',
          accion: 'cargar las notas',
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, debtorId])

  useEffect(() => {
    if (!agencyId || !debtorId) return
    void fetchData()
  }, [fetchData, agencyId, debtorId])

  useVisibilityPolling(() => void fetchData(), 30_000, Boolean(agencyId && debtorId))

  return { data, isLoading, error, refetch: fetchData }
}
