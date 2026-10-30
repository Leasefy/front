'use client'

/**
 * use-aprobacion — estado de aprobación del inquilino, compartido.
 *
 * Lo consultan pantallas públicas (detalle de propiedad, catálogo) y privadas
 * (`/inquilino/*`), así que tiene que sobrevivir a que NO haya sesión: un
 * visitante anónimo que toca "Postularme" debe ver el camino, no un error.
 *
 * Sin token no se pega a nada — el estudio necesita JWT del back
 * principal —, pero **sí** se mira el respaldo local: quien acaba de
 * aprobarse por un link de WhatsApp no tiene cuenta todavía, y sin esto su
 * catálogo se veía exactamente igual que antes de consultar — el resultado
 * no servía para nada. Ver `aprobacion-local.ts`.
 *
 * Fuente con sesión (T-0193): `GET /calificacion-leasefy/estudio/actual`
 * (back principal), el estudio gratis de documentos, traducido a `Aprobacion`
 * con `mapEstudioToAprobacion`. Antes salía de `GET /pre-scoring/current`
 * (Fianly, de pago): ese camino ya no alimenta esta pantalla.
 *
 * Si no hay ni sesión ni respaldo, se devuelve `sin_estudio`: literalmente
 * cierto, y es el estado que enseña el camino.
 */

import { useCallback, useContext, useEffect, useState } from 'react'

import { getAccessToken } from '@/lib/api/client'
import { leerAprobacionLocal } from '@/lib/api/aprobacion-local'
import { mapEstudioToAprobacion } from '@/lib/api/aprobacion-from-estudio'
import { estaVigente, SIN_APROBACION, type Aprobacion } from '@/lib/api/aprobacion.service'
import { estudioDeCanonApi } from '@/lib/api/estudio-de-canon.service'
import { AuthContext } from '@/lib/auth/auth-context'

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
   * inmobiliaria pedía el estudio del inquilino y el back respondía 403
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
      const delBackend = mapEstudioToAprobacion(await estudioDeCanonApi.actual())
      /*
       * El backend manda, salvo cuando dice "no tengo nada".
       *
       * `sin_estudio` es tanto la ausencia de estudio como uno fallido o sin
       * terminar (ver `mapEstudioToAprobacion`). Un vacío del backend no borra
       * algo que la persona ya se ganó: se cae al respaldo local si lo hay.
       * Cuando el estudio devuelve un estado de verdad (aprobado / rechazado /
       * en proceso), ese gana.
       */
      if (delBackend.estado === 'sin_estudio') {
        setAprobacion(leerAprobacionLocal() ?? delBackend)
      } else {
        setAprobacion(delBackend)
      }
    } catch (e) {
      // Un 404 significa "todavía no hay estudio para esta cuenta": es el
      // primer estado del recorrido, no un fallo. No se marca `error`.
      if ((e as { status?: number } | null)?.status === 404) {
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
