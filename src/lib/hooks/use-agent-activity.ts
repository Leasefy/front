'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
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
  refetch: () => Promise<void>
}

/**
 * Fetches agent activity from the backend (`GET /inmobiliaria/ai/activity`).
 *
 * When the endpoint returns an empty list or fails, the hook returns an empty
 * array — the UI should render its own empty state. We intentionally do NOT
 * fall back to mock data anymore because realistic-looking mocks made it
 * impossible to distinguish "no real activity yet" from "mock placeholder".
 */
export function useAgentActivity(options: UseAgentActivityOptions = {}): UseAgentActivityReturn {
  const { refreshIntervalMs = 30_000, limit = 20 } = options

  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    try {
      const res = await apiClient.get<{ activities: AgentActivity[]; source?: string }>(
        `/inmobiliaria/ai/activity?limit=${limit}`,
      )

      if (Array.isArray(res.activities)) {
        const parsed: AgentActivity[] = res.activities.map((a) => ({
          ...a,
          timestamp: new Date(a.timestamp as unknown as string),
        }))
        setActivities(parsed)
        setError(null)
      } else {
        setActivities([])
        setError(null)
      }
    } catch (err) {
      // Empty activities so the UI shows its empty state, but surface the
      // error for observability (component may show a retry CTA in the future)
      setActivities([])
      setError(err instanceof Error ? err.message : 'Error cargando actividad')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

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
    refetch: fetchActivities,
  }
}
