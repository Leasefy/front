'use client'

/**
 * use-piloto-procesos.ts — el process view: lo que el Piloto hizo, contado.
 *
 *   GET /api/agency/{agencyId}/ai-hub/procesos?tipo=&limite=
 *
 * Poll adaptativo: cada 15 s mientras haya algo en vivo (una llamada, un
 * depósito conciliándose) y cada 60 s si no — la pantalla tiene que sentirse
 * viva cuando pasa algo, y no martillar al micro cuando no. El skeleton sale
 * solo en la primera carga. 404 → `notAvailable`, no error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import {
  fetchPilotoProcesos,
  type PilotoProcesosResponse,
  type TipoDeProceso,
} from '@/lib/api/piloto'

const POLL_VIVO_MS = 15_000
const POLL_QUIETO_MS = 60_000

export interface UsePilotoProcesosResult {
  data: PilotoProcesosResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  refetch: () => Promise<void>
}

export function usePilotoProcesos(
  tipo: TipoDeProceso | 'todos' = 'todos',
  limite = 60,
): UsePilotoProcesosResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<PilotoProcesosResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const loadedOnceRef = useRef(false)
  const enVivoRef = useRef(0)

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
      const res = await fetchPilotoProcesos(agencyId, { tipo, limite }, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      enVivoRef.current = res.data?.enVivo ?? 0
      setNotAvailable(res.notAvailable)
      setError(null)
      loadedOnceRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, tipo, limite])

  useEffect(() => {
    if (!agencyId) return
    let timer: ReturnType<typeof setTimeout> | null = null
    let vivo = true
    const ciclo = async () => {
      await fetchData()
      if (!vivo) return
      timer = setTimeout(() => void ciclo(), enVivoRef.current > 0 ? POLL_VIVO_MS : POLL_QUIETO_MS)
    }
    void ciclo()
    return () => {
      vivo = false
      if (timer) clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
