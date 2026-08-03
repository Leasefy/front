'use client'

/**
 * useRefetchOnVisible — refetch when the screen becomes visible again.
 *
 * Unlike `useVisibilityPolling`, this runs NO interval. It fires the callback
 * only when the user returns to the screen (visibilitychange → 'visible'). Use
 * it for data that changes rarely and is edited solely by the current user —
 * e.g. the cobranza config screen — where interval polling is wasted network:
 * nobody else mutates those values in real time. The initial fetch stays with
 * the caller (mount effect), and user actions (save) update state directly, so
 * requests only ever happen on screen change or explicit action.
 */

import { useEffect, useRef } from 'react'

export function useRefetchOnVisible(callback: () => void, enabled: boolean): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled])
}
