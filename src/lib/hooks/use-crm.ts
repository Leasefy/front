'use client'

/**
 * use-crm.ts — los hooks del CRM comercial (18-09-2026).
 *
 * ── Por qué un hook propio y no `useApiData` ───────────────────────────────
 *
 * `useApiData` es privado de `useInmobiliaria.ts` (no está exportado) y ese
 * archivo lo están tocando otros frentes al mismo tiempo. `useCrm` replica su
 * forma exacta —`{ datos, cargando, error, errorCrudo, refetch }` más la
 * invalidación por recurso con `alCambiar`—, así que las pantallas se escriben
 * igual y los cuatro estados de `EstadoDeDatos` funcionan sin traducir nada.
 *
 * ── Lo que agrega ──────────────────────────────────────────────────────────
 *
 * El tercer estado que estas pantallas necesitan y las de antes no: **«todavía
 * no está habilitado»**. Cada endpoint del CRM responde 503 con la migración
 * que falta mientras Víctor no la aplique, y eso NO es un error que haya que
 * reintentar ni un vacío: es un «próximamente» con motivo. `noHabilitado` lo
 * separa, con el mismo criterio que `owner-portal.http.ts`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { alCambiar } from '@/lib/api/refresco-de-datos'
import { resultadoDelCrm } from '@/lib/api/crm.service'

export interface EstadoDelCrm<T> {
  datos: T | null
  cargando: boolean
  /** El error entero, para `EstadoDeDatos`. `null` si no falló. */
  errorCrudo: unknown
  error: string | null
  /** 🔴 El motivo del 503: qué migración falta. `null` = está habilitado. */
  noHabilitado: string | null
  refetch: () => Promise<T | null>
}

export function useCrm<T>(
  traer: () => Promise<T>,
  deps: unknown[] = [],
  recursos: readonly string[] = [],
): EstadoDelCrm<T> {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [noHabilitado, setNoHabilitado] = useState<string | null>(null)

  // La función de carga cambia en cada render (es una arrow en la pantalla): se
  // guarda en una ref para que el efecto no se dispare por eso y el control de
  // cuándo recargar quede en `deps`, como en `useApiData`.
  const traerRef = useRef(traer)
  traerRef.current = traer

  const refetch = useCallback(async (): Promise<T | null> => {
    setCargando(true)
    const r = await resultadoDelCrm(() => traerRef.current())
    if (r.estado === 'ok') {
      setDatos(r.datos)
      setErrorCrudo(null)
      setError(null)
      setNoHabilitado(null)
      setCargando(false)
      return r.datos
    }
    if (r.estado === 'no-habilitado') {
      setNoHabilitado(r.motivo)
      setErrorCrudo(null)
      setError(null)
      setCargando(false)
      return null
    }
    // 🔴 `datos` NO se borra en un fallo de REFRESCO: con
    // `conservarContenido` la pantalla sigue mostrando lo último bueno y avisa
    // arriba, en vez de quedarse en blanco.
    setErrorCrudo(r)
    setError(r.mensaje)
    setCargando(false)
    return null
  }, [])

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Cuando otra pantalla (o una acción de ésta) toca uno de estos recursos, se
  // recarga sola: la acción no tiene que saber a quién avisarle.
  useEffect(() => {
    if (recursos.length === 0) return
    return alCambiar(recursos, () => {
      void refetch()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recursos.join('|'), refetch])

  return { datos, cargando, errorCrudo, error, noHabilitado, refetch }
}
