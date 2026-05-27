'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

export type CallOutcome = 'completed' | 'no_answer' | 'voicemail' | 'failed' | 'busy' | string

export interface CallQAScores {
  overall: number | null
  tone: number | null
  compliance: number | null
  recovery: number | null
  clarity: number | null
}

export interface CallComplianceFlag {
  id: string
  code: string
  severity: 'info' | 'warning' | 'critical' | string
  atSec: number
  label: string
}

export interface CallStateTraceRow {
  id: string
  fromStage: string
  toStage: string
  actor: string
  at: string
}

export interface CallCostBreakdown {
  llmUsd: number
  voiceUsd: number
  whatsappUsd: number
  totalUsd: number
}

export interface CallDetailResponse {
  id: string
  debtorId: string
  debtorNameRedacted: string
  startedAt: string
  endedAt: string
  durationSec: number
  outcome: CallOutcome
  hasRecording: boolean
  qa: CallQAScores
  complianceFlags: CallComplianceFlag[]
  stateTrace: CallStateTraceRow[]
  cost: CallCostBreakdown
  generatedAt: string
}

export interface UseCallDetailArgs {
  callId: string
}

export interface UseCallDetailResult {
  data: CallDetailResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCallDetail({ callId }: UseCallDetailArgs): UseCallDetailResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CallDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCallDetail] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !callId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CallDetailResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch call detail')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId, callId])

  useEffect(() => {
    if (!agencyId || !callId) return
    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [fetchData, agencyId, callId])

  return { data, isLoading, error, refetch: fetchData }
}
