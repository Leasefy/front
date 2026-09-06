'use client'

/**
 * use-piloto-catalogo.ts — el catálogo de TODOS los procesos de la plataforma.
 *
 *   GET /api/agency/{agencyId}/ai-hub/catalogo
 *
 * A diferencia del process view, esto casi no cambia: son definiciones más
 * las huellas de cada proceso. Se lee al montar y al volver a la pestaña, y
 * nada más — no tiene sentido martillar al micro por una tabla que se mueve
 * una vez por hora. 404 → `notAvailable`, no error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoCatalogo, type PilotoCatalogoResponse } from '@/lib/api/piloto'

export interface UsePilotoCatalogoResult {
  data: PilotoCatalogoResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoCatalogo(): UsePilotoCatalogoResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PilotoCatalogoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const loadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    // Sin agencia todavía (la sesión se está resolviendo) se sigue cargando:
    // marcar «no disponible» acá pinta un «no pudimos consultar» de medio
    // segundo antes de la primera lectura.
    if (!agencyId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (!loadedOnceRef.current) setIsLoading(true)
      const res = await fetchPilotoCatalogo(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) return
    void fetchData()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
