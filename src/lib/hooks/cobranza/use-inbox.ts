'use client'

/**
 * use-inbox.ts — Cobranza "Inbox de conversaciones" (visión #20).
 *
 * Cablea la UI de agrupaciones del inbox a los endpoints NUEVOS del agente:
 *   - GET  /api/agency/{agencyId}/cobranza/inbox            → grupos + conteos
 *   - GET  /api/agency/{agencyId}/cobranza/inbox/{threadId} → hilo + mensajes
 *   - POST /api/agency/{agencyId}/cobranza/inbox/{threadId}/read → marcar leído
 *
 * Patrón: mirror de `use-cartera-overview.ts` — useState + useEffect + polling
 * por visibilidad. Null-guards en agency.id y NEXT_PUBLIC_AGENT_URL.
 *
 * FAIL-SOFT (regla de oro): el backend nuevo AÚN NO está desplegado. El endpoint
 * puede responder 404 / vacío / error → en ese caso degradamos EXACTAMENTE al
 * estado actual de la pantalla (sin hilos → EmptyState), NUNCA rompemos ni
 * mostramos un error feo. La lista de grupos por defecto siempre existe con
 * conteo 0 (`emptyGroups()`), así que la página renderiza sus agrupaciones aun
 * sin datos.
 *
 * T-323: este hook SOLO lee y marca leído (operación benigna de estado de
 * lectura, sin contacto con el deudor). No responde, no resuelve, no escala.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'
import {
  INBOX_GRUPOS,
  type InboxGrupo,
} from '@/components/inmobiliaria/cobranza/CobranzaInboxGroups'

// ── Contrato del backend (agency-cobranza-inbox.ts) ──────────────────────────

/** Etiquetas de triage del backend (las 7 visión + 'otro'). */
export type BackendInboxLabel =
  | 'nueva_respuesta'
  | 'promesa_detectada'
  | 'pago_reportado'
  | 'solicitud_acuerdo'
  | 'disputa'
  | 'sin_entender'
  | 'requiere_humano'
  | 'otro'

export interface InboxThreadSummary {
  id: string
  debtorId: string
  channel: string
  label: string | null
  status: string
  /** Nombre del deudor; null sólo si el deudor ya no existe. */
  debtorName?: string | null
  unread: boolean
  requiresAction: boolean
  lastMessageAt: string
  lastMessagePreview: string | null
  createdAt: string
}

export interface InboxBackendGroup {
  label: string
  title: string
  count: number
  threads: InboxThreadSummary[]
}

export interface InboxListResponse {
  groups: InboxBackendGroup[]
  totalThreads: number
  totalUnread: number
  generatedAt: string
}

export interface InboxMessage {
  id: string
  direction: string
  channel: string
  body: string
  classification: string | null
  occurredAt: string
  createdAt: string
}

export interface InboxThreadDetailResponse {
  thread: InboxThreadSummary
  messages: InboxMessage[]
}

// ── Mapeo etiqueta backend → grupo de UI ─────────────────────────────────────
//
// El backend usa snake_case ('nueva_respuesta'); la UI usa keys cortas
// ('nuevas'). 'otro' (catch-all del backend) no tiene grupo propio en la UI →
// lo plegamos a 'nuevas' para que igual sea visible y accionable por el humano.

const LABEL_TO_GRUPO: Record<BackendInboxLabel, InboxGrupo> = {
  nueva_respuesta: 'nuevas',
  promesa_detectada: 'promesas',
  pago_reportado: 'pagos',
  solicitud_acuerdo: 'acuerdos',
  disputa: 'disputas',
  sin_entender: 'sin_entender',
  requiere_humano: 'requiere_humano',
  otro: 'nuevas',
}

/** Traduce una etiqueta de backend (o null/desconocida) al grupo de UI. */
export function backendLabelToGrupo(label: string | null | undefined): InboxGrupo {
  if (label && label in LABEL_TO_GRUPO) {
    return LABEL_TO_GRUPO[label as BackendInboxLabel]
  }
  return 'nuevas'
}

