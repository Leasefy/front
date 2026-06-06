'use client'

/**
 * useVisibilityPolling — shared tab-visibility-gated polling primitive.
 *
 * Cobranza dashboards/lists poll their agent endpoints every 30s (some 60s).
 * Firing those intervals while the tab is hidden wastes the agent service's
 * budget and the browser's network for data nobody is looking at. This hook
 * wraps the raw `setInterval` pattern with two guarantees:
 *
 *   1. The interval callback only runs while `document.visibilityState` is
 *      'visible' — hidden tabs pause polling (no behavior change for the
 *      visible tab; the cadence is identical).
 *   2. On tab re-focus (visibilitychange → visible) it triggers an immediate
 *      refetch so the user sees fresh data the moment they return, instead of
 *      waiting up to one full interval.
 *
 * Initial fetch is intentionally NOT performed here: callers already run their
 * own first fetch (either just before calling this hook or in a sibling
 * effect), so this hook only owns the recurring poll + re-focus refresh.
 *
 * Precedent: src/lib/hooks/cotizador/use-quote-stream.ts (visibilitychange).
 */

import { useEffect, useRef } from 'react'

export function useVisibilityPolling(
  callback: () => void,
  intervalMs: number,
  enabled: boolean,
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        callbackRef.current()
      }
    }, intervalMs)

    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        callbackRef.current()
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      clearInterval(id)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [intervalMs, enabled])
}
