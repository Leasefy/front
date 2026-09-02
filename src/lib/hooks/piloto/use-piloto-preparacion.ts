'use client'

/**
 * use-piloto-preparacion.ts — ¿esta inmobiliaria puede operar sola?
 *
 *   GET /api/agency/{agencyId}/ai-hub/preparacion
 *   → { listo, requisitos[] }
 *
 * Sin poll: la respuesta depende de variables de entorno y de la política de
 * la agencia, cosas que no cambian solas mientras alguien mira la pantalla.
 * Se recarga al abrir el panel y a mano.
 *
 * 404 → `notAvailable` (el micro desplegado es anterior a este endpoint), NO
 * error: la torre tiene que seguir funcionando contra un micro más viejo.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoPreparacion, type PreparacionResponse } from '@/lib/api/piloto'

export interface UsePilotoPreparacionResult {
  data: PreparacionResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoPreparacion(): UsePilotoPreparacionResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PreparacionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setIsLoading(true)
      const res = await fetchPilotoPreparacion(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto preparacion')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
