'use client';

/**
 * useFederatedSearch — runs multiple SearchSources in parallel, debounced,
 * with per-keystroke AbortController cancellation.
 *
 * Adding a new source in pass 2:
 *   1. Define a SearchSource object.
 *   2. Push it into the sources array passed to useFederatedSearch.
 *
 * SearchResult.preview is intentionally loose (Record<string,unknown>) so
 * different sources can store domain-specific data for the preview panel.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ComponentType, FC } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  /** Unique across all sources — use `${sourceId}:${entityId}` */
  id: string;
  /** Source that produced this result */
  sourceId: string;
  type: string;
  title: string;
  subtitle?: string;
  /** Small status/label chips rendered in the result row */
  badges?: Array<{ label: string; color: 'green' | 'amber' | 'red' | 'violet' | 'neutral' }>;
  /** Route to navigate to on Enter / click */
  href: string;
  /** Arbitrary domain data for the right-hand preview panel */
  preview: Record<string, unknown>;
}

export interface SearchSourceContext {
  agencyId: string | null;
}

export interface SearchSource {
  id: string;
  /** i18n key — resolved by the consumer */
  labelKey: string;
  /** Phosphor icon component (accept any icon shape) */
  icon: FC<{ className?: string }>;
  /** If set, only included when canAccess(permission.module, permission.action) is true */
  permission?: { module: string; action: string };
  run: (query: string, ctx: SearchSourceContext, signal: AbortSignal) => Promise<SearchResult[]>;
}

export interface SourceState {
  isLoading: boolean;
  error: string | null;
  results: SearchResult[];
}

export interface FederatedSearchState {
  /** Results grouped by sourceId */
  bySource: Record<string, SourceState>;
  /** Flat list in source-order (for keyboard nav) */
  flat: SearchResult[];
  isAnyLoading: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 200;

export function useFederatedSearch(
  query: string,
  sources: SearchSource[],
  ctx: SearchSourceContext,
): FederatedSearchState {
  const [bySource, setBySource] = useState<Record<string, SourceState>>({});
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    (q: string) => {
      // Cancel previous in-flight request
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      if (!q.trim()) {
        setBySource({});
        return;
      }

      // Set all sources to loading
      const initial: Record<string, SourceState> = {};
      for (const src of sources) {
        initial[src.id] = { isLoading: true, error: null, results: [] };
      }
      setBySource(initial);

      // Fire all sources in parallel
      for (const src of sources) {
        src
          .run(q, ctx, ac.signal)
          .then((results) => {
            if (ac.signal.aborted) return;
            setBySource((prev) => ({
              ...prev,
              [src.id]: { isLoading: false, error: null, results },
            }));
          })
          .catch((err) => {
            if (ac.signal.aborted) return;
            const msg = err instanceof Error ? err.message : 'error';
            setBySource((prev) => ({
              ...prev,
              [src.id]: { isLoading: false, error: msg, results: [] },
            }));
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources, ctx.agencyId],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      abortRef.current?.abort();
      setBySource({});
      return;
    }

    timerRef.current = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flat: SearchResult[] = sources.flatMap(
    (src) => bySource[src.id]?.results ?? [],
  );

  const isAnyLoading = sources.some((src) => bySource[src.id]?.isLoading === true);

  return { bySource, flat, isAnyLoading };
}
