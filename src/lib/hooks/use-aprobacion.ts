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

import { useAuth } from '@/lib/auth/use-auth'
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
  /*
   * `useAuth`, no `getAccessToken()`.
   *
   * El token vive en memoria y lo pone el AuthProvider cuando Supabase le
   * contesta. Leerlo durante el primer render devuelve null aunque la persona
   * SÍ tenga sesión — y como esto corría una sola vez, ahí quedaba: nunca se
   * preguntaba `/tenant/aprobacion`. A alguien aprobado se le mostraba
   * `sin_estudio` en TODAS partes (catálogo, ficha, botón de postularse) hasta
   * que navegara a otra pantalla sin recargar.
   *
   * "Todavía no sé si hay sesión" no es "no hay sesión". Mientras se resuelve
   * no se decide nada; en cuanto se resuelve, este efecto vuelve a correr.
   */
  const { isAuthenticated, isLoading: resolviendoSesion } = useAuth()
  const [aprobacion, setAprobacion] = useState<Aprobacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (resolviendoSesion) return
    setCargando(true)
    setError(null)
    // Sin sesión no hay a quién preguntarle, pero puede haber respaldo local
    // de una consulta reciente hecha sin cuenta.
    if (!isAuthenticated) {
      setAprobacion(leerAprobacionLocal() ?? SIN_APROBACION)
      setCargando(false)
      return
    }
    try {
      const delBackend = await fetchAprobacion()
      /*
       * El backend manda, salvo cuando dice "no tengo nada".
       *
       * `sin_estudio` también es lo que devuelve un 404, y hoy `/api/tenant/
       * aprobacion` no existe. Sin esta línea pasaba lo peor del recorrido:
       * la persona se aprobaba, creaba su cuenta para entrar a ver su
       * catálogo… y al entrar su aprobación había desaparecido, porque la
       * sesión pisaba el respaldo local con un "sin_estudio" que no era una
       * respuesta, era un hueco.
       *
       * Un vacío del backend no borra algo que la persona ya se ganó. Cuando
       * el endpoint exista y devuelva un estado de verdad, ese gana.
       */
      if (delBackend.estado === 'sin_estudio') {
        setAprobacion(leerAprobacionLocal() ?? delBackend)
      } else {
        setAprobacion(delBackend)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tu aprobación.')
      // Un fallo de red no debe bloquear el botón: se cae al respaldo local si
      // lo hay, y si no al estado que enseña el camino. Nunca a uno que
      // afirme algo falso.
      setAprobacion(leerAprobacionLocal() ?? SIN_APROBACION)
    } finally {
      setCargando(false)
    }
  }, [isAuthenticated, resolviendoSesion])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return {
    aprobacion,
    // Mientras la sesión no se resuelva, esto sigue "cargando": quien llame no
    // debe leer `sin_estudio` como un hecho antes de que haya con qué saberlo.
    cargando: cargando || resolviendoSesion,
    error,
    vigente: estaVigente(aprobacion),
    recargar: () => void cargar(),
  }
}
