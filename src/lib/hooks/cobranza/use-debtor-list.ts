'use client'

/**
 * use-debtor-list.ts — Phase 31 plan 31-07 (COBR-UI-02).
 *
 * Smoke-test typed hook proving the OpenAPI → hook flow works end-to-end.
 *
 * Derives request query + response shape directly from the regenerated
 * `paths` map in `@/lib/api/generated/agent.ts` — no hand-rolled types,
 * no `any`. Downstream page plans (31-08..31-11) will add the rest of
 * the cobranza hooks following this pattern.
 *
 * Fetcher: matches Phase 29 `use-cartera-overview.ts` convention
 * (NEXT_PUBLIC_AGENT_URL + credentials: 'include'). SWR is not yet
 * installed in mvp; once it is, this hook can swap to useSWR without
 * changing its public signature.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import type { paths } from '@/lib/api/generated/agent'

// ── Derived types (no `any`, no hand-rolled shapes) ─────────────────────────

type DebtorListOp = paths['/api/agency/{agencyId}/cobranza/debtors']['get']

export type DebtorListQuery = NonNullable<DebtorListOp['parameters']['query']>

export type DebtorListResponse =
  DebtorListOp['responses']['200']['content']['application/json']

export interface UseDebtorListResult {
  data: DebtorListResponse | null
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useDebtorList(
  agencyId: string | null,
  filters: DebtorListQuery = {},
): UseDebtorListResult {
  const { agency } = useAuth()
  const effectiveAgencyId = agencyId ?? agency?.id ?? null

  const [data, setData] = useState<DebtorListResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (): Promise<void> => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useDebtorList] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!effectiveAgencyId) {
      setIsLoading(false)
      return
    }

    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '') continue
      qs.set(k, String(v))
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : ''

    setIsLoading(true)
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${effectiveAgencyId}/cobranza/debtors${suffix}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as DebtorListResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debtors list')
    } finally {
      setIsLoading(false)
    }
  }, [effectiveAgencyId, filters])

  useEffect(() => {
    if (!effectiveAgencyId) return
    void fetchData()
  }, [fetchData, effectiveAgencyId])

  return { data, isLoading, error, mutate: fetchData }
}
