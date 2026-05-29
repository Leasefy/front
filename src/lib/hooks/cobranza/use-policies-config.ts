'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

const POLL_INTERVAL_MS = 60_000

// Generic JSONB shape — Wave 4 plan 36-11 will add typed fields
export type PolicyConfig = Record<string, unknown>

export interface PoliciesConfigResponse {
  policy: PolicyConfig | null
  versionNumber: number | null
}

export interface UsePoliciesConfigResult {
  data: PoliciesConfigResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  savePolicy: (policy: PolicyConfig) => Promise<void>
}

export function usePoliciesConfig(): UsePoliciesConfigResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<PoliciesConfigResponse | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/policies`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as PoliciesConfigResponse
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
   * Fires a PUT to save the policy. Throws on non-2xx.
   * Caller manages optimistic state — this hook does NOT auto-refetch after save.
   */
  const savePolicy = useCallback(
    async (policy: PolicyConfig): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
      if (!agencyId) throw new Error('Agency not available')

      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/policies`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy),
        },
      )
      if (!res.ok) throw new Error(`${res.status}`)
    },
    [agencyId],
  )

  return { data, isLoading, error, refetch, savePolicy }
}
