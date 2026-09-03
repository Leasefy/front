'use client'

/**
 * use-piloto-flota.ts — el modo del Piloto como UNA perilla (píldora del header).
 *
 *   GET /api/agency/{agencyId}/ai-hub/autonomia
 *   PUT /api/agency/{agencyId}/ai-hub/autonomia   {modo}
 *
 * Vive en el header de TODAS las pantallas del panel, así que es barato a
 * propósito: una lectura al montar, un poll cada 60 s (lo «en vivo» —una
 * llamada de Laura, un depósito conciliándose— se refresca sin que pese) y
 * una relectura al volver a la pestaña. `setModo` es optimista con rollback.
 *
 * 404 → `notAvailable` (el micro no publica el endpoint): la píldora no se
 * pinta, no se inventa un estado.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import {
  fetchPilotoFlota,
  putPilotoFlota,
  type AutonomiaModo,
  type PilotoFlotaResponse,
} from '@/lib/api/piloto'

const POLL_MS = 60_000

export interface UsePilotoFlotaResult {
  data: PilotoFlotaResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  /** PUT en vuelo. */
  busy: boolean
  setModo: (modo: AutonomiaModo) => Promise<{ ok: boolean; error?: string; fallidos?: string[] }>
  refetch: () => Promise<void>
}

export function usePilotoFlota(): UsePilotoFlotaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PilotoFlotaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const loadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      setNotAvailable(true)
      setIsLoading(false)
      return
    }
    // Sin agencia todavía (la sesión se está resolviendo) se sigue cargando:
    // marcar «no disponible» acá pintaba un «no pudimos consultar» de medio
    // segundo antes de la primera lectura (visto en el navegador).
    if (!agencyId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (!loadedOnceRef.current) setIsLoading(true)
      const res = await fetchPilotoFlota(agencyId, controller.signal)
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
    const interval = setInterval(() => void fetchData(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  const setModo = useCallback(
    async (modo: AutonomiaModo) => {
      if (!agencyId) return { ok: false, error: 'not_configured' }
      const previa = data
      // Optimista: la píldora cambia YA; si el micro dice que no, vuelve.
      setBusy(true)
      setData((cur) =>
        cur
          ? {
              ...cur,
              modo,
              agentes: cur.agentes.map((a) => ({ ...a, modo, origen: 'piloto' as const })),
              resumen: { sombra: 0, copiloto: 0, autonomo: 0, [modo]: cur.agentes.length },
            }
          : cur,
      )
      const res = await putPilotoFlota(agencyId, modo)
      setBusy(false)
      if (!res.ok) {
        setData(previa)
        return { ok: false, error: res.error }
      }
      if (res.data) {
        const { cambiados, fallidos, ...estado } = res.data
        void cambiados
        setData(estado)
        return { ok: true, fallidos: fallidos.map((f) => f.agente) }
      }
      return { ok: true }
    },
    [agencyId, data],
  )

  return { data, isLoading, error, notAvailable, busy, setModo, refetch: fetchData }
}
