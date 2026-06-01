'use client'

import { useCallback, useEffect, useState } from 'react'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useAuth } from '@/lib/auth'

// ── Polling interval ────────────────────────────────────────────────────────
// D-37-07: AI hub landing KPIs are "current state" cadence — 30s (not 60s aggregate cadence)
const POLL_INTERVAL_MS = 30_000

// ── Response types (canonical shape from 37-SCHEMA-ALIGNMENT.md §6) ─────────

export interface AiHubAgentCard {
  permitted: boolean
  heroKpi: { label: string; value: string; populated: boolean } | null
  secondaryKpi: { label: string; value: string | number } | null
  lastActivityAt: string | null
}

export interface AiHubLandingResponse {
  cobranza: AiHubAgentCard
  cotizador: AiHubAgentCard
  generatedAt: string
}

export interface UseAiHubLandingResult {
  data: AiHubLandingResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAiHubLanding(): UseAiHubLandingResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<AiHubLandingResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = useCallback(async () => {
    // memory phase_36_patch_13 — REQUIRED: both early-return branches MUST setIsLoading(false)
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
        `${agentUrl}/api/agency/${agencyId}/ai-hub/landing`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as AiHubLandingResponse
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    // memory phase_36_patch_13 — REQUIRED: no-agencyId branch must setIsLoading(false)
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
