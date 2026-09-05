'use client'

/**
 * use-agent-work-items.ts — F1 of the Agent Workspace initiative.
 *
 * Reads the unified human-queue endpoint and exposes a generic action runner.
 *
 *   GET  /api/agency/{agencyId}/ai-hub/work-items?agente=…[&status][&page][&pageSize]
 *   POST {WorkItemAction.path}   (the action's own existing endpoint)
 *
 * Follows the NEXT_PUBLIC_AGENT_URL + agentAuthHeaders pattern used by
 * use-conciliacion-queue.ts / use-escalations.ts. Read-only data + the
 * mutating actions the backend declared on each WorkItem (F0 is adapter-first).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import type {
  AgenteId,
  AgentWorkItemsResponse,
  WorkItem,
  WorkItemAction,
} from '@/lib/api/work-item'

export interface AgentWorkItemsFilters {
  status?: string
  page?: number
  pageSize?: number
}

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface UseAgentWorkItemsResult {
  items: WorkItem[]
  total: number
  isLoading: boolean
  error: string | null
  /** El error entero: sin el status no se distingue un 404 de un 401. */
  errorCrudo: unknown
  refetch: () => Promise<void>
  /** Posts to the action's declared endpoint, then refetches on success. */
  runAction: (
    item: WorkItem,
    action: WorkItemAction,
    body?: Record<string, unknown>,
  ) => Promise<ActionResult>
}

export function useAgentWorkItems(
  agente: AgenteId,
  filters?: AgentWorkItemsFilters,
): UseAgentWorkItemsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<WorkItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // El error entero: sin el status, `FalloDeCarga` no distingue 404 de 401.
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useAgentWorkItems] NEXT_PUBLIC_AGENT_URL is not configured')
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
    // Upstream proxies (e.g. the standalone avalúos service) can hang when the
    // service is unreachable — never leave the queue in eternal skeletons.
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 12_000)

    const url = new URL(`${agentUrl}/api/agency/${agencyId}/ai-hub/work-items`)
    url.searchParams.set('agente', agente)
    if (filters?.status) url.searchParams.set('status', filters.status)
    if (filters?.page) url.searchParams.set('page', String(filters.page))
    if (filters?.pageSize) url.searchParams.set('pageSize', String(filters.pageSize))

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url.toString(), {
        headers: agentAuthHeaders(),
        signal: controller.signal,
      })
      if (controller.signal.aborted && !timedOut) return
      if (res.status === 404) {
        // Agent not deployed / queue not published yet — friendly empty state,
        // NOT an error banner (mirrors use-agent-overview's notAvailable).
        setItems([])
        setTotal(0)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as AgentWorkItemsResponse
      if (controller.signal.aborted && !timedOut) return
      setItems(json.items ?? [])
      setTotal(json.total ?? 0)
      setError(null)
    } catch (err) {
      // El guard va PRIMERO. Cancelar un pedido propio no es un fallo: React en
      // modo estricto monta dos veces, así que los dos primeros intentos se
      // abortan y sólo el tercero trae datos. Con `setErrorCrudo` antes de esta
      // línea, la cancelación quedaba guardada y la Sala de Pagos mostraba
      // «No pudimos cargar esto» con su referencia, aunque los datos hubieran
      // llegado bien un instante después. `use-agent-overview.ts` ya tenía el
      // orden correcto; esta copia no.
      if (controller.signal.aborted && !timedOut) return
      setErrorCrudo(err)
      setError(
        timedOut
          ? 'timeout'
          : err instanceof Error
            ? err.message
            : 'Failed to fetch work items',
      )
    } finally {
      clearTimeout(timeout)
      if (!controller.signal.aborted || timedOut) setIsLoading(false)
    }
  }, [agencyId, agente, filters?.status, filters?.page, filters?.pageSize])

  useEffect(() => {
    if (!agencyId) {
      // Auth/agency context not resolved (or absent): stop the skeletons —
      // the effect re-runs and fetches as soon as the agency arrives.
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  const runAction = useCallback(
    async (
      _item: WorkItem,
      action: WorkItemAction,
      body?: Record<string, unknown>,
    ): Promise<ActionResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }
      try {
        const res = await globalThis.fetch(`${agentUrl}${action.path}`, {
          method: action.method,
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify(body ?? {}),
        })
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: errBody.error ?? `${res.status}` }
        }
        await fetchData()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'action_failed' }
      }
    },
    [agencyId, fetchData],
  )

  return { items, total, isLoading, error, errorCrudo, refetch: fetchData, runAction }
}
