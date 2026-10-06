'use client'

/**
 * use-piloto-opera-sola.ts — las lecturas de «¿Opera sola?» (24-09-2026).
 *
 *   GET /piloto/opera-sola/que-falta   qué le falta a toda la inmobiliaria (al montar: da el punto del botón)
 *   GET /piloto/opera-sola             lo que el Piloto hizo en 30 días (al abrir el cajón)
 *   GET /piloto/preferencias           topes y gracia, con rangos y permiso (al abrir el cajón)
 *
 * Cada lectura por su lado: una que falla no apaga a las otras. 404 =
 * `notAvailable` (un micro anterior a estas rutas), no error. Sin poll: nada
 * de esto cambia solo mientras alguien mira; se recarga al abrir y a mano.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import {
  fetchPilotoActivo,
  fetchPilotoLoQueHizo,
  fetchPilotoPreferencias,
  fetchPilotoQueFalta,
  putPilotoActivo,
  putPilotoPreferencias,
  type CambiosDePreferencias,
  type PilotoActivoResponse,
  type PilotoFetchResult,
  type PilotoLoQueHizoResponse,
  type PilotoPreferenciasResponse,
  type PilotoQueFaltaResponse,
} from '@/lib/api/piloto'

export interface LecturaDelPiloto<T> {
  data: T | null
  isLoading: boolean
  /**
   * El error ENTERO, no su texto (ARREGLOS-4, 03-10-2026): el `ApiError` del
   * micro, el 503 «el asistente de Leasefy no está disponible» de
   * `agentFetch`, el de red o el de «no contestó a tiempo». La pantalla lo dice
   * con `FalloDeCarga` / `mensajeParaLaPersona`. `null` si no falló.
   */
  error: unknown
  notAvailable: boolean
  refetch: () => Promise<void>
}

function useLecturaDelPiloto<T>(
  leer: (agencyId: string, signal: AbortSignal) => Promise<PilotoFetchResult<T>>,
  habilitada: boolean,
): LecturaDelPiloto<T> {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(habilitada)
  const [error, setError] = useState<unknown>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
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
      const res = await leer(agencyId, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err ?? new Error('error'))
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, leer])

  useEffect(() => {
    if (!habilitada) return
    void refetch()
    return () => abortRef.current?.abort()
  }, [habilitada, refetch])

  return { data, isLoading, error, notAvailable, refetch }
}

/** Qué le falta a la inmobiliaria para operar sola. Se lee al montar. */
export function usePilotoQueFalta(): LecturaDelPiloto<PilotoQueFaltaResponse> {
  return useLecturaDelPiloto(fetchPilotoQueFalta, true)
}

/** Lo que el Piloto hizo en los últimos 30 días. Se lee cuando `abierto`. */
export function usePilotoLoQueHizo(abierto: boolean): LecturaDelPiloto<PilotoLoQueHizoResponse> {
  return useLecturaDelPiloto(fetchPilotoLoQueHizo, abierto)
}

export interface UsePilotoPreferenciasResult extends LecturaDelPiloto<PilotoPreferenciasResponse> {
  guardando: boolean
  /**
   * Guarda y, si salió, vuelve a leer (el «quién y cuándo» cambia). `fallo`
   * es el error entero (el 400 trae `campos` para cada tope); `error`, el
   * código viejo (no es para la persona).
   */
  guardar: (cambios: CambiosDePreferencias) => Promise<{ ok: boolean; error?: string; fallo?: unknown }>
}

/** Topes y gracia de la inmobiliaria. Se lee cuando `abierto`. */
export function usePilotoPreferencias(abierto: boolean): UsePilotoPreferenciasResult {
  const lectura = useLecturaDelPiloto(fetchPilotoPreferencias, abierto)
  const { agency } = useAuth()
  const [guardando, setGuardando] = useState(false)
  const { refetch } = lectura
  const guardar = useCallback(
    async (cambios: CambiosDePreferencias) => {
      if (!agency?.id) return { ok: false, error: 'sin_inmobiliaria' }
      setGuardando(true)
      try {
        const r = await putPilotoPreferencias(agency.id, cambios)
        if (r.ok) await refetch()
        return r.ok
          ? { ok: true }
          : { ok: false, ...(r.error ? { error: r.error } : {}), ...(r.fallo !== undefined ? { fallo: r.fallo } : {}) }
      } finally {
        setGuardando(false)
      }
    },
    [agency?.id, refetch],
  )
  return { ...lectura, guardando, guardar }
}

export interface UsePilotoActivoResult extends LecturaDelPiloto<PilotoActivoResponse> {
  cambiando: boolean
  /**
   * Prende o apaga el Piloto de la inmobiliaria (PI-01). Devuelve `fallo`
   * entero: si es `SEGUNDO_FACTOR_RECIENTE`, el diálogo pide el código y lo
   * repite. Si salió, la respuesta ya trae el estado nuevo.
   */
  cambiar: (activo: boolean) => Promise<{ ok: boolean; error?: string; fallo?: unknown }>
}

/** El Piloto automático de la inmobiliaria: ¿activo?, la prueba y lo que le falta. Se lee al montar. */
export function usePilotoActivo(): UsePilotoActivoResult {
  const lectura = useLecturaDelPiloto(fetchPilotoActivo, true)
  const { agency } = useAuth()
  const [cambiando, setCambiando] = useState(false)
  const { refetch } = lectura
  const cambiar = useCallback(
    async (activo: boolean) => {
      if (!agency?.id) return { ok: false, error: 'sin_inmobiliaria' }
      setCambiando(true)
      try {
        const r = await putPilotoActivo(agency.id, activo)
        if (r.ok) await refetch()
        return r.ok
          ? { ok: true }
          : { ok: false, ...(r.error ? { error: r.error } : {}), ...(r.fallo !== undefined ? { fallo: r.fallo } : {}) }
      } finally {
        setCambiando(false)
      }
    },
    [agency?.id, refetch],
  )
  return { ...lectura, cambiando, cambiar }
}
