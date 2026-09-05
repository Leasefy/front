'use client'

/**
 * use-mantenimiento-inbox.ts — Phase 7 plan 07-01 (DASH-02)
 *
 * Prioritized-inbox hook. Mock-first (CONTEXT §MOCK-FIRST):
 *   - mock mode (default): resolve getMockInbox(now) after mockDelayMs.
 *   - real mode: GET `${NEXT_PUBLIC_AGENT_URL}/api/agency/:id/mantenimiento/inbox`
 *     (active filters serialized into a querystring; endpoint not-yet-existing).
 *
 * Keeps the RAW cards in state and derives `data` via a memo that applies the passed
 * InboxFilters then sorts by `score` DESC (without mutating the source). Returns the
 * repo-wide `{ data, isLoading, error, refetch }` shape.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { getApiConfig } from '@/lib/api/config'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
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

  const fetchData = useCallback(async () => {
    const cfg = getApiConfig()
    setIsLoading(true)
    if (cfg.useMockApi) {
      await delay(cfg.mockDelayMs)
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
      setError(
        'No hay agente configurado (falta NEXT_PUBLIC_AGENT_URL), así que no se pudo traer nada. Esta pantalla está vacía porque no pudimos consultar, no porque no haya datos.',
      )
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      // Filters MAY be serialized into a querystring once the endpoint exists.
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/mantenimiento/inbox`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: MaintenanceTicketCard[] = await res.json()
      setRawCards(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mantenimiento inbox')
    } finally {
      setIsLoading(false)
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
