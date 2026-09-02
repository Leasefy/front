'use client';

/**
 * use-tenant-pqrs.ts — v7-06-02 (SOLI-03) tolerant PQRS list hook.
 *
 * Mirrors `useMyPaymentRequests` (`useLeases.ts`) EXACTLY: `useState` list +
 * `isLoading` (init true) + `error`, a `fetch` in a `useCallback`
 * (`setIsLoading(true)` → `pqrsApi.listMine()` → `setItems(result)`; `catch` →
 * `setError` + `setItems([])`; `finally setIsLoading(false)`), a
 * `useEffect(fetch)`, and returns `{ items, isLoading, error, refetch }`.
 *
 * The source `pqrsApi.listMine()` already degrades to `[]` on not-live (404/403/0),
 * so an unavailable backend yields an honest empty list — never a fabricated row.
 * This hook does NOT own a poller: the aggregator (`use-tenant-cases`) owns the
 * single tab-gated refresh (visibility-driven), so no internal refresh loop lives
 * here.
 */

import { useCallback, useEffect, useState } from 'react';
import { pqrsApi } from '@/lib/api/pqrs.service';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';

export interface UseTenantPqrsResult {
  items: SolicitudPqrs[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTenantPqrs(options?: { skip?: boolean }): UseTenantPqrsResult {
  const skip = options?.skip ?? false;
  const [items, setItems] = useState<SolicitudPqrs[]>([]);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);

  const fetchPqrs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await pqrsApi.listMine();
      setItems(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando solicitudes';
      setError(message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skip) {
      setIsLoading(false);
      return;
    }
    fetchPqrs();
  }, [fetchPqrs, skip]);

  return {
    items,
    isLoading,
    error,
    refetch: fetchPqrs,
  };
}
