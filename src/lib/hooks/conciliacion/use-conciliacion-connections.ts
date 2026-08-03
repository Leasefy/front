'use client'

/**
 * use-conciliacion-connections.ts — Conciliación Sala wiring (build C).
 *
 * Wires the "Conexiones" surface (data-source registry) to the real backend
 * route (verified against conciliacion-connections.ts):
 *
 *   GET   /api/agency/{agencyId}/conciliacion/connections
 *     → { items: Connection[] }   (200, possibly empty; fail-soft to empty)
 *   POST  /api/agency/{agencyId}/conciliacion/connections
 *     → Connection   (201)        body: { sourceType, provider, displayName, configRef? }
 *   PATCH /api/agency/{agencyId}/conciliacion/connections/{id}
 *     → Connection   (200)        body: { status?, displayName? }  (≥1 required)
 *
 * SECURITY — NO RAW CREDENTIALS. The backend never accepts/stores/returns a
 * raw credential; only `configRef` (an opaque reference, e.g. a vault path)
 * exists. This hook mirrors that: it sends ONLY configRef, never a password /
 * token / apiKey field.
 *
 * FAIL-SOFT (regla de oro): the build C backend may not be deployed → the GET
 * can 404 (route absent) or 503 (stub / table not migrated). Either way the
 * list degrades to empty and `notAvailable` is set so the caller can render its
 * existing EmptyState. The hook NEVER throws. Mutations on an unavailable
 * backend return { ok:false } with an honest error (the caller toasts; the
 * screen is untouched).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// ── Closed sets (mirror the backend CHECK constraints) ───────────────────────

/** Connection kind. */
export type ConnectionSourceType = 'banco' | 'pasarela' | 'extracto'
/** Connection health. New connections start 'desconectado'. */
export type ConnectionStatus = 'conectado' | 'error' | 'desconectado'

export const CONNECTION_SOURCE_TYPES: ReadonlyArray<ConnectionSourceType> = [
  'banco',
  'pasarela',
  'extracto',
]

export const CONNECTION_STATUSES: ReadonlyArray<ConnectionStatus> = [
  'conectado',
  'error',
  'desconectado',
]

// ── API shape (matched to conciliacion-connections.ts ConnectionSchema) ──────

export interface ConciliacionConnection {
  id: string
  sourceType: string // 'banco' | 'pasarela' | 'extracto'
  provider: string
  displayName: string
  status: string // 'conectado' | 'error' | 'desconectado'
  lastSyncAt: string | null // ISO
  /** Opaque reference to where the credential lives — NEVER a raw credential. */
  configRef: string | null
  createdAt: string // ISO
}

interface ConnectionsListResponse {
  items: ConciliacionConnection[]
}

// ── Input shapes ─────────────────────────────────────────────────────────────

export interface CreateConnectionInput {
  sourceType: ConnectionSourceType
  provider: string
  displayName: string
  /** Optional opaque reference (vault path / secret key). NEVER a raw secret. */
  configRef?: string
}

export interface PatchConnectionInput {
  status?: ConnectionStatus
  displayName?: string
}

// ── Action result ──────────────────────────────────────────────────────────

export interface ConnectionActionResult {
  ok: boolean
  connection?: ConciliacionConnection
  error?: string
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseConciliacionConnectionsResult {
  items: ConciliacionConnection[]
  isLoading: boolean
  error: string | null
  /** Backend 404/503 — endpoint not deployed / not migrated (NOT an error). */
  notAvailable: boolean
  refetch: () => Promise<void>
  createConnection: (input: CreateConnectionInput) => Promise<ConnectionActionResult>
  patchConnection: (id: string, input: PatchConnectionInput) => Promise<ConnectionActionResult>
}

export function useConciliacionConnections(): UseConciliacionConnectionsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [items, setItems] = useState<ConciliacionConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useConciliacionConnections] NEXT_PUBLIC_AGENT_URL is not configured')
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

    const url = `${agentUrl}/api/agency/${agencyId}/conciliacion/connections`

    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url, {
        headers: agentAuthHeaders(),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      // 404 (route not deployed) or 503 (stub / table not migrated) → graceful.
      if (res.status === 404 || res.status === 503) {
        setItems([])
        setNotAvailable(true)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ConnectionsListResponse
      setItems(Array.isArray(json.items) ? json.items : [])
      setNotAvailable(false)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      // Network error / unexpected non-OK → degrade to empty list, honest error.
      setItems([])
      setError(err instanceof Error ? err.message : 'Failed to fetch connections')
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

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createConnection = useCallback(
    async (input: CreateConnectionInput): Promise<ConnectionActionResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }

      // Only the reference is ever sent. No raw credential field exists.
      const body: CreateConnectionInput = {
        sourceType: input.sourceType,
        provider: input.provider,
        displayName: input.displayName,
        ...(input.configRef && input.configRef.trim() !== ''
          ? { configRef: input.configRef.trim() }
          : {}),
      }

      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/connections`,
          {
            method: 'POST',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: errBody.error ?? `${res.status}` }
        }
        const connection = (await res.json()) as ConciliacionConnection
        await fetchData()
        return { ok: true, connection }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'create_failed' }
      }
    },
    [agencyId, fetchData],
  )

  const patchConnection = useCallback(
    async (id: string, input: PatchConnectionInput): Promise<ConnectionActionResult> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return { ok: false, error: 'not_configured' }

      const body: PatchConnectionInput = {}
      if (input.status !== undefined) body.status = input.status
      if (input.displayName !== undefined) body.displayName = input.displayName
      if (body.status === undefined && body.displayName === undefined) {
        return { ok: false, error: 'no_changes' }
      }

      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/conciliacion/connections/${id}`,
          {
            method: 'PATCH',
            headers: agentAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: errBody.error ?? `${res.status}` }
        }
        const connection = (await res.json()) as ConciliacionConnection
        await fetchData()
        return { ok: true, connection }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'patch_failed' }
      }
    },
    [agencyId, fetchData],
  )

  return {
    items,
    isLoading,
    error,
    notAvailable,
    refetch: fetchData,
    createConnection,
    patchConnection,
  }
}
