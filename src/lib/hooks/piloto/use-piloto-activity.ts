'use client'

/**
 * use-piloto-activity.ts — feed global del Piloto automático.
 *
 *   GET /api/agency/{agencyId}/ai-hub/activity?limit=50
 *
 * Mismas convenciones que los hooks de ai/ (use-agent-autonomia.ts):
 * agencyId de useAuth, abort por fetch, 404 → `notAvailable` sin error.
 * Refresco silencioso cada 60s («actividad en vivo»): el skeleton solo se
 * muestra en la PRIMERA carga — un poll que parpadea es peor que uno lento.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoActivity, type ActivityItem } from '@/lib/api/piloto'

const POLL_MS = 60_000

export interface UsePilotoActivityResult {
  items: ActivityItem[]
  isLoading: boolean
  error: string | null
  /** Backend 404 — el feed aún no está publicado (no es un error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoActivity(limit = 50): UsePilotoActivityResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Guard de respuestas viejas: cada fetch aborta el anterior. */
  const abortRef = useRef<AbortController | null>(null)
  /** Skeleton solo en la primera carga; los polls refrescan en silencio. */
  const loadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[usePilotoActivity] NEXT_PUBLIC_AGENT_URL is not configured')
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
      if (!loadedOnceRef.current) setIsLoading(true)
      const res = await fetchPilotoActivity(agencyId, limit, controller.signal)
      if (controller.signal.aborted) return
      setItems(res.data?.items ?? [])
      setNotAvailable(res.notAvailable)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto activity')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, limit])

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

  return { items, isLoading, error, notAvailable, refetch: fetchData }
}
