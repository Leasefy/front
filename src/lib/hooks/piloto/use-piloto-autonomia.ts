'use client'

/**
 * use-piloto-autonomia.ts — autonomía POR AGENTE, escribible.
 *
 *   GET /api/agency/{agencyId}/ai-hub/autonomia                     (la flota: UNA petición)
 *   PUT /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia    {modo}
 *
 * ── Por qué una sola petición (auditoría del Piloto, 23-09-2026) ───────────
 * La pantalla del Piloto disparaba 26 GET al micro por carga, doce de ellos
 * `agentes/{x}/autonomia` (~2 s cada uno, de tres en tres), aunque
 * `/ai-hub/autonomia` ya traía los doce agentes en una respuesta. Desde el
 * 23-09 esa respuesta trae además, por agente, lo que el panel necesita: si
 * CORRE (bandera del servidor incluida), si el modo lo GOBIERNA, la frase de
 * lo que hace HOY (la misma de la píldora y del catálogo) y sus vallas. Una
 * sola fuente: el panel y la píldora no pueden contar historias distintas.
 *
 * `setModo` es optimista: pinta el modo nuevo, hace el PUT y ante error hace
 * rollback y devuelve el error para el toast.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import type { VallaItem } from '@/lib/api/agent-workspace'
import { fetchPilotoFlota, putPilotoAutonomia, type AutonomiaModo } from '@/lib/api/piloto'
import type { AgenteId } from '@/lib/api/work-item'

/**
 * El roster del panel (work-item.ts) MÁS los agentes GOBERNADOS por agencia
 * (2026-08-31) MÁS el chat del panel (P-1, 23-09-2026: «una sola perilla que
 * gobierna también el chat») MÁS los dueños de la operación del back
 * (contratos, facturación, propietarios: la perilla del micro los gobierna
 * desde el 23-09 — prórroga, factura del día, anticipo, extractos) MÁS
 * Contabilidad (Nico, 24-09-2026: «agente Contabilidad en el Piloto, con su
 * propio modo»: egresos, lote de egresos, causar facturas, el libro).
 */
export type AgentePiloto =
  | AgenteId
  | 'retencion'
  | 'calidad'
  | 'prospectos'
  | 'aprobaciones'
  | 'mantenimiento'
  | 'chat'
  | 'contratos'
  | 'facturacion'
  | 'propietarios'
  | 'contabilidad'

/** El orden del panel: primero los que actúan en el día a día, al final los que todavía no. */
const ORDEN: AgentePiloto[] = [
  'cobranza',
  'conciliacion',
  'chat',
  'contratos',
  'facturacion',
  'propietarios',
  'contabilidad',
  'pagos',
  'matching',
  'retencion',
  'prospectos',
  'calidad',
  'aprobaciones',
  'mantenimiento',
  'estudio',
  'cotizador',
  'avaluos',
]

const MODOS: AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

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
  /** ¿El modo cambia lo que hace? `false` = «todavía no actúa solo». */
  gobierna: boolean
  /** ¿Corre para esta inmobiliaria? (bandera del servidor + lista de la agencia) */
  corre: boolean
  porQueNoCorre: string | null
}

export interface UsePilotoAutonomiaResult {
  rows: AutonomiaRow[]
  /** Cuántos agentes tiene el roster (no cuántos contestaron). */
  totalRoster: number
  isLoading: boolean
  /** Sólo cuando no hay nada que mostrar y la petición falló de verdad. */
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

  /** Guard de respuestas viejas: cada lectura aborta la anterior. */
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
      const res = await fetchPilotoFlota(agencyId, controller.signal)
      if (controller.signal.aborted) return
      const agentes = res.data?.agentes ?? []
      const porAgente = new Map(agentes.map((a) => [a.agente, a]))
      const next: AutonomiaRow[] = []
      for (const agente of ORDEN) {
        const a = porAgente.get(agente)
        if (!a) continue // el micro no lo publica: no se inventa su modo
        next.push({
          agente,
          modo: a.modo,
          modosDisponibles: MODOS,
          valla: Array.isArray(a.valla) ? (a.valla as VallaItem[]) : [],
          t323: Boolean(a.t323),
          efectoReal: typeof a.efectoReal === 'string' ? a.efectoReal : null,
          gobierna: a.gobierna !== false,
          corre: a.corre,
          porQueNoCorre: a.porQueNoCorre ?? null,
        })
      }
      setRows(next)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
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
      // El micro es la autoridad: se relee para traer la frase del modo nuevo.
      void fetchData()
      return { ok: true }
    },
    [agencyId, rows, fetchData],
  )

  return {
    rows,
    totalRoster: ORDEN.length,
    isLoading,
    error,
    busyAgente,
    setModo,
    refetch: fetchData,
  }
}
