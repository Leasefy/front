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
 *
 * 🔴 Auditoría del Piloto (23-09-2026, hallazgo 4): la tarjeta gris de arriba
 * podía quedarse PARA SIEMPRE. Cada poll abortaba la petición en vuelo, y
 * mientras no hubiera cargado una vez `isLoading` seguía en `true`: si el
 * pulso tardaba más de 30 s, nunca terminaba. Ahora:
 *   · un poll con una petición en vuelo se SALTA (no la cancela);
 *   · la petición tiene tope (`TOPE_PULSO_MS`): pasado, es un error que la
 *     tarjeta dice en palabras, con «Reintentar»;
 *   · sólo el desmontaje o un «Reintentar» explícito cancelan, y el
 *     desmontaje suelta la marca de «en vuelo» (si no, el montaje siguiente
 *     se saltaba la lectura: 37 s de esqueleto en dev, 24-09).
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
  /** ¿Hay una lectura en vuelo? Un poll no la pisa: se salta. */
  const enVueloRef = useRef(false)

  const leer = useCallback(
    async (forzar: boolean) => {
      // Sin URL del micro o sin agencia NO se midió nada: «no disponible»,
      // no «no hay nada».
      if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) {
        setNotAvailable(true)
        setIsLoading(false)
        return
      }
      if (enVueloRef.current && !forzar) return
      if (forzar) abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      enVueloRef.current = true
      try {
        if (!loadedOnceRef.current || forzar) setIsLoading(!loadedOnceRef.current)
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
        if (abortRef.current === controller) enVueloRef.current = false
        if (!controller.signal.aborted) setIsLoading(false)
      }
    },
    [agencyId],
  )

  /** El poll: si ya hay una lectura en vuelo, no hace nada. */
  const fetchData = useCallback(() => leer(false), [leer])
  /** «Reintentar»: vuelve a pedir aunque haya algo en vuelo. */
  const refetch = useCallback(() => leer(true), [leer])

  useEffect(() => {
    if (!agencyId) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    void fetchData()
    const interval = setInterval(() => void fetchData(), POLL_MS)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
      // La lectura abortada ya no está «en vuelo»: si no se suelta acá, el
      // montaje siguiente (StrictMode, o volver a la pantalla) se la salta y
      // el esqueleto espera al poll de 30 s (medido el 24-09: 37 s de gris).
      abortRef.current = null
      enVueloRef.current = false
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch }
}
