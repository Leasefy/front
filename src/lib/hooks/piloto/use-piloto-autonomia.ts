'use client'

/**
 * use-piloto-autonomia.ts — autonomía POR AGENTE, escribible.
 *
 * GET por agente del roster de workspaces (los 7 `AgenteId` de work-item.ts —
 * es el vocabulario que el endpoint de autonomía ya acepta; el registro
 * `ai-agents.ts` usa otros ids que el micro no conoce):
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia   (ya existe)
 *   PUT /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia   {modo}
 *
 * Fail-soft por agente: un agente cuyo GET da 404 simplemente no aparece —
 * no tumba a los demás. `setModo` es optimista: pinta el modo nuevo, hace el
 * PUT y ante error hace rollback y devuelve el error para el toast.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAgentAutonomia, type VallaItem } from '@/lib/api/agent-workspace'
import { putPilotoAutonomia, type AutonomiaModo } from '@/lib/api/piloto'
import type { AgenteId } from '@/lib/api/work-item'

/**
 * El roster del panel (work-item.ts, cerrado 2026-06-08) MÁS los agentes
 * GOBERNADOS por agencia (2026-08-31): desde que el gobierno dejó de ser
 * solo-cobranza, el endpoint de autonomía acepta también retención, calidad,
 * prospectos, aprobaciones y mantenimiento — y elegirles modo acá es
 * exactamente lo que gobierna su ejecución (piloto/gobierno.ts en el micro).
 */
export type AgentePiloto =
  | AgenteId
  | 'retencion'
  | 'calidad'
  | 'prospectos'
  | 'aprobaciones'
  | 'mantenimiento'

const PILOTO_AGENTES: AgentePiloto[] = [
  'cobranza',
  'retencion',
  'prospectos',
  'pagos',
  'calidad',
  'aprobaciones',
  'mantenimiento',
  'cotizador',
  'conciliacion',
  'estudio',
  'matching',
  'avaluos',
]

export interface AutonomiaRow {
  agente: AgentePiloto
  modo: AutonomiaModo
  modosDisponibles: AutonomiaModo[]
  /** Las vallas que el modo NUNCA puede saltarse (las publica el micro). */
  valla: VallaItem[]
  /** Si el agente cae bajo los umbrales de la T-323. */
  t323: boolean
  /** Qué significa HOY este modo para ESTE agente, en una frase (micro, honesto). */
  efectoReal: string | null
}

export interface UsePilotoAutonomiaResult {
  rows: AutonomiaRow[]
  /** Cuántos agentes tiene el roster (no cuántos contestaron). */
  totalRoster: number
  isLoading: boolean
  /** Solo cuando NINGÚN agente contestó bien y al menos uno falló de verdad. */
  error: string | null
  /** Agente cuyo PUT está en vuelo (deshabilita su control). */
  busyAgente: AgentePiloto | null
  setModo: (agente: AgentePiloto, modo: AutonomiaModo) => Promise<{ ok: boolean; error?: string }>
  refetch: () => Promise<void>
}

export function usePilotoAutonomia(): UsePilotoAutonomiaResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [rows, setRows] = useState<AutonomiaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyAgente, setBusyAgente] = useState<AgentePiloto | null>(null)

  /** Guard de respuestas viejas: cada barrida aborta la anterior. */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[usePilotoAutonomia] NEXT_PUBLIC_AGENT_URL is not configured')
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
    setIsLoading(true)
    const settled = await Promise.allSettled(
      PILOTO_AGENTES.map((agente) => fetchAgentAutonomia(agencyId, agente, controller.signal)),
    )
    if (controller.signal.aborted) return

    const next: AutonomiaRow[] = []
    let algunError: string | null = null
    settled.forEach((result, i) => {
      if (result.status === 'rejected') {
        // Fail-soft por agente: se registra el primer error real, pero los
        // demás agentes siguen rindiendo su fila.
        if (!algunError) {
          algunError =
            result.reason instanceof Error ? result.reason.message : 'fetch_failed'
        }
        return
      }
      const { data } = result.value
      if (!data) return // 404: el agente aún no reporta autonomía — se omite.
      next.push({
        agente: PILOTO_AGENTES[i],
        modo: data.modo,
        modosDisponibles: data.modosDisponibles,
        // Datos REALES que el API ya publicaba y este hook descartaba,
        // mientras el panel explicaba las vallas con texto inventado.
        valla: Array.isArray(data.valla) ? data.valla : [],
        t323: Boolean(data.t323),
        efectoReal: typeof data.efectoReal === 'string' ? data.efectoReal : null,
      })
    })
    setRows(next)
    // Error visible SOLO si no hay nada que mostrar: con filas en pantalla,
    // un agente caído no debe pintar un banner encima de datos buenos.
    setError(next.length === 0 && algunError ? algunError : null)
    setIsLoading(false)
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  const setModo = useCallback(
    async (agente: AgentePiloto, modo: AutonomiaModo): Promise<{ ok: boolean; error?: string }> => {
      if (!agencyId) return { ok: false, error: 'not_configured' }
      const previa = rows.find((r) => r.agente === agente)?.modo
      if (previa === undefined || previa === modo) return { ok: true }

      // Optimista: pinta el modo nuevo YA; el rollback deshace ante error.
      setBusyAgente(agente)
      setRows((cur) => cur.map((r) => (r.agente === agente ? { ...r, modo } : r)))
      const res = await putPilotoAutonomia(agencyId, agente, modo)
      setBusyAgente(null)
      if (!res.ok) {
        setRows((cur) => cur.map((r) => (r.agente === agente ? { ...r, modo: previa } : r)))
        return { ok: false, error: res.error }
      }
      // El backend es la autoridad: si respondió un modo distinto, gana él.
      if (res.data && res.data.modo !== modo) {
        const modoServidor = res.data.modo
        setRows((cur) =>
          cur.map((r) => (r.agente === agente ? { ...r, modo: modoServidor } : r)),
        )
      }
      return { ok: true }
    },
    [agencyId, rows],
  )

  return {
    rows,
    totalRoster: PILOTO_AGENTES.length,
    isLoading,
    error,
    busyAgente,
    setModo,
    refetch: fetchData,
  }
}
