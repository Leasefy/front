'use client'

/**
 * use-pii-reveal.ts — Phase 31 plan 31-09 (D-31-06/07/11).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/reveal-pii with
 * { field } and writes the resulting { token, expires_at, value } into the
 * PIIRevealContext. The server writes one audit_log row per reveal (D-31-07)
 * — by design, requesting a fresh token after expiry writes a second row.
 *
 * Does NOT touch localStorage/sessionStorage (D-31-06 enforcement; see also
 * the grep gate documented in 31-09-PLAN.md).
 */

import { useCallback, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import {
  usePIIRevealContext,
  type PIIFieldKey,
  type RevealEntry,
} from '@/lib/context/PIIRevealContext'

interface RevealApiResponse {
  token: string
  expires_at: string
  value: string
}

export interface UsePIIRevealResult {
  mint: () => Promise<boolean>
  isMinting: boolean
  error: string | null
  revealed: RevealEntry | undefined
}

export function usePIIReveal(args: { field: PIIFieldKey }): UsePIIRevealResult {
  const { field } = args
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const { debtorId, getRevealed, setRevealed } = usePIIRevealContext()
  const [isMinting, setIsMinting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const mint = useCallback(async (): Promise<boolean> => {
    setError(null)
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      return false
    }
    if (!agencyId) {
      setError('No active agency')
      return false
    }
    setIsMinting(true)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/reveal-pii`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ field }),
        },
      )
      if (!res.ok) {
        setError(`${res.status}`)
        return false
      }
      const json = (await res.json()) as RevealApiResponse
      const expiresAt = new Date(json.expires_at).getTime()
      setRevealed(field, {
        token: json.token,
        value: json.value,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 5 * 60_000,
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal PII')
      return false
    } finally {
      setIsMinting(false)
    }
  }, [agencyId, debtorId, field, setRevealed])

  return {
    mint,
    isMinting,
    error,
    revealed: getRevealed(field),
  }
}
