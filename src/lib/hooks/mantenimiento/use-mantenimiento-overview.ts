'use client'

/**
 * use-mantenimiento-overview.ts — Phase 7 plan 07-01 (DASH-01)
 *
 * KPI de la vista de triage de mantenimiento (Fixi).
 *   - datos reales (lo normal): GET
 *     `${NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/mantenimiento/overview`.
 *     La ruta EXISTE en el micro; responde 404 `feature_not_enabled` mientras
 *     `MANTENIMIENTO_ENABLED` no esté prendido — ver `traer-del-agente.ts`.
 *   - simulado: sólo con `NEXT_PUBLIC_USE_MOCK_API=true` (opt-in explícito).
 *     El comentario viejo decía «mock mode (default)» y «endpoint not-yet-existing»:
 *     las dos cosas dejaron de ser ciertas.
 *
 * Returns `{ data, isLoading, error, refetch }` (repo-wide hook shape). `data` is the
 * envelope per C7-02 — NOT a bare MaintenanceKpis. 07-02 consumes `data?.kpis`.
 *
 * No realtime/polling (cobranza-specific — CONTEXT §"NO copiar a ciegas").
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
import { getMockKpis } from '@/lib/data/mock-mantenimiento'
import type { MaintenanceKpis } from '@/lib/types/mantenimiento'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** C7-02: canonical overview envelope returned by this hook + the real endpoint. */
export interface MantenimientoOverviewEnvelope {
  kpis: MaintenanceKpis
  generatedAt: string
}

export interface UseMantenimientoOverviewResult {
  data: MantenimientoOverviewEnvelope | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMantenimientoOverview(): UseMantenimientoOverviewResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<MantenimientoOverviewEnvelope | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // One stable `now` per hook instance so refetch reuses the same fixture clock.
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
      setData({
        kpis: getMockKpis(nowRef.current),
        generatedAt: nowRef.current.toISOString(),
      })
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
        `${agentUrl}/api/agency/${agencyId}/mantenimiento/overview`,
        { headers: agentAuthHeaders() },
      )
      if (!vigente()) return
      if (!res.ok) throw new Error(mensajeDeRespuestaFallida(res, 'los indicadores de mantenimiento'))
      const json: MantenimientoOverviewEnvelope = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      if (!vigente()) return
      setError(mensajeDeErrorDeRed(err, 'los indicadores de mantenimiento'))
    } finally {
      if (vigente()) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
