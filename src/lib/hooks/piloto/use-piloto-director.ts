'use client'

/**
 * use-piloto-director.ts — las lecturas del DIRECTOR del Piloto (fase 1).
 *
 *   useDirectorHoy()               el plan del día; «Volver a planear» y su espera
 *   useDirectorMetas()             las cinco metas; aceptar / ajustar / pausar
 *   useDirectorGasto(habilitada)   el gasto de IA del mes contra el tope
 *   useDirectorExperimento(hab.)   el grupo de control; prenderlo / apagarlo
 *
 * Mismas reglas que el resto del Piloto: cada lectura por su lado (una que
 * falla no apaga a las otras), 404 = `notAvailable` (un micro sin estas
 * rutas), y el esqueleto sólo en la primera carga.
 *
 * 🔴 El error se guarda ENTERO (no su `.message`): `FalloDeCarga` lo
 * clasifica — un 403 no es un 500, y un «tardó demasiado» tampoco.
 *
 * ── La espera de «Volver a planear» (director-api-front.md) ───────────────
 * El POST responde 202 (arrancó) o 409 (ya había uno en curso). En los dos
 * casos se pregunta `GET …/hoy` cada 5 s hasta que `ciclo.estado` deja de ser
 * `en_curso`, con un máximo de 3 minutos. Pasado el tope se deja de
 * preguntar y se dice («sigue planeando»): no es un error, el ciclo puede
 * terminar después y se verá en la próxima lectura. Un plan que YA viene en
 * curso (el de la mañana, a las 5) se espera igual.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import type { PilotoFetchResult } from '@/lib/api/piloto'
import {
  accionSobreMeta,
  fetchDirectorExperimento,
  fetchDirectorGasto,
  fetchDirectorHoy,
  fetchDirectorMetas,
  postDirectorReplanear,
  putDirectorExperimento,
  type AccionSobreMeta,
  type DirectorExperimento,
  type DirectorGasto,
  type DirectorHoy,
  type DirectorMetas,
  type ResultadoDeExperimento,
  type ResultadoDeMeta,
  type ResultadoDeReplanear,
} from '@/lib/api/piloto-director'

export const CADA_CUANTO_PREGUNTA_MS = 5_000
export const CUANTO_ESPERA_MS = 3 * 60_000

export interface LecturaDelDirector<T> {
  data: T | null
  isLoading: boolean
  /** El error entero (lo que tiró la lectura), o `null`. */
  error: unknown
  notAvailable: boolean
  refetch: () => Promise<void>
}

type Leer<T> = (agencyId: string, signal: AbortSignal) => Promise<PilotoFetchResult<T>>

/**
 * Una lectura del micro. Devuelve además `leerCallado`, que vuelve a leer sin
 * pasar por el esqueleto y entrega lo leído (lo usa la espera del replan), y
 * `ponerDatos` para reemplazar lo que ya se tiene con lo que devolvió una
 * escritura.
 */
function useLectura<T>(leer: Leer<T>, habilitada: boolean) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(habilitada)
  const [error, setError] = useState<unknown>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const cargoUnaVez = useRef(false)

  const leerAhora = useCallback(
    async (conEsqueleto: boolean): Promise<T | null> => {
      if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) {
        setNotAvailable(true)
        setIsLoading(false)
        return null
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        if (conEsqueleto && !cargoUnaVez.current) setIsLoading(true)
        const res = await leer(agencyId, controller.signal)
        if (controller.signal.aborted) return null
        setData(res.data)
        setNotAvailable(res.notAvailable)
        setError(null)
        cargoUnaVez.current = true
        return res.data
      } catch (err) {
        if (controller.signal.aborted) return null
        setError(err)
        return null
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    },
    [agencyId, leer],
  )

  const refetch = useCallback(async () => {
    await leerAhora(true)
  }, [leerAhora])
  const leerCallado = useCallback(() => leerAhora(false), [leerAhora])

  useEffect(() => {
    if (!habilitada) return
    void leerAhora(true)
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [habilitada, leerAhora])

  return { data, isLoading, error, notAvailable, refetch, leerCallado, ponerDatos: setData, agencyId }
}

// ── Hoy ─────────────────────────────────────────────────────────────────────

const leerHoy: Leer<DirectorHoy> = (agencyId, signal) => fetchDirectorHoy(agencyId, {}, signal)

export interface UseDirectorHoy extends LecturaDelDirector<DirectorHoy> {
  /** Se está preguntando cada 5 s por un ciclo en curso. */
  esperando: boolean
  /** Pasaron 3 minutos y seguía en curso: se dejó de preguntar. */
  seCansoDeEsperar: boolean
  /** El POST de «Volver a planear» está en vuelo. */
  pidiendoReplan: boolean
  replanear: () => Promise<ResultadoDeReplanear>
}

