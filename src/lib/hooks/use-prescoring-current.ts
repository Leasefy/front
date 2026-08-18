'use client'

/**
 * use-prescoring-current — el estado actual del pre-scoring de afianzamiento.
 *
 * Fuente: `GET /pre-scoring/current` del back principal (contrato firme,
 * Slice 2). Se consume con `apiClient` (Bearer JWT de Supabase), no con
 * `agentAuthHeaders` — este endpoint vive en el back principal, no en el
 * agente.
 *
 * Un 404 significa "todavía no hay una orden para esta cuenta", que es el
 * primer estado del recorrido, no un fallo. `mapEstadoPreScoring(null)`
 * resuelve exactamente a `sin_estudio`, así que no hace falta un caso
 * especial: alcanza con dejar `current` en `null`.
 *
 * Polling: el estudio corre asíncrono del lado del back (consulta a varias
 * aseguradoras), así que mientras el estudio está EN PROCESO se re-pregunta
 * cada 5 min (mínimo que pidió producto). El criterio de "en curso" sale del
 * estado MAPEADO (`en_proceso`), no de `order.status` suelto: el back puede
 * dejar la orden en `STUDY_STARTED` con la evaluación ya `completed`, y en ese
 * caso ya hay resultado (aprobado/rechazado) y no hay nada que esperar. Usar
 * el mapeo — la misma fuente de verdad que pinta la pantalla — evita que el
 * poll y la UI se desalineen y el endpoint quede pegando para siempre. Se
 * corta en cualquier estado terminal (`aprobado`, `rechazado`, `expirado`,
 * `error`) y cuando no hay orden (`sin_estudio`: no hay nada que esperar).
 *
 * Los refrescos del polling son SILENCIOSOS: no tocan `isLoading`. La página
 * muestra un spinner a pantalla completa mientras `isLoading`, así que si cada
 * tick lo prendiera se vería como si la app se recargara. Sólo la primera
 * carga muestra spinner.
 *
 * No solapa: si un fetch sigue en vuelo, el tick del timer no dispara otro
 * (evita carreras si el back tarda más que el intervalo).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { apiClient, ApiError } from '@/lib/api/client'
import {
  mapEstadoPreScoring,
  parsePreScoringCurrent,
  type EstadoPreScoring,
  type PreScoringCurrent,
} from '@/lib/api/prescoring.types'

export interface UsePreScoringCurrentResult {
  current: PreScoringCurrent | null
  estado: EstadoPreScoring
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const POLL_INTERVAL_MS = 300_000

export function usePreScoringCurrent(): UsePreScoringCurrentResult {
  const [current, setCurrent] = useState<PreScoringCurrent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // No es estado de React a propósito: leerlo dentro del tick del interval
  // necesita el valor más reciente sin forzar que el effect de polling se
  // reinicie (y pierda el interval) cada vez que cambia.
  const enVueloRef = useRef(false)

  // `silencioso` = refresco del polling: no toca `isLoading` (ver cabecera).
  const cargar = useCallback(async (silencioso = false) => {
    if (enVueloRef.current) return
    enVueloRef.current = true
    if (!silencioso) setIsLoading(true)
    setError(null)
    try {
      const cruda = await apiClient.get<unknown>('/pre-scoring/current')
      setCurrent(parsePreScoringCurrent(cruda))
    } catch (e) {
      // Sin orden todavía no es un error: es el punto de partida del
      // recorrido, y `mapEstadoPreScoring(null)` ya resuelve a `sin_estudio`.
      if (e instanceof ApiError && e.status === 404) {
        setCurrent(null)
      } else {
        setError(e instanceof Error ? e.message : 'No pudimos cargar tu aprobación.')
        setCurrent(null)
      }
    } finally {
      if (!silencioso) setIsLoading(false)
      enVueloRef.current = false
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Poleo: mientras el estudio está EN PROCESO, se re-pregunta cada
  // `POLL_INTERVAL_MS`. El criterio sale del estado mapeado — la misma fuente
  // de verdad que pinta la pantalla — así el poll para exactamente cuando la
  // UI muestra un resultado terminal, aunque `order.status` no diga
  // `COMPLETED`. `setInterval` corre siempre (para no reiniciarlo en cada
  // render) pero el propio tick decide si vale la pena pedir de nuevo — así el
  // `useEffect` no necesita `current` en sus deps.
  const enCursoRef = useRef(false)
  enCursoRef.current = mapEstadoPreScoring(current) === 'en_proceso'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = setInterval(() => {
      if (enCursoRef.current) void cargar(true)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [cargar])

  return {
    current,
    estado: mapEstadoPreScoring(current),
    isLoading,
    error,
    refetch: () => void cargar(),
  }
}
