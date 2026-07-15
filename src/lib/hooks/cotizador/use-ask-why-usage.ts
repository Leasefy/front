'use client'

// Phase 33 plan 33-04 (COTI-UI-04, D-33-05, D-33-08)
// Fetches per-agency daily ask-why usage counter for the CounterfactualModal
// footer ("Te quedan N de M hoy") + cap-exhausted banner. SWR-style cache via
// manual useState/useEffect (no SWR library installed in mvp) — mirrors
// use-quote-metadata.ts pattern. 30-second auto refresh while modal is mounted.

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

export interface AskWhyUsage {
  used_today: number
  daily_cap: number
  resets_at: string // ISO-8601 UTC
}

const REFRESH_MS = 30_000

export function useAskWhyUsage(agencyId: string | null): {
  data: AskWhyUsage | null
  isLoading: boolean
  mutate: () => void
} {
  // useAuth() is intentionally called for consistency with other cotizador
  // hooks even when agencyId is passed explicitly (the modal already knows it).
  useAuth()
  const [data, setData] = useState<AskWhyUsage | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(agencyId !== null)
  const [refreshTick, setRefreshTick] = useState(0)

  const mutate = useCallback(() => {
    setRefreshTick(t => t + 1)
  }, [])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      setData(null)
      return
    }
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    void (async () => {
      try {
        const res = await globalThis.fetch(
          `${agentUrl}/api/agency/${agencyId}/cotizador/ask-why/usage`,
          { headers: agentAuthHeaders() },
        )
        if (cancelled) return
        if (!res.ok) {
          setIsLoading(false)
          return
        }
        const json: AskWhyUsage = await res.json()
        if (!cancelled) {
          setData(json)
          setIsLoading(false)
        }
      } catch {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [agencyId, refreshTick])

  // 30-second auto-refresh while the consumer is mounted.
  useEffect(() => {
    if (!agencyId) { setIsLoading(false); return }
    const id = setInterval(() => {
      setRefreshTick(t => t + 1)
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [agencyId])

  return { data, isLoading, mutate }
}
