'use client'

import { useCallback, useEffect, useState } from 'react'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useAuth } from '@/lib/auth'

const POLL_INTERVAL_MS = 60_000

export interface TemplateRow {
  id: string
  name: string
  category: 'stage' | 'whatsapp' | 'objection'
  bodyDraft: string
  bodyPublished: string | null
  status: 'draft' | 'published'
  waSubmissionStatus: 'pending' | 'approved' | 'rejected' | null
  tokenCount: number
  updatedAt: string
}

export interface TemplatesResponse {
  templates: TemplateRow[]
}

export interface UseTemplatesResult {
  data: TemplatesResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<TemplatesResponse | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cobranza/templates`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as TemplatesResponse
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
