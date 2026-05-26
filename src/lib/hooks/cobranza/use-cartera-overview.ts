'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface CarteraOverviewResponse {
  kpis: {
    deudoresActivos: number
    pagadoHoyCOP: number
    llamadasHoy: number
    escalacionesPendientes: number
  }
  stages: Array<{
    stage: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'SX'
    count: number
    avgDaysInStage: number
    weeklyDelta: number
  }>
  lastTransitions: Array<{
    id: string
    debtorNameRedacted: string
    fromStage: string
    toStage: string
    reason: string
    transitionedAt: string
    actor: 'agent' | 'human'
  }>
  nextActions: Array<{
    id: string
    debtorNameRedacted: string
    plannedFor: string
    channel: 'voice' | 'whatsapp' | 'email'
    stage: string
  }>
  generatedAt: string
}

// =============================================================================
// Hook: useCarteraOverview
// =============================================================================

export function useCarteraOverview() {
  const [data, setData] = useState<CarteraOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCarteraOverview] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(`${agentUrl}/cartera/overview`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CarteraOverviewResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cartera overview')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
