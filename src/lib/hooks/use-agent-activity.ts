'use client'

/**
 * use-agent-activity — el feed global de actividad de agentes, ya SIN stub.
 *
 * Conectado a GET /api/agency/{agencyId}/ai-hub/activity?limit=N (contrato
 * Piloto §4). La firma pública se conserva EXACTA — los consumidores
 * (`ai/page.tsx`) siguen recibiendo `AgentActivity[]` con `timestamp: Date` —
 * así que acá se mapea el `ActivityItem` del contrato al tipo histórico.
 *
 * `source`: 'db' cuando el API contestó; 'empty' cuando no hay backend aún
 * (URL sin configurar, sin agencia, o 404 del endpoint).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AgentActivity } from '@/lib/types/ai-agents'
import { getAgentById } from '@/lib/types/ai-agents'
import { fetchPilotoActivity, type ActivityItem } from '@/lib/api/piloto'
import { useAuth } from '@/lib/auth'

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

/** tipo del contrato → el union histórico de AgentActivity. */
function mapTipo(tipo: string): AgentActivity['type'] {
  const t = tipo.toLowerCase()
  if (t.includes('escala')) return 'escalation'
  if (t.includes('error') || t.includes('fallo')) return 'error'
  if (t.includes('notific')) return 'notification'
  return 'execution'
}

function mapItem(item: ActivityItem): AgentActivity {
  const type = mapTipo(item.tipo)
  return {
    id: item.id,
    agentId: item.agente,
    // El registro conoce algunos agentes por id; para el resto, el slug tal
    // cual — nunca un nombre inventado.
    agentName: getAgentById(item.agente)?.nameEs ?? item.agente,
    type,
    title: item.titulo,
    description: item.detalle,
    status: type === 'error' ? 'failed' : type === 'escalation' ? 'pending' : 'success',
    timestamp: new Date(item.at),
  }
}

export function useAgentActivity(options: UseAgentActivityOptions = {}): UseAgentActivityReturn {
  const { refreshIntervalMs = 30_000, limit = 20 } = options
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'db' | 'empty' | 'loading'>('loading')

  /** Guard de respuestas viejas: cada fetch aborta el anterior. */
  const abortRef = useRef<AbortController | null>(null)

  const fetchActivities = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL || !agencyId) {
      setActivities([])
      setSource('empty')
      setError(null)
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetchPilotoActivity(agencyId, limit, controller.signal)
      if (controller.signal.aborted) return
      if (res.notAvailable) {
        // 404: el endpoint aún no está publicado — mismo estado que "sin backend".
        setActivities([])
        setSource('empty')
      } else {
        setActivities((res.data?.items ?? []).map(mapItem))
        setSource('db')
      }
      setError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch activity')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [agencyId, limit])

  useEffect(() => {
    void fetchActivities()

    if (refreshIntervalMs > 0) {
      const interval = setInterval(() => void fetchActivities(), refreshIntervalMs)
      return () => {
        clearInterval(interval)
        abortRef.current?.abort()
      }
    }
    return () => {
      abortRef.current?.abort()
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
