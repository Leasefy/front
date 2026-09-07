'use client'

/**
 * use-mantenimiento-ticket.ts — detalle de un ticket de mantenimiento (Fixi).
 *
 * Trae `GET {NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/mantenimiento/tickets/{ticketId}`
 * del microservicio, o el mock cuando `NEXT_PUBLIC_USE_MOCK_API=true` (opt-in
 * explícito; nunca en producción — ver `lib/api/config.ts`).
 *
 * 🔴 POR QUÉ ESTE HOOK YA NO TIENE MUTADORES (y por qué no hay que reponerlos).
 *
 * Exportaba `assign` / `requestInfo` / `requestApproval` / `escalate` /
 * `reopen` / `close`. Ninguno hablaba con nadie: cambiaban `estado` en el
 * estado LOCAL de React y le agregaban al historial del ticket un evento con
 * `actor: 'human'` que decía, en primera persona, cosas como
 *
 *     «Proveedor asignado al ticket.»
 *     «Se solicitó información adicional al inquilino.»
 *     «Se solicitó aprobación del propietario.»
 *
 * Nada de eso ocurría. No salía ningún aviso, no se asignaba ningún proveedor,
 * y al recargar la página el ticket volvía a su estado real como si nadie
 * hubiera tocado nada. La pantalla afirmaba un hecho que no pasó — y encima lo
 * dejaba escrito en la línea de tiempo, que es justo el lugar donde alguien
 * después va a buscar «¿avisamos o no avisamos?».
 *
 * No es un cableado que falta: **no hay a dónde cablearlo desde el navegador**.
 * El micro expone estas tres rutas de mantenimiento SÓLO como GET; el estado
 * del ticket es del back (`/internal/mantenimiento`, rail S2S con
 * `AGENT_API_KEY`, que el navegador no tiene ni debe tener). Mientras eso siga
 * así, esta pantalla se MIRA. Los botones quedan apagados diciendo por qué
 * (`TicketCTAs` → `motivoDeshabilitado`), que es la versión honesta de «todavía
 * no se puede».
 *
 * Devuelve la forma de todo el repo: `{ data, isLoading, error, refetch }`.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { getApiConfig } from '@/lib/api/config'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import {
  SIN_AGENTE_CONFIGURADO,
  SIN_AGENCIA,
  mensajeDeRespuestaFallida,
  mensajeDeErrorDeRed,
} from './traer-del-agente'
import { getMockTicketDetail } from '@/lib/data/mock-mantenimiento'
import type { MaintenanceTicketDetail } from '@/lib/types/mantenimiento'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface UseMantenimientoTicketResult {
  data: MaintenanceTicketDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMantenimientoTicket(ticketId: string): UseMantenimientoTicketResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<MaintenanceTicketDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nowRef = useRef<Date>(new Date())

  /**
   * Sólo la consulta MÁS NUEVA puede escribir el estado.
   *
   * `fetchData` no cancelaba nada: al pasar de un ticket a otro (o al tocar
   * «reintentar» dos veces) quedaban dos consultas en vuelo y ganaba la que
   * llegara última, que no es la misma que la que se pidió última. Resultado
   * posible: la pantalla del ticket B mostrando los datos del A, sin ningún
   * indicio. Además, una respuesta que aterriza después de desmontar el
   * componente escribe estado sobre algo que ya no está.
   *
   * Un contador por instancia alcanza: cada llamada se queda con su número y
   * descarta lo que trajo si mientras tanto salió otra.
   */
  const consulta = useRef(0)


  const fetchData = useCallback(async () => {
    const cfg = getApiConfig()
    const miTurno = ++consulta.current
    const vigente = () => consulta.current === miTurno
    setIsLoading(true)
    if (cfg.useMockApi) {
      await delay(cfg.mockDelayMs)
      if (!vigente()) return
      setData(getMockTicketDetail(ticketId, nowRef.current))
      setError(null)
      setIsLoading(false)
      return
    }
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
    // Sin agente configurado no hay de dónde traer nada. Antes esto era un
    // console.warn y `setIsLoading(false)`: la pantalla quedaba vacía sin decir
    // por qué, y un vacío mudo se lee como «no tenés mantenimientos». Un error
    // explícito manda a <FalloDeCarga>, que sí lo cuenta.
      setError(SIN_AGENTE_CONFIGURADO)
      setIsLoading(false)
      return
    }
    // Sin inmobiliaria tampoco se preguntó nada, y hasta acá esa rama salía
    // muda: `error` quedaba en null y la pantalla mostraba «No hay tickets».
    // Un vacío sin explicación afirma que no hay nada; esto no lo sabemos.
    if (!agencyId) {
      setError(SIN_AGENCIA)
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/mantenimiento/tickets/${ticketId}`,
        { headers: agentAuthHeaders() },
      )
      if (!vigente()) return
      if (!res.ok) throw new Error(mensajeDeRespuestaFallida(res, 'el ticket'))
      const json: MaintenanceTicketDetail = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      if (!vigente()) return
      setError(mensajeDeErrorDeRed(err, 'el ticket'))
    } finally {
      if (vigente()) setIsLoading(false)
    }
  }, [agencyId, ticketId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
