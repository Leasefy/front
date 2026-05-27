'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

export type TranscriptSpeaker = 'operador' | 'deudor' | 'bot' | string

export interface TranscriptTurn {
  id: string
  speaker: TranscriptSpeaker
  startSec: number
  endSec: number
  /** Already PII-redacted by backend per T-31-PII. Do NOT log this anywhere. */
  text: string
  complianceFlagIds: string[]
}

export interface CallTranscriptResponse {
  turns: TranscriptTurn[]
  generatedAt: string
}

export interface UseCallTranscriptArgs {
  callId: string
}

export interface UseCallTranscriptResult {
  data: CallTranscriptResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCallTranscript({
  callId,
}: UseCallTranscriptArgs): UseCallTranscriptResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<CallTranscriptResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      console.warn('[useCallTranscript] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId || !callId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/calls/${callId}/transcript`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: CallTranscriptResponse = await res.json()
      // T-31-PII reminder: do NOT pass json.turns[*].text into analytics or
      // error reporters. Stays in React state only.
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transcript')
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
