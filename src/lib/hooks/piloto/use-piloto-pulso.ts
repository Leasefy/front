'use client'

/**
 * use-piloto-pulso.ts — el tablero vivo del Piloto.
 *
 *   GET /api/agency/{agencyId}/ai-hub/pulso
 *   → { estado, titular, enCurso[], alertas[], hoy{} }
 *
 * Poll cada 30 s (la mitad que la bandeja): esto muestra lo que está pasando
 * AHORA — una llamada viva, un chat esperando — y a 60 s se sentiría muerto.
 * El skeleton sale solo en la primera carga; los polls son silenciosos.
 * 404 → `notAvailable` (el micro todavía no publica el endpoint), NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoPulso, type PulsoResponse } from '@/lib/api/piloto'

const POLL_MS = 30_000

export interface UsePilotoPulsoResult {
  data: PulsoResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoPulso(): UsePilotoPulsoResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PulsoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const loadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (!loadedOnceRef.current) setIsLoading(true)
      const res = await fetchPilotoPulso(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto pulso')
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
    const interval = setInterval(() => void fetchData(), POLL_MS)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
