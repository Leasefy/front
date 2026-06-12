'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'

const POLL_INTERVAL_MS = 60_000

export interface ArcoRequestRow {
  id: string
  agencyId: string
  type: 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion'
  status:
    | 'pending_email_verification'
    | 'pending_admin_triage'
    | 'in_progress'
    | 'pending_counsel_review'
    | 'resolved'
    | 'rejected'
  requesterEmail: string
  requesterName: string
  requesterCedulaHash: string
  submittedAt: string
  resolvedAt: string | null
  slaDeadline: Date
}

export interface ArcoRequestsKpis {
  pending: number
  onTime: number
  overdue: number
  resolvedLast30d: number
}

export interface ArcoRequestsResponse {
  requests: ArcoRequestRow[]
  kpis: ArcoRequestsKpis
}

export interface UseArcoRequestsResult {
  data: ArcoRequestsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useArcoRequests(): UseArcoRequestsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<ArcoRequestsResponse | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/arco/requests`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as ArcoRequestsResponse
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

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, error, refetch }
}
