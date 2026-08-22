'use client';

/**
 * useReverseGeocode — debounced (350ms) reverse geocoding for map
 * interactions (click / drag). Same debounce+abort shape as
 * useAddressAutocomplete, but imperative: the caller triggers it with
 * coordinates instead of it reacting to a query string.
 *
 * Fail-closed: `onResult` is called with `null` when LocationIQ has no
 * address for the given coordinates, and is NOT called at all on a
 * network/upstream failure — the caller keeps whatever address/coords it
 * already has rather than surfacing a broken UI state (mirrors
 * AddressAutocomplete's degrade-to-free-text contract).
 */

import { useCallback, useEffect, useRef } from 'react';
import { geocodeApi, type GeocodeSuggestion } from '@/lib/api/geocode.service';

const DEBOUNCE_MS = 350;

export interface UseReverseGeocodeResult {
  /** Debounced trigger — call on every map click/drag; aborts any in-flight call. */
  reverseGeocode: (lat: number, lng: number) => void;
}

export function useReverseGeocode(
  /** Called with the resolved suggestion (or null) AND the coords that were
   * looked up, so the caller can echo them back without risking overwriting
   * a newer pin position with a stale one. */
  onResult: (result: GeocodeSuggestion | null, coords: { lat: number; lng: number }) => void,
): UseReverseGeocodeResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Keep the latest callback without re-creating `reverseGeocode` on every
  // render (the caller typically passes an inline function).
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      geocodeApi
        .reverse(lat, lng, ac.signal)
        .then((result) => {
          if (ac.signal.aborted) return;
          onResultRef.current(result, { lat, lng });
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          // Fail-closed: swallow the error. The caller already applied the
          // immediate lat/lng update on click/drag; there's nothing to roll
          // back and no fabricated address to show.
        });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { reverseGeocode };
}
