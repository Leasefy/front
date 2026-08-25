'use client'

/**
 * use-insurance-claims.ts — Task 1 (H21 QA fix).
 *
 * Fetches the agency-level list of insurance claims (siniestros):
 *   GET /api/agency/{agencyId}/cartera/insurance-claims
 *   → CarteraInsuranceClaimListResponse { claims: CarteraInsuranceClaimSummary[] }
 *
 * Optional `status` query param mirrors the API schema
 * (listCarteraInsuranceClaims operation).
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import type { components } from '@/lib/api/generated/agent'

export type InsuranceClaimSummary = components['schemas']['CarteraInsuranceClaimSummary']
export type InsuranceClaimListResponse = components['schemas']['CarteraInsuranceClaimListResponse']

export type InsuranceClaimStatus =
  | 'draft'
  | 'pending_human_review'
  | 'filed'
  | 'accepted'
  | 'rejected'

export interface UseInsuranceClaimsFilters {
  status?: InsuranceClaimStatus
}

export interface UseInsuranceClaimsResult {
  data: InsuranceClaimListResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInsuranceClaims(
  filters?: UseInsuranceClaimsFilters,
): UseInsuranceClaimsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<InsuranceClaimListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useInsuranceClaims] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    const url = new URL(`${agentUrl}/api/agency/${agencyId}/cartera/insurance-claims`)
    if (filters?.status) url.searchParams.set('status', filters.status)
    try {
      setIsLoading(true)
      const res = await agentFetch(url.toString())
      if (!res.ok) throw new Error(`${res.status}`)
      const json: InsuranceClaimListResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insurance claims')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, filters?.status])

  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    void fetchData()
  }, [fetchData, agencyId])

  return { data, isLoading, error, refetch: fetchData }
}
