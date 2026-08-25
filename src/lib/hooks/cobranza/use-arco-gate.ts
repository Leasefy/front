'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'

export interface ArcoGateResponse {
  blocked: boolean
}

export interface UseArcoGateResult {
  data: ArcoGateResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useArcoGate(): UseArcoGateResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<ArcoGateResponse | null>(null)
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
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/arco/gate-status`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ArcoGateResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  // Fetch once on mount — no polling interval (5-min TTL is enforced server-side)
  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
