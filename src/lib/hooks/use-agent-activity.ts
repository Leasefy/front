'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function useAgentActivity(options: UseAgentActivityOptions = {}): UseAgentActivityReturn {
  const { refreshIntervalMs = 30_000, limit = 20 } = options

  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'db' | 'mock' | 'loading'>('loading')

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/activity?limit=${limit}`)

      if (!res.ok) {
        throw new Error(`Activity API responded with ${res.status}`)
      }

      const data = await res.json()

      if (data.source === 'db' && Array.isArray(data.activities) && data.activities.length > 0) {
        // Parse timestamp strings back to Date objects
        const parsed: AgentActivity[] = data.activities.map((a: AgentActivity & { timestamp: string }) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }))
        setActivities(parsed)
        setSource('db')
        setError(null)
      } else {
        // API returned empty or fallback — use mock data
        setActivities(getMockAgentActivity())
        setSource('mock')
        setError(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch activity'
      setError(msg)
      // Fall back to mock data on error
      if (activities.length === 0) {
        setActivities(getMockAgentActivity())
        setSource('mock')
      }
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
