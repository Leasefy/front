/**
 * geocode.normalize.ts — pure normalization of LocationIQ /autocomplete
 * responses into the shape the front consumes (GeocodeSuggestion[]).
 *
 * Kept separate from geocode.service.ts (client) and the route handler
 * (server proxy) so it can be unit-tested with example payloads without any
 * network mocking.
 *
 * Fail-closed: an entry missing a valid lat/lon, place_id, or label is
 * dropped rather than surfaced with fabricated/partial data.
 */

export interface GeocodeSuggestion {
  label: string;
  lat: number;
  lon: number;
  placeId: string;
  city?: string;
  neighborhood?: string;
  road?: string;
}

interface LocationIqAddress {
  road?: unknown;
  neighbourhood?: unknown;
  suburb?: unknown;
  city_district?: unknown;
  city?: unknown;
  town?: unknown;
  village?: unknown;
  [key: string]: unknown;
}

interface LocationIqResult {
  place_id?: unknown;
  lat?: unknown;
  lon?: unknown;
  display_name?: unknown;
  display_place?: unknown;
  address?: unknown;
  [key: string]: unknown;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** Normalizes the raw LocationIQ `/v1/autocomplete` payload (an array of
 * results) into GeocodeSuggestion[]. Never throws — malformed entries are
 * silently dropped so the UI can fall back to free-text address entry.
 */
export function normalizeAutocompleteResults(raw: unknown): GeocodeSuggestion[] {
  if (!Array.isArray(raw)) return [];

  const suggestions: GeocodeSuggestion[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const result = item as LocationIqResult;

    const lat = toFiniteNumber(result.lat);
    const lon = toFiniteNumber(result.lon);
    if (lat === null || lon === null) continue;

    const label = toNonEmptyString(result.display_name) ?? toNonEmptyString(result.display_place);
    if (!label) continue;

    const placeId = toNonEmptyString(
      typeof result.place_id === 'number' ? String(result.place_id) : result.place_id,
    );
    if (!placeId) continue;

    const address: LocationIqAddress =
      result.address && typeof result.address === 'object' ? (result.address as LocationIqAddress) : {};

    const city = toNonEmptyString(address.city) ?? toNonEmptyString(address.town) ?? toNonEmptyString(address.village);
    const neighborhood =
      toNonEmptyString(address.neighbourhood) ??
      toNonEmptyString(address.suburb) ??
      toNonEmptyString(address.city_district);
    const road = toNonEmptyString(address.road);

    suggestions.push({
      label,
      lat,
      lon,
      placeId,
      ...(city ? { city } : {}),
      ...(neighborhood ? { neighborhood } : {}),
      ...(road ? { road } : {}),
    });
  }

  return suggestions;
}

/**
 * Normalizes a single LocationIQ `/v1/reverse` result (an object, not an
 * array like `/v1/autocomplete`) into a GeocodeSuggestion. Fail-closed:
 * returns null on anything malformed/incomplete rather than surfacing
 * fabricated data — mirrors normalizeAutocompleteResults' per-entry rules.
 */
export function normalizeReverseResult(raw: unknown): GeocodeSuggestion | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result = raw as LocationIqResult;

  const lat = toFiniteNumber(result.lat);
  const lon = toFiniteNumber(result.lon);
  if (lat === null || lon === null) return null;

  const label = toNonEmptyString(result.display_name) ?? toNonEmptyString(result.display_place);
  if (!label) return null;

  const placeId = toNonEmptyString(
    typeof result.place_id === 'number' ? String(result.place_id) : result.place_id,
  );
  if (!placeId) return null;

  const address: LocationIqAddress =
    result.address && typeof result.address === 'object' ? (result.address as LocationIqAddress) : {};

  const city = toNonEmptyString(address.city) ?? toNonEmptyString(address.town) ?? toNonEmptyString(address.village);
  const neighborhood =
    toNonEmptyString(address.neighbourhood) ??
    toNonEmptyString(address.suburb) ??
    toNonEmptyString(address.city_district);
  const road = toNonEmptyString(address.road);

  return {
    label,
    lat,
    lon,
    placeId,
    ...(city ? { city } : {}),
    ...(neighborhood ? { neighborhood } : {}),
    ...(road ? { road } : {}),
  };
}
