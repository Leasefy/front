'use client'

/**
 * use-agency-policy.ts
 *
 * Wires the negotiation/discounts section of the cobranza config screen to
 * the REAL endpoint the agent reads: `GET/PATCH /api/agency/{agencyId}/policy`
 * (singular). Do NOT confuse with `/policies` (plural, decorative journal —
 * see `use-policies-config.ts`, kept only for a possible future "historial de
 * cambios" view).
 *
 *   - GET: `AgencyPolicyResponse` — full negotiation policy row.
 *   - PATCH: partial `AgencyPolicyPatchBody` — only changed fields are sent.
 *   - 404 on either verb means the agency has not completed onboarding (the
 *     `AgencyPolicy` row does not exist yet) — surfaced as `notProvisioned`,
 *     not as a generic error.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'
import type { components } from '@/lib/api/generated/agent'

export type AgencyPolicy = components['schemas']['AgencyPolicyResponse']
export type AgencyPolicyPatchBody = components['schemas']['AgencyPolicyPatchBody']

export interface UseAgencyPolicyResult {
  data: AgencyPolicy | null
  isLoading: boolean
  error: string | null
  /** true when GET/PATCH returned 404 — agency onboarding incompleto, no row yet. */
  notProvisioned: boolean
  refetch: () => Promise<void>
  /** PATCHes only the given fields. Throws on non-2xx. */
  patchPolicy: (partial: AgencyPolicyPatchBody) => Promise<void>
}

export function useAgencyPolicy(): UseAgencyPolicyResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<AgencyPolicy | null>(null)
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
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/policy`)
      if (res.status === 404) {
        setNotProvisioned(true)
        setData(null)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as AgencyPolicy
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

  const patchPolicy = useCallback(
    async (partial: AgencyPolicyPatchBody): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
      if (!agencyId) throw new Error('Agency not available')

      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/policy`,
        {
          method: 'PATCH',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(partial),
        },
      )
      if (res.status === 404) {
        setNotProvisioned(true)
        throw new Error('404')
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as AgencyPolicy
      setNotProvisioned(false)
      setData(json)
    },
    [agencyId],
  )

  return { data, isLoading, error, notProvisioned, refetch, patchPolicy }
}
