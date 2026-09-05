'use client'

/**
 * use-mantenimiento-ticket.ts — Phase 7 plan 07-01 (DASH-03)
 *
 * Ticket-detail hook + mock CTA mutators. Mock-first (CONTEXT §MOCK-FIRST):
 *   - mock mode (default): resolve getMockTicketDetail(id, now) after mockDelayMs.
 *   - real mode: GET `${NEXT_PUBLIC_AGENT_URL}/api/agency/:id/mantenimiento/tickets/:ticketId`.
 *
 * Returns `{ data, isLoading, error, refetch }` PLUS mock mutators for the 5+1 CTAs.
 * Mutators mutate LOCAL detail state and only transition to members of MAINTENANCE_STATES
 * (CONTEXT §compliance — never invent an arc). `close()` honors the FENCE-04 evidence gate:
 * it is a no-op returning `false` without an evidence/confirmation arg.
 *
 * Mutators are mock-only (the real CTA wire is a follow-up agent-side). On the real
 * branch they are harmless no-ops.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { getApiConfig } from '@/lib/api/config'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { getMockTicketDetail } from '@/lib/data/mock-mantenimiento'
import type {
  MaintenanceTicketDetail,
  MaintenanceTicketState,
  TicketEvent,
} from '@/lib/types/mantenimiento'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface CloseEvidence {
  note: string
}

export interface UseMantenimientoTicketResult {
  data: MaintenanceTicketDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  /** → proveedor_asignado */
  assign: () => MaintenanceTicketState | null
  /** → informacion_incompleta */
  requestInfo: () => MaintenanceTicketState | null
  /** → requiere_aprobacion */
  requestApproval: () => MaintenanceTicketState | null
  /** → escalado */
  escalate: () => MaintenanceTicketState | null
  /** → reabierto */
  reopen: () => MaintenanceTicketState | null
  /** → cerrado, ONLY with evidence (FENCE-04). Returns true on close, false if gated. */
  close: (evidence?: CloseEvidence) => boolean
}

export function useMantenimientoTicket(ticketId: string): UseMantenimientoTicketResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<MaintenanceTicketDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nowRef = useRef<Date>(new Date())

  const fetchData = useCallback(async () => {
    const cfg = getApiConfig()
    setIsLoading(true)
    if (cfg.useMockApi) {
      await delay(cfg.mockDelayMs)
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
        `${agentUrl}/api/agency/${agencyId}/mantenimiento/tickets/${ticketId}`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: MaintenanceTicketDetail = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch mantenimiento ticket')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, ticketId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /** Local-only transition: set estado + append a human evento (mock-first). */
  const transition = useCallback(
    (next: MaintenanceTicketState, tipo: string, descripcion: string): MaintenanceTicketState | null => {
      let applied: MaintenanceTicketState | null = null
      setData((prev) => {
        if (!prev) return prev
        const evento: TicketEvent = {
          id: `${prev.id}-ev-${prev.eventos.length + 1}`,
          at: new Date().toISOString(),
          tipo,
          descripcion,
          actor: 'human',
        }
        applied = next
        return { ...prev, estado: next, eventos: [...prev.eventos, evento] }
      })
      return applied
    },
    [],
  )

  const assign = useCallback(
    () => transition('proveedor_asignado', 'asignar', 'Proveedor asignado al ticket.'),
    [transition],
  )
  const requestInfo = useCallback(
    () => transition('informacion_incompleta', 'pedirInfo', 'Se solicitó información adicional al inquilino.'),
    [transition],
  )
  const requestApproval = useCallback(
    () => transition('requiere_aprobacion', 'solicitarAprobacion', 'Se solicitó aprobación del propietario.'),
    [transition],
  )
  const escalate = useCallback(
    () => transition('escalado', 'escalarEmergencia', 'Ticket escalado como emergencia.'),
    [transition],
  )
  const reopen = useCallback(
    () => transition('reabierto', 'reabrir', 'Ticket reabierto: el problema persiste.'),
    [transition],
  )

  /**
   * FENCE-04: cerrar exige evidencia+confirmación. Without an evidence arg this is a
   * no-op returning false (mock reflects the backend close gate — CONTEXT §compliance).
   */
  const close = useCallback(
    (evidence?: CloseEvidence): boolean => {
      if (!evidence || !evidence.note || evidence.note.trim().length === 0) return false
      transition('cerrado', 'cerrar', `Ticket cerrado con evidencia: ${evidence.note}`)
      return true
    },
    [transition],
  )

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    assign,
    requestInfo,
    requestApproval,
    escalate,
    reopen,
    close,
  }
}
