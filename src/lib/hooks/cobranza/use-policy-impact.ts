'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/lib/auth'

export interface SimulatorOutcomeRow {
  outcome: string
  currentCount: number
  proposedCount: number
}

export interface PolicyImpactResponse {
  results: SimulatorOutcomeRow[]
}

export interface UsePolicyImpactResult {
  data: PolicyImpactResponse | null
  isSimulating: boolean
  error: string | null
  simulate: (proposedPolicy: object) => Promise<void>
}

export function usePolicyImpact(): UsePolicyImpactResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<PolicyImpactResponse | null>(null)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const simulate = useCallback(
    async (proposedPolicy: object): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) {
        setError('NEXT_PUBLIC_AGENT_URL not configured')
        return
      }
      if (!agencyId) return

      setIsSimulating(true)
      setError(null)
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/policy/simulate`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proposedPolicy),
          },
        )
        if (!res.ok) throw new Error(`${res.status}`)
        const json = (await res.json()) as PolicyImpactResponse
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch_failed')
      } finally {
        setIsSimulating(false)
      }
    },
    [agencyId],
  )

  return { data, isSimulating, error, simulate }
}
