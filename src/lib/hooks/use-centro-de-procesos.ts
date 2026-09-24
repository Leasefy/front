'use client'

/**
 * Lo que lee el centro de procesos, con su propio ritmo de consulta.
 *
 * Con algo corriendo pregunta cada `MS_CON_ALGO_VIVO` —el anillo del header
 * tiene que moverse—; quieto, cada `MS_QUIETO`, para enterarse de lo que
 * lanzó otra persona del equipo o una cola. Con la pestaña oculta no
 * pregunta: nadie está mirando.
 *
 * `anunciarProceso()` (en `procesos.service.ts`) lo despierta: durante
 * `MS_DE_VIGILIA` pregunta seguido aunque la lista todavía no traiga nada
 * activo, porque la fila nace en el back un instante después de que la
 * pantalla lanzó el proceso.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { alCambiar } from '@/lib/api/refresco-de-datos'
import { procesosApi, RECURSO_DE_PROCESOS } from '@/lib/api/procesos.service'
import type { FiltrosDeProcesos, ListaDeProcesos } from '@/lib/api/procesos.types'

export const MS_CON_ALGO_VIVO = 3_000
export const MS_QUIETO = 60_000
export const MS_DE_VIGILIA = 20_000

/**
 * Los recursos cuyo cambio puede haber cerrado un proceso: el cliente HTTP los
 * invalida cuando termina el POST que lo lanzó (`recursoDe(path)`).
 */
const RECURSOS_QUE_LANZAN = [
  RECURSO_DE_PROCESOS,
  'contabilidad',
  'lotes-de-dispersion',
  'facturacion',
  'contracts',
  'inmuebles',
]

export interface EstadoDelCentro {
  data: ListaDeProcesos | null
  error: string | null
  /** Lo que tiró el catch, para `FalloDeCarga`. */
  fallo: unknown
  cargando: boolean
  refetch: () => Promise<void>
}

export function useCentroDeProcesos(
  filtros: FiltrosDeProcesos = {},
  opciones: { activo?: boolean } = {},
): EstadoDelCentro {
  const activo = opciones.activo ?? true
  const [data, setData] = useState<ListaDeProcesos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fallo, setFallo] = useState<unknown>(null)
  const [cargando, setCargando] = useState(true)
  const vigiliaHasta = useRef(0)
  const clave = JSON.stringify(filtros)
  const ultimaClave = useRef(clave)

  const refetch = useCallback(async () => {
    const pedida = clave
    try {
      const r = await procesosApi.listar(JSON.parse(pedida) as FiltrosDeProcesos)
      // Una respuesta de filtros viejos no pisa la de los nuevos.
      if (ultimaClave.current !== pedida) return
      setData(r)
      setError(null)
      setFallo(null)
    } catch (e) {
      if (ultimaClave.current !== pedida) return
      setError(e instanceof Error ? e.message : 'No se pudo leer el centro de procesos.')
      setFallo(e)
    } finally {
      if (ultimaClave.current === pedida) setCargando(false)
    }
  }, [clave])

  useEffect(() => {
    ultimaClave.current = clave
    if (!activo) return
    setCargando(true)
    void refetch()
  }, [clave, activo, refetch])

  // El ritmo: rápido con algo vivo o en vigilia, lento quieto.
  const hayVivo = (data?.activos ?? 0) > 0
  const [tic, setTic] = useState(0)
  useEffect(() => {
    if (!activo) return
    const enVigilia = Date.now() < vigiliaHasta.current
    const ms = hayVivo || enVigilia ? MS_CON_ALGO_VIVO : MS_QUIETO
    const t = setTimeout(() => {
      const oculta = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (!oculta) void refetch()
      setTic((n) => n + 1)
    }, ms)
    return () => clearTimeout(t)
  }, [activo, hayVivo, refetch, tic, data])

  // Alguien lanzó (o terminó) algo: preguntar ya, y seguido un rato.
  useEffect(() => {
    if (!activo) return
    return alCambiar(RECURSOS_QUE_LANZAN, () => {
      vigiliaHasta.current = Date.now() + MS_DE_VIGILIA
      void refetch()
      setTic((n) => n + 1)
    })
  }, [activo, refetch])

  return { data, error, fallo, cargando, refetch }
}