export function useDirectorHoy(): UseDirectorHoy {
  const { data, isLoading, error, notAvailable, refetch, leerCallado, agencyId } = useLectura(leerHoy, true)
  const [esperando, setEsperando] = useState(false)
  const [seCansoDeEsperar, setSeCansoDeEsperar] = useState(false)
  const [pidiendoReplan, setPidiendoReplan] = useState(false)

  const relojRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hastaRef = useRef(0)
  const esperandoRef = useRef(false)
  const vivoRef = useRef(true)

  const dejarDeEsperar = useCallback(() => {
    if (relojRef.current) clearTimeout(relojRef.current)
    relojRef.current = null
    esperandoRef.current = false
    if (vivoRef.current) setEsperando(false)
  }, [])

  const preguntar = useCallback(async () => {
    relojRef.current = null
    const leido = await leerCallado()
    if (!vivoRef.current || !esperandoRef.current) return
    // Un fallo de red en medio de la espera no la corta: se sigue preguntando
    // hasta el tope. Sólo un ciclo que ya no está en curso la termina.
    if (leido && leido.ciclo?.estado !== 'en_curso') {
      dejarDeEsperar()
      return
    }
    if (Date.now() >= hastaRef.current) {
      dejarDeEsperar()
      setSeCansoDeEsperar(true)
      return
    }
    relojRef.current = setTimeout(() => void preguntar(), CADA_CUANTO_PREGUNTA_MS)
  }, [leerCallado, dejarDeEsperar])

  const esperar = useCallback(() => {
    if (relojRef.current) clearTimeout(relojRef.current)
    hastaRef.current = Date.now() + CUANTO_ESPERA_MS
    esperandoRef.current = true
    setEsperando(true)
    setSeCansoDeEsperar(false)
    relojRef.current = setTimeout(() => void preguntar(), CADA_CUANTO_PREGUNTA_MS)
  }, [preguntar])

  // Un plan que YA viene en curso (el de la mañana) se espera igual.
  const estado = data?.ciclo?.estado
  useEffect(() => {
    if (estado === 'en_curso' && !esperandoRef.current && !seCansoDeEsperar) esperar()
  }, [estado, esperar, seCansoDeEsperar])

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      if (relojRef.current) clearTimeout(relojRef.current)
      relojRef.current = null
      esperandoRef.current = false
    }
  }, [])

  const replanear = useCallback(async (): Promise<ResultadoDeReplanear> => {
    if (!agencyId) return { estado: 'error', status: 0, error: 'sin_inmobiliaria' }
    setPidiendoReplan(true)
    try {
      const r = await postDirectorReplanear(agencyId)
      if (r.estado !== 'error') esperar()
      return r
    } finally {
      if (vivoRef.current) setPidiendoReplan(false)
    }
  }, [agencyId, esperar])

  const refetchYVolverAEsperar = useCallback(async () => {
    // «Intentar de nuevo» tras el tope: si sigue en curso, se vuelve a esperar.
    setSeCansoDeEsperar(false)
    await refetch()
  }, [refetch])

  return {
    data,
    isLoading,
    error,
    notAvailable,
    refetch: refetchYVolverAEsperar,
    esperando,
    seCansoDeEsperar,
    pidiendoReplan,
    replanear,
  }
}

// ── Metas ───────────────────────────────────────────────────────────────────

const leerMetas: Leer<DirectorMetas> = (agencyId, signal) => fetchDirectorMetas(agencyId, signal)

export interface UseDirectorMetas extends LecturaDelDirector<DirectorMetas> {
  /** `metaId:accion` en vuelo (deshabilita ese botón). */
  enVuelo: string | null
  actuar: (metaId: string, accion: AccionSobreMeta, objetivo?: number) => Promise<ResultadoDeMeta>
}

export function useDirectorMetas(): UseDirectorMetas {
  const { data, isLoading, error, notAvailable, refetch, ponerDatos, agencyId } = useLectura(leerMetas, true)
  const [enVuelo, setEnVuelo] = useState<string | null>(null)

  const actuar = useCallback(
    async (metaId: string, accion: AccionSobreMeta, objetivo?: number): Promise<ResultadoDeMeta> => {
      if (!agencyId) return { ok: false, status: 0, error: 'sin_inmobiliaria' }
      setEnVuelo(`${metaId}:${accion}`)
      try {
        const r = await accionSobreMeta(agencyId, metaId, accion, objetivo)
        if (r.ok) {
          ponerDatos((d) => (d ? { ...d, metas: d.metas.map((m) => (m.id === r.meta.id ? r.meta : m)) } : d))
        }
        return r
      } finally {
        setEnVuelo(null)
      }
    },
    [agencyId, ponerDatos],
  )

  return { data, isLoading, error, notAvailable, refetch, enVuelo, actuar }
}

// ── Gasto y experimento (la configuración, sólo al abrirla) ─────────────────

const leerGasto: Leer<DirectorGasto> = (agencyId, signal) => fetchDirectorGasto(agencyId, {}, signal)
const leerExperimento: Leer<DirectorExperimento> = (agencyId, signal) =>
  fetchDirectorExperimento(agencyId, signal)

export function useDirectorGasto(habilitada: boolean): LecturaDelDirector<DirectorGasto> {
  const { data, isLoading, error, notAvailable, refetch } = useLectura(leerGasto, habilitada)
  return { data, isLoading, error, notAvailable, refetch }
}

export interface UseDirectorExperimento extends LecturaDelDirector<DirectorExperimento> {
  cambiando: boolean
  cambiar: (activo: boolean) => Promise<ResultadoDeExperimento>
}

export function useDirectorExperimento(habilitada: boolean): UseDirectorExperimento {
  const { data, isLoading, error, notAvailable, refetch, ponerDatos, agencyId } = useLectura(
    leerExperimento,
    habilitada,
  )
  const [cambiando, setCambiando] = useState(false)
  const cambiar = useCallback(
    async (activo: boolean): Promise<ResultadoDeExperimento> => {
      if (!agencyId) return { ok: false, status: 0, error: 'sin_inmobiliaria' }
      setCambiando(true)
      try {
        const r = await putDirectorExperimento(agencyId, activo)
        if (r.ok) ponerDatos(r.data)
        return r
      } finally {
        setCambiando(false)
      }
    },
    [agencyId, ponerDatos],
  )
  return { data, isLoading, error, notAvailable, refetch, cambiando, cambiar }
}
