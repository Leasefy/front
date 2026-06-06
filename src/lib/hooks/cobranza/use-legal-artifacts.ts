'use client'

/**
 * use-legal-artifacts.ts — Task 1 (H21 QA fix).
 *
 * Fetches the agency-level list of pre-judicial letters (cartas):
 *   GET /api/agency/{agencyId}/cartera/legal-artifacts
 *   → CarteraLegalArtifactListResponse { artifacts: CarteraLegalArtifactSummary[] }
 *
 * Optional `kind` and `status` query params mirror the API schema
 * (listCarteraLegalArtifacts operation).
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import type { components } from '@/lib/api/generated/agent'

export type LegalArtifactSummary = components['schemas']['CarteraLegalArtifactSummary']
export type LegalArtifactListResponse = components['schemas']['CarteraLegalArtifactListResponse']

export type LegalArtifactKind = 'pre_judicial_letter' | 'pre_bureau_notification'
export type LegalArtifactStatus = 'pending_human_review' | 'approved' | 'sent' | 'void'

export interface UseLegalArtifactsFilters {
  kind?: LegalArtifactKind
  status?: LegalArtifactStatus
}

export interface UseLegalArtifactsResult {
  data: LegalArtifactListResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLegalArtifacts(
  filters?: UseLegalArtifactsFilters,
): UseLegalArtifactsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<LegalArtifactListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useLegalArtifacts] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    const url = new URL(`${agentUrl}/api/agency/${agencyId}/cartera/legal-artifacts`)
    if (filters?.kind) url.searchParams.set('kind', filters.kind)
    if (filters?.status) url.searchParams.set('status', filters.status)
    try {
      setIsLoading(true)
      const res = await globalThis.fetch(url.toString(), {
        headers: agentAuthHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json: LegalArtifactListResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch legal artifacts')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, filters?.kind, filters?.status])

  useEffect(() => {
    if (!agencyId) return
    void fetchData()
  }, [fetchData, agencyId])

  return { data, isLoading, error, refetch: fetchData }
}
