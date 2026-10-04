'use client'

/**
 * use-aprobacion — estado de aprobación del inquilino, compartido.
 *
 * Lo consultan pantallas públicas (detalle de propiedad, catálogo) y privadas
 * (`/inquilino/*`), así que tiene que sobrevivir a que NO haya sesión: un
 * visitante anónimo que toca "Postularme" debe ver el camino, no un error.
 *
 * Sin token no se pega a nada — el pre-scoring necesita JWT del back
 * principal —, pero **sí** se mira el respaldo local: quien acaba de
 * aprobarse por un link de WhatsApp no tiene cuenta todavía, y sin esto su
 * catálogo se veía exactamente igual que antes de consultar — el resultado
 * no servía para nada. Ver `aprobacion-local.ts`.
 *
 * Fuente con sesión: `GET /pre-scoring/current` (back principal, Slice 2),
 * traducido a `Aprobacion` con `mapPreScoringToAprobacion`. Reemplaza al
 * viejo `fetchAprobacion` (`/api/tenant/aprobacion` del agente, que nunca
 * existió — 404 siempre).
 *
 * Si no hay ni sesión ni respaldo, se devuelve `sin_estudio`: literalmente
 * cierto, y es el estado que enseña el camino.
 */

import { useCallback, useContext, useEffect, useState } from 'react'

import { apiClient, ApiError, getAccessToken } from '@/lib/api/client'
import { leerAprobacionLocal } from '@/lib/api/aprobacion-local'
import { mapPreScoringToAprobacion } from '@/lib/api/aprobacion-from-prescoring'
import { estaVigente, SIN_APROBACION, type Aprobacion } from '@/lib/api/aprobacion.service'
import { AuthContext } from '@/lib/auth/auth-context'
import { parsePreScoringCurrent } from '@/lib/api/prescoring.types'

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
  /*
   * IN-22 (QA de Inmuebles, 04-10): el aviso público abierto por alguien de la
   * inmobiliaria pedía `GET /pre-scoring/current` y el back respondía 403
   * («sólo para cuentas de inquilino») — un error en consola en cada aviso.
   * El estudio sólo se le pide al back si quien mira es INQUILINO. Sin el
   * proveedor de sesión (una prueba, una ruta suelta) se comporta como antes.
   */
  const auth = useContext(AuthContext)
  const sesionCargando = auth?.isLoading ?? false
  const rolDeQuienMira = auth?.user?.role ?? null

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
    // Con sesión, hasta saber quién es no se pregunta nada (sigue cargando).
    if (sesionCargando) return
    // Propietario o inmobiliaria: no tienen estudio de inquilino que consultar.
    if (rolDeQuienMira !== null && rolDeQuienMira !== 'tenant') {
      setAprobacion(SIN_APROBACION)
      setCargando(false)
      return
    }
    try {
      const crudo = await apiClient.get<unknown>('/pre-scoring/current')
      const delBackend = mapPreScoringToAprobacion(parsePreScoringCurrent(crudo))
      /*
       * El backend manda, salvo cuando dice "no tengo nada".
       *
       * `sin_estudio` es tanto la ausencia de orden como un estudio vencido
       * o fallido (ver `mapPreScoringToAprobacion`). Sin esta línea pasaba lo
       * peor del recorrido: la persona se aprobaba, creaba su cuenta para
       * entrar a ver su catálogo… y al entrar su aprobación había
       * desaparecido, porque la sesión pisaba el respaldo local con un
       * "sin_estudio" que no era una respuesta, era un hueco.
       *
       * Un vacío del backend no borra algo que la persona ya se ganó. Cuando
       * el pre-scoring devuelve un estado de verdad (aprobado/rechazado/en
       * proceso), ese gana.
       */
      if (delBackend.estado === 'sin_estudio') {
        setAprobacion(leerAprobacionLocal() ?? delBackend)
      } else {
        setAprobacion(delBackend)
      }
    } catch (e) {
      // Un 404 significa "todavía no hay orden para esta cuenta": es el
      // primer estado del recorrido, no un fallo — igual que en
      // `use-prescoring-current.ts`. No se marca `error` para esto.
      if (e instanceof ApiError && e.status === 404) {
        setAprobacion(leerAprobacionLocal() ?? SIN_APROBACION)
        return
      }
      setError(e instanceof Error ? e.message : 'No pudimos cargar tu aprobación.')
      // Un fallo de red no debe bloquear el botón: se cae al respaldo local si
      // lo hay, y si no al estado que enseña el camino. Nunca a uno que
      // afirme algo falso.
      setAprobacion(leerAprobacionLocal() ?? SIN_APROBACION)
    } finally {
      setCargando(false)
    }
  }, [sesionCargando, rolDeQuienMira])

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
