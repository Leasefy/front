'use client'

/**
 * use-mantenimiento-inbox.ts — bandeja priorizada de mantenimiento (Fixi).
 *
 *   - datos reales (lo normal): GET
 *     `${NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/mantenimiento/inbox`.
 *     La ruta EXISTE en el micro; responde 404 `feature_not_enabled` mientras
 *     `MANTENIMIENTO_ENABLED` no esté prendido — ver `traer-del-agente.ts`.
 *   - simulado: sólo con `NEXT_PUBLIC_USE_MOCK_API=true` (opt-in explícito,
 *     nunca en producción). El comentario viejo decía «mock mode (default)» y
 *     eso dejó de ser cierto cuando `getApiConfig` invirtió el default.
 *
 * Keeps the RAW cards in state and derives `data` via a memo that applies the passed
 * InboxFilters then sorts by `score` DESC (without mutating the source). Returns the
 * repo-wide `{ data, isLoading, error, refetch }` shape.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { getApiConfig } from '@/lib/api/config'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import {
  SIN_AGENTE_CONFIGURADO,
  SIN_AGENCIA,
  mensajeDeRespuestaFallida,
  mensajeDeErrorDeRed,
} from './traer-del-agente'
import { getMockInbox } from '@/lib/data/mock-mantenimiento'
import type { InboxFilters, MaintenanceTicketCard } from '@/lib/types/mantenimiento'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Pure filter helper covering every InboxFilters field. Exported for fast unit tests.
 * Array filters = "includes"; booleans = strict equality; cost = inclusive range on
 * costoEstimadoCop; string filters = case-insensitive substring on the relevant field;
 * slaBreached = slaDeadlineAt already past.
 */
export function applyFilters(
  cards: MaintenanceTicketCard[],
  filters: InboxFilters | undefined,
): MaintenanceTicketCard[] {
  if (!filters) return cards
  const f = filters
  const now = Date.now()
  const sub = (haystack: string | undefined, needle: string) =>
    (haystack ?? '').toLowerCase().includes(needle.toLowerCase())

  return cards.filter((c) => {
    if (f.severidad?.length && !f.severidad.includes(c.severidad)) return false
    if (f.categoria?.length && !f.categoria.includes(c.categoria)) return false
    if (f.estado?.length && !f.estado.includes(c.estado)) return false
    if (f.responsable?.length && !f.responsable.includes(c.responsableProbable)) return false

    if (f.requiereAprobacion !== undefined && c.requiereAprobacion !== f.requiereAprobacion) return false
    if (f.hasPhotos !== undefined && c.hasPhotos !== f.hasPhotos) return false
    if (f.reabierto !== undefined && c.reabierto !== f.reabierto) return false
    if (f.retencionRiesgo !== undefined && (c.retencionRiesgo ?? false) !== f.retencionRiesgo) return false

    if (f.slaBreached === true && !(new Date(c.slaDeadlineAt).getTime() < now)) return false
    if (f.slaBreached === false && new Date(c.slaDeadlineAt).getTime() < now) return false

    if (f.costoMinCop !== undefined && (c.costoEstimadoCop ?? -Infinity) < f.costoMinCop) return false
    if (f.costoMaxCop !== undefined && (c.costoEstimadoCop ?? Infinity) > f.costoMaxCop) return false

    if (f.proveedor && !sub(c.proveedorSugerido, f.proveedor)) return false
    if (f.inmueble && !sub(`${c.inmueble.address} ${c.inmueble.unit ?? ''}`, f.inmueble)) return false
    // `propietario` and `zona` are not card fields in v1 mock; treat them as best-effort
    // substring matches against the address so the filter is non-throwing (real wire fills them in).
    if (f.propietario && !sub(c.inmueble.address, f.propietario)) return false
    if (f.zona && !sub(c.inmueble.address, f.zona)) return false

    return true
  })
}

export interface UseMantenimientoInboxResult {
  data: MaintenanceTicketCard[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMantenimientoInbox(filters?: InboxFilters): UseMantenimientoInboxResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [rawCards, setRawCards] = useState<MaintenanceTicketCard[]>([])
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
      setRawCards(getMockInbox(nowRef.current))
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
      // Los filtros se aplican en el cliente (`applyFilters`); la ruta del micro
      // no recibe querystring todavía.
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/mantenimiento/inbox`,
        { headers: agentAuthHeaders() },
      )
      if (!vigente()) return
      if (!res.ok) throw new Error(mensajeDeRespuestaFallida(res, 'la bandeja de mantenimiento'))
      const json: MaintenanceTicketCard[] = await res.json()
      setRawCards(json)
      setError(null)
    } catch (err) {
      if (!vigente()) return
      setError(mensajeDeErrorDeRed(err, 'la bandeja de mantenimiento'))
    } finally {
      if (vigente()) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const data = useMemo(
    () => applyFilters(rawCards, filters).slice().sort((a, b) => b.score - a.score),
    [rawCards, filters],
  )

  return { data, isLoading, error, refetch: fetchData }
}
