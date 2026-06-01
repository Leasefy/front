'use client'

/**
 * use-carrier-registry.ts — Phase 35 plan 35-07.
 *
 * Polls GET /api/agency/:agencyId/cotizador/aseguradoras/registry every 60s.
 * Also exposes saveOverride (PUT) and resetOverride (DELETE) mutation helpers.
 * Callers are responsible for optimistic state management — the mutation helpers
 * do NOT call refetch() after writing.
 *
 * Follows the exact polling pattern from use-compliance-overview.ts (Phase 34).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// =============================================================================
// Types
// =============================================================================

export interface GlobalCarrierRow {
  name: string
  route: string
  mode: 'direct' | 'stub'
  enabled: boolean
  priority: number
  maxCanonCop: number | null
  breachStatus: 'healthy' | 'degraded' | 'breached' | 'unknown'
}

export interface TenantOverrideRow {
  name: string
  route: string
  enabled: boolean | null      // null = inherits global
  priority: number | null
  mode: 'direct' | 'stub' | null
  maxCanonCop: number | null
}

export interface RegistryResponse {
  global: GlobalCarrierRow[]
  overrides: TenantOverrideRow[]
}

export interface OverrideFields {
  enabled: boolean | null
  priority: number | null
  mode: 'direct' | 'stub' | null
  maxCanonCop: number | null
}

const POLL_INTERVAL_MS = 60_000

export interface UseCarrierRegistryResult {
  data: RegistryResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  saveOverride: (carrierName: string, route: string, fields: Partial<OverrideFields>) => Promise<void>
  resetOverride: (carrierName: string, route: string) => Promise<void>
}

// =============================================================================
// Hook
// =============================================================================

export function useCarrierRegistry(): UseCarrierRegistryResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<RegistryResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/registry`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json() as RegistryResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) return
    void fetchOnce()
    const id = setInterval(() => {
      void fetchOnce()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchOnce, agencyId])

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  /**
   * saveOverride — fires PUT to the override endpoint.
   * Does NOT call refetch() — caller handles optimistic state.
   * Throws on non-2xx responses.
   */
  const saveOverride = useCallback(async (
    carrierName: string,
    route: string,
    fields: Partial<OverrideFields>,
  ): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
    if (!agencyId) throw new Error('Agency not authenticated')

    const res = await globalThis.fetch(
      `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrierName}/override`,
      {
        method: 'PUT',
        headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ route, ...fields }),
      },
    )
    if (!res.ok) throw new Error(`${res.status}`)
  }, [agencyId])

  /**
   * resetOverride — fires DELETE to the override endpoint.
   * Does NOT call refetch() — caller handles optimistic state.
   * Throws on non-2xx responses.
   */
  const resetOverride = useCallback(async (
    carrierName: string,
    route: string,
  ): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
    if (!agencyId) throw new Error('Agency not authenticated')

    const res = await globalThis.fetch(
      `${agentUrl}/api/agency/${agencyId}/cotizador/aseguradoras/${carrierName}/override?route=${encodeURIComponent(route)}`,
      {
        method: 'DELETE',
        headers: agentAuthHeaders(),
      },
    )
    if (!res.ok) throw new Error(`${res.status}`)
  }, [agencyId])

  return { data, isLoading, error, refetch, saveOverride, resetOverride }
}
