'use client'

/**
 * use-piloto-tendencias.ts — las tendencias del centro de mando del piloto
 * automático (MANDO-DATOS, 05-10-2026):
 *
 *   GET /api/agency/{agencyId}/ai-hub/tendencias
 *
 * Lo recuperado por día (30 días), las acciones por día y por agente (14),
 * las horas ahorradas (medidas + estimadas) y la mora de más de 30 días. Cada
 * pieza puede venir `null` (la pantalla dice «sin dato»). Son series del día:
 * se vuelven a pedir cada cinco minutos con la pestaña a la vista. 404 →
 * `notAvailable` (un micro anterior), no es un error.
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import { AuthContext } from '@/lib/auth/auth-context'
import { fetchPilotoTendencias, type PilotoTendencias } from '@/lib/api/piloto'

/** Cada cuánto se refrescan (ms). */
export const CADA_CUANTO_TENDENCIAS_MS = 5 * 60_000

export interface UsePilotoTendenciasResult {
  data: PilotoTendencias | null
  isLoading: boolean
  /** El error ENTERO (la pantalla lo dice con `FalloDeCarga`). `null` si no falló. */
  error: unknown
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoTendencias(): UsePilotoTendenciasResult {
  // Sin proveedor de sesión (una prueba que monta la pantalla sola) no se pide nada, en vez de reventar.
  const agencyId = useContext(AuthContext)?.agency?.id ?? null

  const [data, setData] = useState<PilotoTendencias | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setIsLoading(true)
      const res = await fetchPilotoTendencias(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err ?? new Error('No se pudieron leer las tendencias del piloto automático'))
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
    const reloj = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void fetchData()
    }, CADA_CUANTO_TENDENCIAS_MS)
    return () => {
      clearInterval(reloj)
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