/** Conteos por grupo de UI, todos en 0 (estado base sin datos). */
function emptyCounts(): Record<InboxGrupo, number> {
  return Object.fromEntries(INBOX_GRUPOS.map((g) => [g, 0])) as Record<
    InboxGrupo,
    number
  >
}

// ── Hook principal: lista del inbox (grupos + conteos) ───────────────────────

export interface UseCobranzaInboxResult {
  /** Grupos del backend, en su orden de presentación. */
  groups: InboxBackendGroup[]
  /** Conteos derivados, mapeados a las keys de grupo de la UI. */
  countsByGrupo: Record<InboxGrupo, number>
  /** Hilos planos (todos los grupos), por si la UI los quiere recorrer. */
  threads: InboxThreadSummary[]
  totalThreads: number
  totalUnread: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  /**
   * Marca un hilo como leído (POST /read) y refresca la lista. Fail-soft: si
   * el backend no está desplegado responde un no-op 200; cualquier error se
   * traga (devuelve false) sin romper la UI. T-323: NO contacta al deudor.
   */
  markRead: (threadId: string) => Promise<boolean>
}

export function useCobranzaInbox(): UseCobranzaInboxResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<InboxListResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      // Fail-soft, sin warn ruidoso: backend no configurado → estado vacío.
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/inbox`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json: InboxListResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      // Fail-soft: dejamos data en null → la página cae a sus conteos 0 +
      // EmptyState. Guardamos el error solo para diagnóstico, no para UI fea.
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, agencyId])

  useVisibilityPolling(() => void fetchData(), 30_000, Boolean(agencyId))

  const markRead = useCallback(
    async (threadId: string): Promise<boolean> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId || !threadId) return false
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/inbox/${threadId}/read`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
          },
        )
        if (!res.ok) throw new Error(`${res.status}`)
        // Refresca la lista para que el contador de no leídos se actualice.
        await fetchData()
        return true
      } catch {
        // Fail-soft: no rompemos la UI si el endpoint no está desplegado.
        return false
      }
    },
    [agencyId, fetchData],
  )

  const groups = useMemo<InboxBackendGroup[]>(() => data?.groups ?? [], [data])

  const threads = useMemo<InboxThreadSummary[]>(
    () => groups.flatMap((g) => g.threads),
    [groups],
  )

  const countsByGrupo = useMemo<Record<InboxGrupo, number>>(() => {
    const counts = emptyCounts()
    for (const g of groups) {
      const grupo = backendLabelToGrupo(g.label)
      counts[grupo] += g.count
    }
    return counts
  }, [groups])

  return {
    groups,
    countsByGrupo,
    threads,
    totalThreads: data?.totalThreads ?? 0,
    totalUnread: data?.totalUnread ?? 0,
    isLoading,
    error,
    refetch: fetchData,
    markRead,
  }
}

// ── Hook secundario: detalle de un hilo (mensajes) bajo demanda ──────────────

export interface UseInboxThreadResult {
  data: InboxThreadDetailResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Carga un hilo y sus mensajes (oldest → newest) bajo demanda. Pasar
 * `threadId = null` deja el hook inerte (no fetch) — útil cuando no hay hilo
 * seleccionado. Fail-soft: 404 (hilo inexistente o backend no migrado) → data
 * null sin romper.
 */
export function useInboxThread(threadId: string | null): UseInboxThreadResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<InboxThreadDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(threadId))
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setIsLoading(false)
      return
    }
    if (!agencyId || !threadId) {
      setData(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/inbox/${threadId}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json: InboxThreadDetailResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      // Fail-soft: 404 → sin mensajes; la UI muestra su vacío del hilo.
      setData(null)
      setError(err instanceof Error ? err.message : 'Failed to fetch thread')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, threadId])

  useEffect(() => {
    if (!agencyId || !threadId) {
      setData(null)
      setIsLoading(false)
      return
    }
    void fetchData()
  }, [fetchData, agencyId, threadId])

  return { data, isLoading, error, refetch: fetchData }
}
