'use client'

/**
 * use-piloto-inbox.ts — la bandeja única priorizada del Piloto automático.
 *
 *   GET /api/agency/{agencyId}/ai-hub/inbox
 *   → { items: InboxItem[], total, porPrioridad: {alta,media,baja} }
 *
 * Poll cada 60s (contrato §5: badge y bandeja se refrescan a ese ritmo).
 * El skeleton solo aparece en la primera carga; los polls son silenciosos.
 * 404 → `notAvailable` (bandeja aún no publicada), NO error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoInbox, type InboxItem } from '@/lib/api/piloto'

const POLL_MS = 60_000

const POR_PRIORIDAD_VACIO = { alta: 0, media: 0, baja: 0 }

export interface UsePilotoInboxResult {
  items: InboxItem[]
  total: number
  porPrioridad: { alta: number; media: number; baja: number }
  isLoading: boolean
  error: string | null
  /** Backend 404 — la bandeja aún no está publicada (no es un error). */
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoInbox(): UsePilotoInboxResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<InboxItem[]>([])
  const [total, setTotal] = useState(0)
  const [porPrioridad, setPorPrioridad] = useState(POR_PRIORIDAD_VACIO)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Guard de respuestas viejas: cada fetch aborta el anterior. */
  const abortRef = useRef<AbortController | null>(null)
  /** Skeleton solo en la primera carga; los polls refrescan en silencio. */
  const loadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[usePilotoInbox] NEXT_PUBLIC_AGENT_URL is not configured')
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
      const res = await fetchPilotoInbox(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setItems(res.data?.items ?? [])
      setTotal(res.data?.total ?? 0)
      setPorPrioridad(res.data?.porPrioridad ?? POR_PRIORIDAD_VACIO)
      setNotAvailable(res.notAvailable)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto inbox')
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

  return { items, total, porPrioridad, isLoading, error, notAvailable, refetch: fetchData }
}
