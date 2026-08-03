'use client'

/**
 * use-cadence.ts
 *
 * Wires the per-stage cadence editor to the REAL endpoint the cron/orchestrator
 * reads: `GET/PUT /api/agency/{agencyId}/cobranza/cadence`.
 *
 *   - GET: `{ cadenceConfig, source, effectiveConfig, generatedAt }`.
 *     `cadenceConfig` is the agency override (nullable). `effectiveConfig` is
 *     what the cron actually uses right now — ALWAYS render this one, never
 *     `cadenceConfig` directly (it may be null when `source === 'default'`).
 *   - PUT body: `{ cadenceConfig }` — send `null` to clear the override back
 *     to the system default. The PUT response does NOT include
 *     `effectiveConfig` (only `cadenceConfig` + `source` + `updatedAt`), so
 *     this hook refetches via GET right after a successful save to keep
 *     `effectiveConfig` in sync.
 *   - 404 on either verb means the agency has not completed onboarding —
 *     surfaced as `notProvisioned`, not a generic error.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useRefetchOnVisible } from '@/lib/hooks/useRefetchOnVisible'
import type { components } from '@/lib/api/generated/agent'

export type CadenceConfig = NonNullable<components['schemas']['CobranzaCadenceConfig']>
export type CadenceSource = components['schemas']['CobranzaCadenceGetResponse']['source']

export interface UseCadenceResult {
  /** Raw agency override — null when no override is set (source === 'default'). */
  cadenceConfig: CadenceConfig | null
  /** What the cron actually uses right now. Non-null once loaded successfully — render THIS. */
  effectiveConfig: CadenceConfig | null
  source: CadenceSource | null
  isLoading: boolean
  error: string | null
  /** true when GET/PUT returned 404 — agency onboarding incompleto, no row yet. */
  notProvisioned: boolean
  refetch: () => Promise<void>
  /** PUTs the override. Pass null to clear it back to the system default. Throws on non-2xx. */
  saveCadence: (cadenceConfig: CadenceConfig | null) => Promise<void>
}

export function useCadence(): UseCadenceResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [cadenceConfig, setCadenceConfig] = useState<CadenceConfig | null>(null)
  const [effectiveConfig, setEffectiveConfig] = useState<CadenceConfig | null>(null)
  const [source, setSource] = useState<CadenceSource | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [notProvisioned, setNotProvisioned] = useState<boolean>(false)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('NEXT_PUBLIC_AGENT_URL not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/cadence`,
        { headers: agentAuthHeaders() },
      )
      if (res.status === 404) {
        setNotProvisioned(true)
        setCadenceConfig(null)
        setEffectiveConfig(null)
        setSource(null)
        setError(null)
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as components['schemas']['CobranzaCadenceGetResponse']
      setNotProvisioned(false)
      setCadenceConfig(json.cadenceConfig)
      setEffectiveConfig(json.effectiveConfig)
      setSource(json.source)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  useRefetchOnVisible(() => void fetchOnce(), Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  const saveCadence = useCallback(
    async (nextCadenceConfig: CadenceConfig | null): Promise<void> => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl) throw new Error('NEXT_PUBLIC_AGENT_URL not configured')
      if (!agencyId) throw new Error('Agency not available')

      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/cadence`,
        {
          method: 'PUT',
          headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ cadenceConfig: nextCadenceConfig }),
        },
      )
      if (res.status === 404) {
        setNotProvisioned(true)
        throw new Error('404')
      }
      if (!res.ok) throw new Error(`${res.status}`)
      setNotProvisioned(false)
      // PUT response has no effectiveConfig — refetch to keep it in sync.
      await fetchOnce()
    },
    [agencyId, fetchOnce],
  )

  return {
    cadenceConfig,
    effectiveConfig,
    source,
    isLoading,
    error,
    notProvisioned,
    refetch,
    saveCadence,
  }
}
