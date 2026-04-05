'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import type { AgentActivity } from '@/lib/types/ai-agents'
import { getMockAgentActivity } from '@/lib/types/ai-agents'

interface UseAgentActivityOptions {
  /** Auto-refresh interval in ms. Default 30_000 (30s). Set 0 to disable. */
  refreshIntervalMs?: number
  /** Max items to fetch. Default 20. */
  limit?: number
}

interface UseAgentActivityReturn {
  activities: AgentActivity[]
  isLoading: boolean
  error: string | null
  /** 'db' if data came from the API, 'mock' if using fallback */
  source: 'db' | 'mock' | 'loading'
  refetch: () => Promise<void>
}

/**
 * Fetches agent activity from the backend.
 * Falls back to mock data when the endpoint is unavailable.
 */
export function useAgentActivity(options: UseAgentActivityOptions = {}): UseAgentActivityReturn {
  const { refreshIntervalMs = 30_000, limit = 20 } = options

  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'db' | 'mock' | 'loading'>('loading')

  const fetchActivities = useCallback(async () => {
    try {
      const res = await apiClient.get<{ activities: AgentActivity[]; source: string }>(
        `/inmobiliaria/ai/activity?limit=${limit}`,
      )

      if (res.source === 'db' && Array.isArray(res.activities) && res.activities.length > 0) {
        const parsed: AgentActivity[] = res.activities.map((a) => ({
          ...a,
          timestamp: new Date(a.timestamp as unknown as string),
        }))
        setActivities(parsed)
        setSource('db')
        setError(null)
      } else {
        setActivities(getMockAgentActivity())
        setSource('mock')
        setError(null)
      }
    } catch {
      // Endpoint not available yet — fall back to mock data silently
      if (activities.length === 0) {
        setActivities(getMockAgentActivity())
        setSource('mock')
      }
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [limit]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchActivities()

    if (refreshIntervalMs > 0) {
      const interval = setInterval(fetchActivities, refreshIntervalMs)
      return () => clearInterval(interval)
    }
  }, [fetchActivities, refreshIntervalMs])

  return {
    activities,
    isLoading,
    error,
    source,
    refetch: fetchActivities,
  }
}
