'use client'

/**
 * use-ajustes-de-la-cobranza.ts — los ajustes de la cobranza de la inmobiliaria
 * (07-10-2026, Nico: «configurable los días»).
 *
 *   GET /api/agency/{agencyId}/cobranza/ajustes  (cobranza:view)
 *   PUT /api/agency/{agencyId}/cobranza/ajustes  (cobranza:approve)
 *
 * `diasDeGraciaDeLaPromesa` (0–60, 7 por defecto): días después de la fecha
 * prometida en que un pago todavía cumple la promesa. Sin la migración del
 * micro, el GET trae los de por defecto con `disponible: false` y el PUT es un
 * 503 `FALTA_UNA_MIGRACION`.
 *
 * `experimentosPrendidos` existe en el contrato, pero la pantalla todavía no lo
 * muestra: no hay experimentos que prender (nada de botones muertos).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import type { components } from '@/lib/api/generated/agent'

export type AjustesDeLaCobranza = components['schemas']['CobranzaAjustes']
export type CambioDeLosAjustes = components['schemas']['CobranzaAjustesCambio']

export interface UseAjustesDeLaCobranza {
  data: AjustesDeLaCobranza | null
  isLoading: boolean
  /** El fallo de la lectura (un `ApiError` del micro o el `TypeError` de red). */
  fallo: unknown
  refetch: () => Promise<void>
  /** Guarda sólo lo que viene. Lanza el `ApiError` del micro si no salió bien. */
  guardar: (cambios: CambioDeLosAjustes) => Promise<AjustesDeLaCobranza>
}

export function useAjustesDeLaCobranza(): UseAjustesDeLaCobranza {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<AjustesDeLaCobranza | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fallo, setFallo] = useState<unknown>(null)

  const leer = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/ajustes`)
      if (!res.ok) throw await falloDelMicro(res)
      setData((await res.json()) as AjustesDeLaCobranza)
      setFallo(null)
    } catch (e) {
      setFallo(e)
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    void leer()
  }, [leer])

  const guardar = useCallback(
    async (cambios: CambioDeLosAjustes): Promise<AjustesDeLaCobranza> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
      if (!agencyId) throw new Error('Agency not available')
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/ajustes`, {
        method: 'PUT',
        headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(cambios),
      })
      if (!res.ok) throw await falloDelMicro(res)
      const guardados = (await res.json()) as AjustesDeLaCobranza
      setData(guardados)
      return guardados
    },
    [agencyId],
  )

  return { data, isLoading, fallo, refetch: leer, guardar }
}
