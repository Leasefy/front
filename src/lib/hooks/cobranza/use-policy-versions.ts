'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

const POLL_INTERVAL_MS = 60_000

export interface PolicyVersionRow {
  id: string
  versionNumber: number
  policyJson: Record<string, unknown>
  createdByMemberId: string
  createdAt: string
  changeDescription: string | null
}

export interface PolicyVersionsResponse {
  versions: PolicyVersionRow[]
  activeVersionNumber: number
}

export interface UsePolicyVersionsResult {
  data: PolicyVersionsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePolicyVersions(): UsePolicyVersionsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<PolicyVersionsResponse | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cobranza/policy-versions`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as PolicyVersionsResponse
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

  return { data, isLoading, error, refetch }
}
