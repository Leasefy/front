'use client'

/**
 * use-piloto-briefing.ts — el briefing del día que escribe el Gerente.
 *
 *   GET /api/agency/{agencyId}/ai-hub/briefing
 *
 * El contrato no fija el shape (§4: «si ya existe se conserva; el Gerente lo
 * alimenta»), así que el tipo es defensivo (PilotoBriefing) y la tarjeta
 * decide qué listar. 404 → `notAvailable`, NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoBriefing, type PilotoBriefing } from '@/lib/api/piloto'

export interface UsePilotoBriefingResult {
  data: PilotoBriefing | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — el Gerente aún no publica briefing (no es un error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoBriefing(): UsePilotoBriefingResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PilotoBriefing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Guard de respuestas viejas: cada fetch aborta el anterior. */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[usePilotoBriefing] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setIsLoading(true)
      const res = await fetchPilotoBriefing(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto briefing')
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
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
