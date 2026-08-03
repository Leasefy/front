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
};
