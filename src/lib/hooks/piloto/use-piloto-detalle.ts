'use client'

/**
 * use-piloto-detalle.ts — el detalle de UN ítem, para el cajón.
 *
 *   GET /api/agency/{agencyId}/ai-hub/detalle/{itemId}
 *
 * A diferencia del resto de hooks del piloto, este NO hace poll: el cajón
 * muestra un caso quieto que el usuario está leyendo, y refrescarlo debajo
 * de sus ojos cada 30 s movería el contenido mientras decide. Se recarga a
 * mano (`refetch`) después de ejecutar una acción.
 *
 * `itemId = null` ⇒ el hook no consulta nada (el cajón está cerrado).
 * 404 → `notAvailable`, no error: puede ser un ítem que otra persona ya
 * resolvió mientras la lista estaba en pantalla, y eso no es una falla.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPilotoDetalle, type PilotoDetalle } from '@/lib/api/piloto'

export interface UsePilotoDetalleResult {
  data: PilotoDetalle | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoDetalle(itemId: string | null): UsePilotoDetalleResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PilotoDetalle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!itemId) return
    // Sin URL del micro o sin agencia NO se consultó nada: «no disponible»,
    // nunca un cajón vacío que parezca «este caso no tiene información».
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
      setError(null)
      const res = await fetchPilotoDetalle(agencyId, itemId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch piloto detalle')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, itemId])

  useEffect(() => {
    if (!itemId) {
      // Al cerrar el cajón se limpia todo: si no, al abrir el siguiente ítem
      // se vería un instante el caso ANTERIOR (y sobre ese caso viejo se
      // dibujarían los botones de acción — un clic en la cosa equivocada).
      abortRef.current?.abort()
      setData(null)
      setError(null)
      setNotAvailable(false)
      setIsLoading(false)
      return
    }
    setData(null)
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [itemId, fetchData])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
