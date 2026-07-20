'use client';

/**
 * use-tenant-acuerdos.ts — v7-07-03 (ACUE-01) tolerant acuerdos list hook.
 *
 * Mirrors `useTenantPqrs` EXACTLY: `useState` list + `isLoading` (init true) +
 * `error`, a `fetch` in a `useCallback` (`setIsLoading(true)` →
 * `acuerdosApi.listMine()` → `setItems(result)`; `catch` → `setError` +
 * `setItems([])`; `finally setIsLoading(false)`), a `useEffect(fetch)`, and returns
 * `{ items, isLoading, error, refetch }`.
 *
 * The source `acuerdosApi.listMine()` already degrades to `[]` on not-live
 * (404/403/0), so an unavailable backend yields an honest empty list — never a
 * fabricated acuerdo. This hook does NOT own a poller: the aggregator
 * (`use-tenant-cases`) owns the single tab-gated refresh (visibility-driven), so no
 * internal refresh loop lives here.
 */

import { useCallback, useEffect, useState } from 'react';
import { acuerdosApi } from '@/lib/api/tenant-acuerdos.service';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';

export interface UseTenantAcuerdosResult {
  items: AcuerdoDetail[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTenantAcuerdos(): UseTenantAcuerdosResult {
  const [items, setItems] = useState<AcuerdoDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcuerdos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await acuerdosApi.listMine();
      setItems(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando acuerdos';
      setError(message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcuerdos();
  }, [fetchAcuerdos]);

  return {
    items,
    isLoading,
    error,
    refetch: fetchAcuerdos,
  };
}
