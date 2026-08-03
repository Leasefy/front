'use client'

/**
 * usePagosHome — the Pagos IA home data hook for the cobro-inquilino / liquidación
 * domain. A DROP-IN replacement for `useAgentOverview('pagos')`: it returns the
 * SAME `{ data: AgentOverviewResponse, isLoading, error, notAvailable, refetch }`
 * shape, so the home swaps one hook call (and the KPI_SLOTS resolve unchanged)
 * to stop showing "—".
 *
 * WHY a separate hook: `useAgentOverview('pagos')` hits the generic agent-hub
 * overview, which is backed by the AP/proveedores resolver (wrong domain). This
 * one hits the bespoke `/pagos/home/*` cobro-inquilino routes via `fetchPagosHome`.
 *
 * Mirrors `useAgentOverview`'s lifecycle exactly: agency-scoped, abort-on-switch,
 * 12s timeout, and `notAvailable` for 404 (not deployed) / 503 (PAGOS_ENABLED off)
 * — graceful empty state, never an eternal skeleton or a hard error.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'
import { fetchPagosHome } from '@/lib/api/pagos-home'
import type { AgentOverviewResponse } from '@/lib/api/agent-workspace'
import type { UseAgentOverviewResult } from './use-agent-overview'

export function usePagosHome(): UseAgentOverviewResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [data, setData] = useState<AgentOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)

  /** Stale-response guard: each fetch aborts the previous one (agency switch race). */
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_AGENT_URL) {
      console.warn('[usePagosHome] NEXT_PUBLIC_AGENT_URL is not configured')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 12_000)
    try {
      setIsLoading(true)
      const res = await fetchPagosHome(agencyId, controller.signal)
      if (controller.signal.aborted && !timedOut) return
      setData(res.data)
      setNotAvailable(res.notAvailable)
      setError(null)
    } catch (err) {
      if (controller.signal.aborted && !timedOut) return
      setError(
        timedOut
          ? 'timeout'
          : err instanceof Error
            ? err.message
            : 'Failed to fetch pagos home',
      )
    } finally {
      clearTimeout(timeout)
      if (!controller.signal.aborted || timedOut) setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData, agencyId])

  return { data, isLoading, error, notAvailable, refetch: fetchData }
}
