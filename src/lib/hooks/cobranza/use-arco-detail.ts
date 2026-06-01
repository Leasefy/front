'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import type { ArcoRequestRow } from './use-arco-requests'

const POLL_INTERVAL_MS = 60_000

export interface ArcoDetailData extends ArcoRequestRow {
  subjectDescription: string
  emailVerifiedAt: string | null
  triagedAt: string | null
  resolutionPayload: Record<string, unknown> | null
  auditLogIds: string[]
}

export interface ArcoDetailTimeline {
  status: string
  timestamp: string | null
}

export interface ArcoDetailResponse {
  request: ArcoDetailData
  timeline: ArcoDetailTimeline[]
}

export interface UseArcoDetailResult {
  data: ArcoDetailResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useArcoDetail(requestId: string | null): UseArcoDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<ArcoDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !requestId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/arco/requests/${requestId}`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ArcoDetailResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, requestId])

  useEffect(() => {
    if (!agencyId || !requestId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
    const id = setInterval(() => {
      void fetchOnce()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchOnce, agencyId, requestId])

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
