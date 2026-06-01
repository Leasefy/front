'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'

export interface CarteraOverviewResponse {
  kpis: {
    deudoresActivos: number
    pagadoHoyCop: number
    llamadasHoy: number
    escalacionesPendientes: number
  }
  stages: Array<{
    stage: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'SX'
    stageDisplayName: string
    ordinal: number
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

export function useCarteraOverview() {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
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
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cartera/overview`,
        { headers: agentAuthHeaders() },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CarteraOverviewResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cartera overview')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) return
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData, agencyId])

  return { data, isLoading, error, refetch: fetchData }
}
