/**
 * geocode.service.ts — client for the server-side geocoding proxy.
 *
 * IMPORTANT: this hits our own Next.js Route Handler
 * (`/api/geocode/autocomplete`), never LocationIQ directly — the API key is
 * server-only and must never reach the browser.
 */

import type { GeocodeSuggestion } from './geocode.normalize';

export type { GeocodeSuggestion };

export class GeocodeApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GeocodeApiError';
  }
}

interface AutocompleteResponseBody {
  results?: GeocodeSuggestion[];
  error?: string;
}

interface ReverseResponseBody {
  result?: GeocodeSuggestion | null;
  error?: string;
}

export const geocodeApi = {
  /** Autocomplete a partial Colombian address via the internal proxy. */
  async autocomplete(query: string, signal?: AbortSignal): Promise<GeocodeSuggestion[]> {
    const res = await fetch(`/api/geocode/autocomplete?q=${encodeURIComponent(query)}`, { signal });

    if (!res.ok) {
      const body: AutocompleteResponseBody = await res.json().catch(() => ({}));
      throw new GeocodeApiError(res.status, body.error || `Geocode request failed: ${res.status}`);
    }

    const body: AutocompleteResponseBody = await res.json();
    return body.results ?? [];
  },

  /**
   * Reverse-geocode a coordinate pair (map click/drag) via the internal
   * proxy. Returns null — not an error — when LocationIQ has no address for
   * those coordinates; the caller keeps whatever address it already has
   * (fail-closed, same contract as `autocomplete`).
   */
  async reverse(lat: number, lon: number, signal?: AbortSignal): Promise<GeocodeSuggestion | null> {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`, { signal });

    if (!res.ok) {
      const body: ReverseResponseBody = await res.json().catch(() => ({}));
      throw new GeocodeApiError(res.status, body.error || `Reverse geocode request failed: ${res.status}`);
    }

    const body: ReverseResponseBody = await res.json();
    return body.result ?? null;
  },
};
