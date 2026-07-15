'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface QueryState<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Minimal data-fetching hook for admin screens — "load on mount, render table"
 * (FRONT.md §2 needs no state library beyond this). Aborts in-flight requests
 * on unmount / dependency change so switching screens never races.
 *
 * @param fetcher receives an AbortSignal; usually wraps adminApi(...).
 * @param deps    re-runs the fetch when any dependency changes (filters, page).
 * @param enabled skip the fetch while false (e.g. waiting on auth).
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const [tick, setTick] = useState(0)
  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetcherRef.current(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        setData(result)
        setIsLoading(false)
      },
      (err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error('Error de red'))
        setIsLoading(false)
      },
    )

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps])

  return { data, isLoading, error, refetch }
}
