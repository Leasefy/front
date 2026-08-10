'use client'

/**
 * use-recorrido-postulaciones — las postulaciones que le llegan a la
 * inmobiliaria por el recorrido del inquilino (paso 7).
 *
 * Envuelve `fetchFunnelApplications`, que ya resuelve modo mock y URL del
 * agente. Dos cuidados que este panel ya pagó caros:
 *
 * 1. **La carrera del token.** `agentAuthHeaders()` lee el token de forma
 *    síncrona y manda `Bearer ` vacío si todavía no cargó — eso fue lo que
 *    produjo los "Error: 401" de todo el panel. Acá no puede pasar porque se
 *    espera a `agency.id`, que solo existe después de que `/users/me` resolvió,
 *    y para eso el token ya tuvo que estar.
 * 2. **Respuestas fuera de orden.** Un refetch rápido puede resolver después
 *    de uno lanzado más tarde y pisar datos frescos con datos viejos. El
 *    contador de peticiones descarta todo lo que no sea la última.
 *
 * Un fallo se reporta como fallo. "No pudimos cargar" nunca se muestra como
 * "no hay" — la bandeja vacía y la bandeja rota se ven distinto a propósito.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import {
  fetchFunnelApplications,
  type FunnelApplication,
} from '@/lib/api/funnel-applications.service'
import { landlordApplicationsApi } from '@/lib/api/applications.service'

/**
 * Una postulación del recorrido, con el candidato del back pegado **si el
 * `applicationId` cruzó**.
 *
 * El agente devuelve un id opaco y nada más: sin nombre ni propiedad, la
 * bandeja sería una lista de `mock-app-0001…` que no le dice nada a nadie. El
 * back sí tiene esos datos en `GET /landlord/candidates`, indexados por el id
 * de la postulación.
 *
 * Que los dos ids sean el mismo es **plausible pero no verificado** — son dos
 * bases distintas. Por eso el cruce es opcional y no un supuesto: si no
 * encuentra pareja queda en `null` y la fila muestra la referencia corta sin
 * enlace, en vez de inventar un nombre o mandar a una ruta que no existe.
 * Anotado para Víctor en el handoff.
 */
export interface PostulacionDelRecorrido extends FunnelApplication {
  candidato: {
    nombre: string
    propertyId: string
    propertyTitle: string
  } | null
}

export interface UseRecorridoPostulacionesResult {
  items: PostulacionDelRecorrido[]
  generatedAt: string
  isLoading: boolean
  error: string | null
  /** Cuántas filas no encontraron pareja en el back. Para diagnóstico. */
  sinCruce: number
  refetch: () => Promise<void>
}

export function useRecorridoPostulaciones(): UseRecorridoPostulacionesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<PostulacionDelRecorrido[]>([])
  const [generatedAt, setGeneratedAt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sinCruce, setSinCruce] = useState(0)

  /** Nº de la última petición lanzada; las respuestas viejas se descartan. */
  const peticion = useRef(0)

  const cargar = useCallback(async () => {
    if (!agencyId) {
      // Sin agencia no hay a quién preguntarle. No es un error: es que todavía
      // no sabemos. Cortar el spinner igual, o la pantalla queda cargando para
      // siempre.
      setIsLoading(false)
      return
    }

    const mia = ++peticion.current
    setIsLoading(true)

    // El recorrido manda: si el agente falla, la pantalla falla. El cruce con
    // el back es un adorno útil — si se cae, las filas salen sin nombre pero
    // salen. `allSettled` es a propósito.
    const [recorrido, candidatos] = await Promise.allSettled([
      fetchFunnelApplications(agencyId),
      landlordApplicationsApi.getAllCandidates(),
    ])

    if (mia !== peticion.current) return

    if (recorrido.status === 'rejected') {
      const err = recorrido.reason
      setError(err instanceof Error ? err.message : 'No pudimos cargar las postulaciones.')
      setIsLoading(false)
      return
    }

    const porId = new Map(
      candidatos.status === 'fulfilled'
        ? candidatos.value.candidates.map((c) => [c.id, c] as const)
        : [],
    )

    const cruzadas: PostulacionDelRecorrido[] = recorrido.value.items.map((item) => {
      const c = porId.get(item.applicationId)
      return {
        ...item,
        candidato: c
          ? { nombre: c.tenantName, propertyId: c.propertyId, propertyTitle: c.propertyTitle }
          : null,
      }
    })

    setItems(cruzadas)
    setSinCruce(cruzadas.filter((i) => !i.candidato).length)
    setGeneratedAt(recorrido.value.generatedAt)
    setError(null)
    setIsLoading(false)
  }, [agencyId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { items, generatedAt, isLoading, error, sinCruce, refetch: cargar }
}
