'use client'

/**
 * use-mantenimiento-overview.ts — Phase 7 plan 07-01 (DASH-01)
 *
 * KPI data hook for the maintenance-triage overview. Mock-first (CONTEXT §MOCK-FIRST):
 *   - mock mode (default): resolve getMockKpis(now) after mockDelayMs, assembled into
 *     the C7-02 envelope { kpis, generatedAt }.
 *   - real mode (NEXT_PUBLIC_USE_MOCK_API==='false'): GET the intended-but-not-yet-existing
 *     `${NEXT_PUBLIC_AGENT_URL}/api/agency/:id/mantenimiento/overview` with agentAuthHeaders().
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

  const fetchData = useCallback(async () => {
    const cfg = getApiConfig()
    setIsLoading(true)
    if (cfg.useMockApi) {
      await delay(cfg.mockDelayMs)
      setData({
        kpis: getMockKpis(nowRef.current),
        generatedAt: nowRef.current.toISOString(),
      })
      setError(null)
      setIsLoading(false)
      return
    }
    // Real-fetch branch — endpoint does not exist yet (follow-up agent-side).
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
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/mantenimiento/overview`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: MantenimientoOverviewEnvelope = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mantenimiento overview')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
