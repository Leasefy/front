'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AgentActivity } from '@/lib/types/ai-agents'

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
  /** 'db' if data came from the API, 'empty' if no backend connected yet */
  source: 'db' | 'empty' | 'loading'
  refetch: () => Promise<void>
}

export function useAgentActivity(options: UseAgentActivityOptions = {}): UseAgentActivityReturn {
  const { refreshIntervalMs = 30_000, limit = 20 } = options

  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'db' | 'empty' | 'loading'>('loading')

  const fetchActivities = useCallback(async () => {
    // TODO: call agent microservice once it exposes GET /activity
    // const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    // const res = await fetch(`${agentUrl}/activity?limit=${limit}`)
    setActivities([])
    setSource('empty')
    setError(null)
    setIsLoading(false)
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
