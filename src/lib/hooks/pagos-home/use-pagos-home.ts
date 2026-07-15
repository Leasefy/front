'use client'

/**
 * use-pagos-home.ts — Pagos IA Home data-layer hooks.
 *
 * One hook per agent endpoint, each thin over the matching service function:
 *   usePagosHomeMetrics(agencyId)
 *   usePagosHomeAttention(agencyId)
 *   usePaymentDetail(agencyId, invoiceId)
 *   useOwnerInbox(agencyId)
 *
 * Contract (all four):
 *   - returns { data, isLoading, error, refetch, disabled }
 *   - `agencyId` (and `invoiceId` for detail) come in as explicit args — these
 *     hooks do NOT read useAuth(); the page wires the id in. No id ⇒ idle
 *     (isLoading=false, no fetch, no infinite spinner — memory phase_36_patch_13).
 *   - `disabled` flips true when the agent answers 503 'pagos_disabled' (feature
 *     off). That is NOT surfaced as `error` — callers render a "feature off"
 *     state, not a failure.
 *   - 404 on payment detail ⇒ data=null, error=null (absence, not failure).
 */

import { useCallback, useEffect, useState } from 'react'

import {
  PagosHomeError,
  getOwnerInbox,
  getPagosHomeAttention,
  getPagosHomeMetrics,
  getPaymentDetail,
} from '@/lib/api/pagos-home.service'
import type {
  OwnerInbox,
  PagosHomeAttention,
  PagosHomeMetrics,
  PaymentDetail,
} from '@/lib/api/pagos-home.types'

export interface UsePagosHomeResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  /** true when the agent reports 503 'pagos_disabled' (feature off, not a failure). */
  disabled: boolean
  refetch: () => Promise<void>
}

/**
 * Shared fetch-state machine. `fetcher` returns `null` to mean "no id yet ⇒ idle"
 * — distinct from a resolved `null` payload (404). We disambiguate via `enabled`.
 */
function useAgentResource<T>(
  enabled: boolean,
  fetcher: () => Promise<T | null>,
  deps: readonly unknown[],
): UsePagosHomeResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<string | null>(null)
  const [disabled, setDisabled] = useState<boolean>(false)

  const load = useCallback(async (): Promise<void> => {
    if (!enabled) {
      // No agencyId / invoiceId yet — stay idle, never spin forever.
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
      setDisabled(false)
    } catch (err) {
      if (err instanceof PagosHomeError && err.code === 'pagos_disabled') {
        // Feature off — a normal state, not an error.
        setDisabled(true)
        setError(null)
        setData(null)
      } else {
        setDisabled(false)
        setError(err instanceof Error ? err.message : 'fetch_failed')
      }
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    void load()
  }, [enabled, load])

  return { data, isLoading, error, disabled, refetch: load }
}

// ── 1. metrics ───────────────────────────────────────────────────────────────

export function usePagosHomeMetrics(
  agencyId: string | null | undefined,
): UsePagosHomeResult<PagosHomeMetrics> {
  const enabled = Boolean(agencyId)
  return useAgentResource<PagosHomeMetrics>(
    enabled,
    () => getPagosHomeMetrics(agencyId as string),
    [agencyId],
  )
}

// ── 2. attention ─────────────────────────────────────────────────────────────

export function usePagosHomeAttention(
  agencyId: string | null | undefined,
): UsePagosHomeResult<PagosHomeAttention> {
  const enabled = Boolean(agencyId)
  return useAgentResource<PagosHomeAttention>(
    enabled,
    () => getPagosHomeAttention(agencyId as string),
    [agencyId],
  )
}

// ── 3. payment detail ────────────────────────────────────────────────────────

export function usePaymentDetail(
  agencyId: string | null | undefined,
  invoiceId: string | null | undefined,
): UsePagosHomeResult<PaymentDetail> {
  const enabled = Boolean(agencyId) && Boolean(invoiceId)
  return useAgentResource<PaymentDetail>(
    enabled,
    () => getPaymentDetail(agencyId as string, invoiceId as string),
    [agencyId, invoiceId],
  )
}

// ── 4. owner inbox ───────────────────────────────────────────────────────────

export function useOwnerInbox(
  agencyId: string | null | undefined,
): UsePagosHomeResult<OwnerInbox> {
  const enabled = Boolean(agencyId)
  return useAgentResource<OwnerInbox>(
    enabled,
    () => getOwnerInbox(agencyId as string),
    [agencyId],
  )
}
