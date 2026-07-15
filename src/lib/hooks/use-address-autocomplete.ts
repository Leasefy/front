'use client';

/**
 * useAddressAutocomplete — debounced (350ms) address suggestions for the
 * publish wizard's location step, gated to queries >= 3 chars.
 *
 * Same shape as useFederatedSearch / src/lib/hooks/ai/use-*: each new
 * request aborts the previous in-flight one so a stale slow response can
 * never overwrite a fresher result.
 */

import { useEffect, useRef, useState } from 'react';
import { geocodeApi, type GeocodeSuggestion } from '@/lib/api/geocode.service';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

export interface UseAddressAutocompleteResult {
  suggestions: GeocodeSuggestion[];
  isLoading: boolean;
  error: string | null;
}

export function useAddressAutocomplete(query: string): UseAddressAutocompleteResult {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setIsLoading(true);
      setError(null);

      geocodeApi
        .autocomplete(trimmed, ac.signal)
        .then((results) => {
          if (ac.signal.aborted) return;
          setSuggestions(results);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          const message = err instanceof Error ? err.message : 'No pudimos buscar la dirección';
          setError(message);
          setSuggestions([]);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { suggestions, isLoading, error };
}
