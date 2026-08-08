'use client'

/**
 * use-aprobacion — estado de aprobación del inquilino, compartido.
 *
 * Lo consultan pantallas públicas (detalle de propiedad, catálogo) y privadas
 * (`/inquilino/*`), así que tiene que sobrevivir a que NO haya sesión: un
 * visitante anónimo que toca "Postularme" debe ver el camino, no un error.
 *
 * Sin token no se pega al agente, pero **sí** se mira el respaldo local: quien
 * acaba de aprobarse por un link de WhatsApp no tiene cuenta todavía, y sin
 * esto su catálogo se veía exactamente igual que antes de consultar — el
 * resultado no servía para nada. Ver `aprobacion-local.ts`.
 *
 * Si no hay ni sesión ni respaldo, se devuelve `sin_estudio`: literalmente
 * cierto, y es el estado que enseña el camino.
 */

import { useCallback, useEffect, useState } from 'react'

import { getAccessToken } from '@/lib/api/client'
import { leerAprobacionLocal } from '@/lib/api/aprobacion-local'
import {
  fetchAprobacion,
  estaVigente,
  SIN_APROBACION,
  type Aprobacion,
} from '@/lib/api/aprobacion.service'

export interface UseAprobacionResult {
  aprobacion: Aprobacion | null
  cargando: boolean
  error: string | null
  /** Aprobada y no vencida — la única condición para poder postularse. */
  vigente: boolean
  recargar: () => void
}

export function useAprobacion(): UseAprobacionResult {
  const [aprobacion, setAprobacion] = useState<Aprobacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    // Sin sesión no hay a quién preguntarle, pero puede haber respaldo local
    // de una consulta reciente hecha sin cuenta.
    if (!getAccessToken()) {
      setAprobacion(leerAprobacionLocal() ?? SIN_APROBACION)
      setCargando(false)
      return
    }
    try {
      setAprobacion(await fetchAprobacion())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tu aprobación.')
      // Un fallo de red no debe bloquear el botón: se cae al respaldo local si
      // lo hay, y si no al estado que enseña el camino. Nunca a uno que
      // afirme algo falso.
      setAprobacion(leerAprobacionLocal() ?? SIN_APROBACION)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return {
    aprobacion,
    cargando,
    error,
    vigente: estaVigente(aprobacion),
    recargar: () => void cargar(),
  }
}
