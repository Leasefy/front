'use client'

/**
 * use-autonomy.ts
 *
 * Wires the autonomy-level selector to the REAL endpoint the orchestrator
 * reads: `GET/PUT /api/agency/{agencyId}/cobranza/autonomy`.
 *
 *   - GET/PUT 200: `{ agencyId, autonomyLevel, requiresHumanApproval, isDefault }`.
 *   - PUT body: `{ autonomyLevel }`. The response already carries the full
 *     updated row, so this hook updates local state directly (no refetch).
 *   - 404 on either verb means the agency has not completed onboarding —
 *     surfaced as `notProvisioned`, not a generic error.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'
import type { components } from '@/lib/api/generated/agent'

export type AutonomyResponse = components['schemas']['CobranzaAutonomyResponse']
export type AutonomyLevel = AutonomyResponse['autonomyLevel']

export interface UseAutonomyResult {
  data: AutonomyResponse | null
  isLoading: boolean
  error: string | null
  /** true when GET/PUT returned 404 — agency onboarding incompleto, no row yet. */
  notProvisioned: boolean
  refetch: () => Promise<void>
  /** PUTs the new autonomy level. Throws on non-2xx. */
  saveAutonomy: (autonomyLevel: AutonomyLevel) => Promise<void>
}

export function useAutonomy(): UseAutonomyResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<AutonomyResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [notProvisioned, setNotProvisioned] = useState<boolean>(false)

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
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/cobranza/autonomy`)
      if (res.status === 404) {
        setNotProvisioned(true)
        setData(null)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as AutonomyResponse
      setNotProvisioned(false)
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  useRefetchOnVisible(() => void fetchOnce(), Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  const saveAutonomy = useCallback(
    async (autonomyLevel: AutonomyLevel): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
      if (!agencyId) throw new Error('Agency not available')

      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/autonomy`,
        {
          method: 'PUT',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ autonomyLevel }),
        },
      )
      if (res.status === 404) {
        setNotProvisioned(true)
        throw new Error('404')
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as AutonomyResponse
      setNotProvisioned(false)
      setData(json)
    },
    [agencyId],
  )

  return { data, isLoading, error, notProvisioned, refetch, saveAutonomy }
}
