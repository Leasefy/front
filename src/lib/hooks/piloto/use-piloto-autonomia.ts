'use client'

/**
 * use-piloto-autonomia.ts — autonomía POR AGENTE, escribible.
 *
 *   GET /api/agency/{agencyId}/ai-hub/agentes/autonomia            (T-0082 —
 *       roster batcheado: UNA llamada que reemplaza los 12 GETs por agente
 *       que este hook hacía antes con `Promise.allSettled`/
 *       `mapWithConcurrency` (T-0076 solo acotó ese fan-out a 3 en vuelo, no
 *       lo eliminó). Contrato:
 *       `.orchestration/tasks/T-0082-login-bootstrap-fanout/contract.md`
 *       §3.2 Surface B. Misma lectura que ya usa la píldora de la flota
 *       — `leerAutonomiaDeLaFlota` en el micro — con el shape por-ítem
 *       byte-idéntico al GET por agente, que sigue vivo sin cambios.)
 *   PUT /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia   {modo}
 *
 * Fail-soft por agente: un agente ausente del array devuelto simplemente no
 * aparece — mismo resultado visible que el 404 por agente de antes, solo que
 * ahora se resuelve indexando la respuesta, no con un fetch que falla.
 * Si la llamada ENTERA falla (503/403/red), no hay degradación parcial que
 * diseñar: es una sola lectura batcheada — o vuelve todo o no vuelve nada
 * (contract.md §3.3). `setModo` es optimista: pinta el modo nuevo, hace el
 * PUT y ante error hace rollback y devuelve el error para el toast; ante
 * éxito parchea la fila local — no hace falta re-disparar el roster entero
 * por un solo campo.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchAgentAutonomiaRoster, type VallaItem } from '@/lib/api/agent-workspace'
import { putPilotoAutonomia, type AutonomiaModo } from '@/lib/api/piloto'
import type { AgenteId } from '@/lib/api/work-item'

/**
 * El roster del panel (work-item.ts, cerrado 2026-06-08) MÁS los agentes
 * GOBERNADOS por agencia (2026-08-31): desde que el gobierno dejó de ser
 * solo-cobranza, el endpoint de autonomía acepta también retención, calidad,
 * prospectos, aprobaciones y mantenimiento — y elegirles modo acá es
 * exactamente lo que gobierna su ejecución (piloto/gobierno.ts en el micro).
 *
 * Este set DEBE coincidir con `AGENTES_CON_AUTONOMIA` en el micro
 * (`agent/src/piloto/flota.ts`, `AGENTE_IDS` ∪ `AGENTES_GOBERNADOS`) — si un
 * lado cambia sin el otro, un agente desaparece en silencio de un lado del
 * roster (contract.md §3.2, "Verified alignment", verificado por enumeración
 * 2026-09-10). El micro ya deja un comentario apuntando acá; este es el que
 * apunta para allá.
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
  /** Solo cuando la llamada al roster falló entera (contract.md §3.3). */
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
    try {
      const { data } = await fetchAgentAutonomiaRoster(agencyId, controller.signal)
      if (controller.signal.aborted) return

      // Índice por `agente` (contract.md §3.1: es un array porque cada fila
      // se auto-identifica; "keyed by agent id" se resuelve ACÁ, no en el wire).
      const porAgente = new Map((data?.agentes ?? []).map((fila) => [fila.agente, fila]))

      const next: AutonomiaRow[] = []
      PILOTO_AGENTES.forEach((agente) => {
        const fila = porAgente.get(agente)
        // Ausente del roster: mismo fail-soft que el 404 por agente de
        // antes — la fila simplemente no aparece, no es un error.
        if (!fila) return
        next.push({
          agente,
          modo: fila.modo,
          modosDisponibles: fila.modosDisponibles,
          valla: Array.isArray(fila.valla) ? fila.valla : [],
          t323: Boolean(fila.t323),
          efectoReal: typeof fila.efectoReal === 'string' ? fila.efectoReal : null,
        })
      })
      setRows(next)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      // Sin degradación parcial posible: es UNA lectura batcheada — si la
      // llamada falla, no hay filas que mostrar (contract.md §3.3).
      setRows([])
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
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
      // No hace falta re-disparar el roster completo (contract.md, brief §4
      // item 2): la fila local ya quedó correcta con este parche.
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
