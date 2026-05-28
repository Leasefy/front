'use client'

/**
 * use-subscription.ts — Phase 34 plan 34-08 (D-34-06 per-user opt-in).
 *
 * SWR-style hook for GET /daily-report/subscription with a debounced PATCH
 * mutation. Optimistic local-state update — reverted on PATCH failure with
 * an `error` flag the page surfaces as a toast.
 *
 * Backend hardcodes user_id from JWT (T-34-05-01) — the client never sends
 * a user_id field, only the two boolean toggles.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/lib/auth'

export interface SubscriptionRow {
  email_enabled: boolean
  whatsapp_enabled: boolean
  updated_at?: string
}

export interface SubscriptionPatch {
  email_enabled?: boolean
  whatsapp_enabled?: boolean
}

export interface UseSubscriptionResult {
  data: SubscriptionRow | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  /** Optimistic + debounced PATCH (300ms). Reverts on error. */
  setToggle: (patch: SubscriptionPatch) => void
  refetch: () => Promise<void>
}

const DEBOUNCE_MS = 300

export function useSubscription(): UseSubscriptionResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [data, setData] = useState<SubscriptionRow | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<SubscriptionPatch>({})
  const lastConfirmedRef = useRef<SubscriptionRow | null>(null)

  const baseUrl = useCallback((): string | null => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return null
    return `${agentUrl}/api/agency/${agencyId}/cobranza/daily-report/subscription`
  }, [agencyId])

  const fetchOnce = useCallback(async () => {
    const url = baseUrl()
    if (!url) {
      setIsLoading(false)
      if (!process.env.NEXT_PUBLIC_AGENT_URL) setError('NEXT_PUBLIC_AGENT_URL not configured')
      return
    }
    try {
      const res = await globalThis.fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as SubscriptionRow
      setData(json)
      lastConfirmedRef.current = json
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    if (!agencyId) return
    void fetchOnce()
  }, [agencyId, fetchOnce])

  // Debounced flush of the accumulated pending patch object
  const flush = useCallback(async () => {
    const url = baseUrl()
    if (!url) return
    const patch = pendingRef.current
    pendingRef.current = {}
    if (Object.keys(patch).length === 0) return
    setIsSaving(true)
    try {
      const res = await globalThis.fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as SubscriptionRow
      setData(json)
      lastConfirmedRef.current = json
      setError(null)
    } catch (err) {
      // Revert optimistic state
      if (lastConfirmedRef.current) setData(lastConfirmedRef.current)
      setError(err instanceof Error ? err.message : 'patch_failed')
    } finally {
      setIsSaving(false)
    }
  }, [baseUrl])

  const setToggle = useCallback(
    (patch: SubscriptionPatch) => {
      // Optimistic merge into local state
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, ...patch }
      })
      // Accumulate into pending
      pendingRef.current = { ...pendingRef.current, ...patch }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, DEBOUNCE_MS)
    },
    [flush],
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchOnce()
  }, [fetchOnce])

  return { data, isLoading, isSaving, error, setToggle, refetch }
}
