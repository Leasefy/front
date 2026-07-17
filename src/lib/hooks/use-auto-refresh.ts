'use client';

import { useEffect, useRef } from 'react';

/**
 * Auto-refresh for data pages: re-runs `refetch` on a fixed interval while the
 * tab is visible, and immediately when the user returns to the tab (focus /
 * visibilitychange). Replaces manual "Actualizar" buttons.
 *
 * The interval pauses while the tab is hidden — no background traffic.
 */
export function useAutoRefresh(refetch: () => void | Promise<unknown>, intervalMs = 30_000) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        void refetchRef.current();
      }, intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetchRef.current();
        start();
      } else {
        stop();
      }
    };

    const onFocus = () => {
      void refetchRef.current();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [intervalMs]);
}
