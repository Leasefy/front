'use client'

import { useState, useEffect, useCallback } from 'react'

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
// Default/fallback metrics (shown while loading or on error)
// =============================================================================

const DEFAULT_METRICS: AgentMetrics = {
  scoring: {
    evaluationsThisMonth: 0,
    avgTimeMin: '< 3 min',
    escalationRate: '0%',
    accuracyRate: '0%',
  },
  matching: {
    suggestionsSent: 0,
    conversionRate: '0%',
    candidatesRedirected: 0,
    avgCompatibility: '0%',
  },
  summary: {
    actionsThisWeek: 0,
    hoursSavedThisMonth: '0h',
  },
}

// =============================================================================
// Hook: useAgentMetrics
// =============================================================================

export function useAgentMetrics(refreshIntervalMs: number = 60_000) {
  const [metrics, setMetrics] = useState<AgentMetrics>(DEFAULT_METRICS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/metrics')

      if (!res.ok) {
        throw new Error(`Metrics API responded with ${res.status}`)
      }

      const data: AgentMetrics = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch metrics'
      setError(msg)
      // Keep previous metrics on error, don't reset to defaults
    } finally {
      setIsLoading(false)
    }
  }, [])

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
