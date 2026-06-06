'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

// =============================================================================
// Types
// =============================================================================

export interface ScoringMetrics {
  evaluationsThisMonth: number
  avgTimeMin: string
  escalationRate: string
  accuracyRate: string
}

export interface MatchingMetrics {
  suggestionsSent: number
  conversionRate: string
  candidatesRedirected: number
  avgCompatibility: string
}

export interface SummaryMetrics {
  actionsThisWeek: number
  hoursSavedThisMonth: string
}

export interface AgentMetrics {
  scoring: ScoringMetrics
  matching: MatchingMetrics
  summary: SummaryMetrics
}

// =============================================================================
// Hook: useAgentMetrics
// =============================================================================
//
// Returns `metrics: AgentMetrics | null`. It is null until real data loads and
// stays null on auth/fetch failure — we deliberately do NOT seed fabricated
// zeros, which previously rendered as if they were real telemetry. Consumers
// must guard reads (`metrics?.scoring.x ?? '—'`).
//
// NOTE: the request is authenticated with the user's Supabase JWT
// (agentAuthHeaders) — never the server-only AGENT_API_KEY, which must not ship
// to the browser. Until the agent exposes a per-agency scoring/matching metrics
// endpoint, this honestly surfaces an empty/error state instead of zeros.

export function useAgentMetrics(refreshIntervalMs: number = 60_000) {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch(`${agentUrl}/metrics`, { headers: agentAuthHeaders() })
      if (!res.ok) throw new Error(`Metrics API responded with ${res.status}`)
      const data: AgentMetrics = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch metrics'
      setError(msg)
      setMetrics(null)
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    fetchMetrics()

    // Auto-refresh at the specified interval
    const interval = setInterval(fetchMetrics, refreshIntervalMs)
    return () => clearInterval(interval)
  }, [fetchMetrics, refreshIntervalMs])

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics,
  }
}
