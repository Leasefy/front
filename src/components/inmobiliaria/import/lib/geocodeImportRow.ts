/**
 * geocodeImportRow — resolves coordinates for one imported property row.
 *
 * Takes the FIRST LocationIQ autocomplete result for the row's address.
 * When the address is empty, the geocode call throws, or it returns no
 * results, falls back to the city center (resolvePropertyCoordinates) so a
 * single bad address never blocks the bulk import.
 */

import { geocodeApi } from '@/lib/api/geocode.service';
import { resolvePropertyCoordinates } from '@/lib/constants/map';
import type { ImportProperty } from './importTypes';

/** ~2 req/sec ceiling to stay within LocationIQ's rate limit during bulk import. */
export const GEOCODE_ROW_DELAY_MS = 550;

export interface GeocodeRowResult {
  lat?: number;
  lng?: number;
  source: 'geocoded' | 'city' | 'none';
}

export async function geocodeImportRow(
  p: Pick<ImportProperty, 'propertyAddress' | 'propertyCity'>,
): Promise<GeocodeRowResult> {
  const address = p.propertyAddress?.trim();

  if (address) {
    try {
      const results = await geocodeApi.autocomplete(address);
      const first = results[0];
      if (first) {
        return { lat: first.lat, lng: first.lon, source: 'geocoded' };
      }
    } catch {
      // Fall through to the city-center fallback — a geocoding failure must
      // never block the import.
    }
  }

  const fallback = resolvePropertyCoordinates({ city: p.propertyCity ?? '' });
  return { lat: fallback.lat, lng: fallback.lng, source: fallback.source };
}
