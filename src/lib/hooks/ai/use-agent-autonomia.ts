'use client'

/**
 * use-agent-autonomia.ts — F6 of the Agent Workspace initiative.
 *
 * Reads the per-agent autonomy posture (modo + valla + T-323):
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia
 *   PUT /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia   {modo}
 *
 * Same shape/conventions as use-agent-work-items.ts. A 404 sets
 * `notAvailable` (endpoint not deployed yet) — data null, NO error.
 *
 * `setModo` es la MISMA escritura que usa el cajón «Autonomía» del Piloto
 * (`putPilotoAutonomia`), para un solo agente: optimista, con rollback ante
 * error y devolviendo el error para el toast. El caller decide si dibuja el
 * control (sólo un administrador puede cambiar el modo).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAgentAutonomia, type AgentAutonomiaResponse, type AutonomiaModo } from '@/lib/api/agent-workspace'
import { putPilotoAutonomia } from '@/lib/api/piloto'
import type { AgenteId } from '@/lib/api/work-item'

export interface UseAgentAutonomiaResult {
  data: AgentAutonomiaResponse | null
  isLoading: boolean
  error: string | null
  /** Backend 404 — autonomía aún no configurada (not an error). */
  notAvailable: boolean
  /** Hay un PUT en vuelo: el control se deshabilita mientras tanto. */
  busy: boolean
  /** Cambia el modo (optimista; ante error hace rollback y devuelve el error). */
  setModo: (modo: AutonomiaModo) => Promise<{ ok: boolean; error?: string }>
  refetch: () => Promise<void>
}

export function useAgentAutonomia(agente: AgenteId): UseAgentAutonomiaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<AgentAutonomiaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[useAgentAutonomia] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      setIsLoading(true)
      const res = await fetchAgentAutonomia(agencyId, agente, controller.signal)
      if (controller.signal.aborted) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch agent autonomia')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, agente])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  const setModo = useCallback(
    async (modo: AutonomiaModo): Promise<{ ok: boolean; error?: string }> => {
      if (!agencyId) return { ok: false, error: 'not_configured' }
      const previa = data?.modo
      if (previa === undefined || previa === modo) return { ok: true }

      // Optimista: pinta el modo nuevo YA; el rollback deshace ante error.
      setBusy(true)
      setData((cur) => (cur ? { ...cur, modo } : cur))
      const res = await putPilotoAutonomia(agencyId, agente, modo)
      setBusy(false)
      if (!res.ok) {
        setData((cur) => (cur ? { ...cur, modo: previa } : cur))
        return { ok: false, error: res.error }
      }
      // El backend es la autoridad: si respondió un modo distinto, gana él.
      if (res.data && res.data.modo !== modo) {
        const modoServidor = res.data.modo
        setData((cur) => (cur ? { ...cur, modo: modoServidor } : cur))
      }
      // Lo que cambia con el modo lo cuenta el micro (`efectoReal`, `origen`):
      // se relee para no dejar en pantalla el efecto del modo anterior
      // (pasaba a Autónomo y seguía diciendo «el correo lo autorizas tú»).
      void fetchData()
      return { ok: true }
    },
    [agencyId, agente, data?.modo, fetchData],
  )

  return { data, isLoading, error, notAvailable, busy, setModo, refetch: fetchData }
}
