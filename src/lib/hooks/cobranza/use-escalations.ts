'use client'

/**
 * use-escalations.ts — Phase 34 plan 34-06 (D-34-01, D-34-02, D-34-03).
 *
 * Polls GET /api/agency/:agencyId/cobranza/escalations every 60s (D-34-03).
 * Exposes mutation helpers (claim / assign / resolve) that hit the matching
 * Phase 34-03 endpoints and revalidate the cached list on success.
 *
 * Follows the credentials-include + NEXT_PUBLIC_AGENT_URL pattern used by
 * use-cartera-overview.ts (Phase 29) + use-pii-reveal.ts (Phase 31).
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import type {
  EscalationCategory,
  UrgencyLevel,
} from '@/lib/constants/cobranza/escalation-templates'
import { URGENCY_RANK } from '@/lib/constants/cobranza/escalation-templates'

export type EscalationStatus = 'open' | 'assigned' | 'resolved'

export interface Escalation {
  id: string
  debtor_id: string
  debtor_id_masked?: string
  call_id?: string | null
  reason: string
  urgency: UrgencyLevel
  status: EscalationStatus
  assignee_user_id: string | null
  assignee_email?: string | null
  created_at: string
  resolved_at: string | null
}

export interface EscalationsListResponse {
  open: Escalation[]
  assigned: Escalation[]
  resolved: Escalation[]
  resolvedNextCursor: string | null
  generatedAt: string
}

const POLL_INTERVAL_MS = 60_000

function defensiveSort(rows: Escalation[]): Escalation[] {
  return [...rows].sort((a, b) => {
    const rankDelta = URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
    if (rankDelta !== 0) return rankDelta
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export interface UseEscalationsResult {
  data: EscalationsListResponse | null
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
  claim: (id: string) => Promise<{ ok: boolean; status: number }>
  assign: (
    id: string,
    assigneeUserId: string,
  ) => Promise<{ ok: boolean; status: number }>
  resolve: (
    id: string,
    body: { category: EscalationCategory; resolution_text: string },
  ) => Promise<{ ok: boolean; status: number; cascaded_to_legal?: boolean }>
}

export function useEscalations(): UseEscalationsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<EscalationsListResponse | null>(null)
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
        `${agentUrl}/api/agency/${agencyId}/cobranza/escalations`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as EscalationsListResponse
      setData({
        open: defensiveSort(json.open ?? []),
        assigned: defensiveSort(json.assigned ?? []),
        resolved: defensiveSort(json.resolved ?? []),
        resolvedNextCursor: json.resolvedNextCursor ?? null,
        generatedAt: json.generatedAt,
      })
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

  const mutate = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  const mutateAction = useCallback(
    async (
      id: string,
      path: 'claim' | 'assign' | 'resolve',
      body: Record<string, unknown> | null,
    ): Promise<{ ok: boolean; status: number; payload: unknown }> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        return { ok: false, status: 0, payload: null }
      }
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/escalations/${id}/${path}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        },
      )
      const payload = await safeJson(res)
      if (res.ok) {
        await fetchOnce()
      }
      return { ok: res.ok, status: res.status, payload }
    },
    [agencyId, fetchOnce],
  )

  const claim = useCallback(
    async (id: string) => {
      const r = await mutateAction(id, 'claim', null)
      return { ok: r.ok, status: r.status }
    },
    [mutateAction],
  )

  const assign = useCallback(
    async (id: string, assigneeUserId: string) => {
      const r = await mutateAction(id, 'assign', {
        assignee_user_id: assigneeUserId,
      })
      return { ok: r.ok, status: r.status }
    },
    [mutateAction],
  )

  const resolve = useCallback(
    async (
      id: string,
      body: { category: EscalationCategory; resolution_text: string },
    ) => {
      const r = await mutateAction(id, 'resolve', body)
      const payload = r.payload as { cascaded_to_legal?: boolean } | null
      return {
        ok: r.ok,
        status: r.status,
        cascaded_to_legal: payload?.cascaded_to_legal ?? false,
      }
    },
    [mutateAction],
  )

  return { data, isLoading, error, mutate, claim, assign, resolve }
}
