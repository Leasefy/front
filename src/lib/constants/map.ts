/**
 * Map constants for Colombian property map
 * City coordinates, bounds, and zoom levels
 */

// Colombia bounds for map constraints
export const COLOMBIA_BOUNDS = {
  north: 13.5,
  south: -4.5,
  east: -66.5,
  west: -82.0,
};

// City center coordinates (keys match CITIES constant — with accents)
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Bogotá': { lat: 4.711, lng: -74.0721 },
  'Medellín': { lat: 6.2442, lng: -75.5812 },
  'Cali': { lat: 3.4516, lng: -76.532 },
  'Barranquilla': { lat: 10.9639, lng: -74.7964 },
  'Cartagena': { lat: 10.391, lng: -75.4794 },
  'Bucaramanga': { lat: 7.1254, lng: -73.1198 },
  'Pereira': { lat: 4.8087, lng: -75.6906 },
  'Santa Marta': { lat: 11.2404, lng: -74.199 },
  'Manizales': { lat: 5.0689, lng: -75.5174 },
  'Cúcuta': { lat: 7.8939, lng: -72.5078 },
  /**
   * T-0030 WU-3 — this table used to stop at 10 cities while
   * `leer-enlace.ts`'s own `CIUDADES` set already recognizes 32 as valid
   * Colombian cities. A recognized-but-missing city (live case: Itagüí)
   * fell all the way through to `source: 'none'`, silently dropping both
   * coordinates on an already-successful (200, empty `results`) geocode
   * call. These 22 close the gap so every city the import pipeline accepts
   * also has a fallback centroid — sourced from each city's public Wikipedia
   * infobox coordinates, same precision level as the ten above. This is NOT
   * an invitation to guess a centroid for an unrecognized city; `source:
   * 'none'` stays correct for those (see `getCityCoordinates`/
   * `resolvePropertyCoordinates` below).
   */
  'Ibagué': { lat: 4.433, lng: -75.233 },
  'Villavicencio': { lat: 4.15, lng: -73.633 },
  'Armenia': { lat: 4.53, lng: -75.68 },
  'Neiva': { lat: 2.9345, lng: -75.2809 },
  'Popayán': { lat: 2.4542, lng: -76.6092 },
  'Montería': { lat: 8.75, lng: -75.883 },
  'Pasto': { lat: 1.2078, lng: -77.2772 },
  'Soacha': { lat: 4.5872, lng: -74.2214 },
  'Envigado': { lat: 6.1719, lng: -75.5803 },
  'Itagüí': { lat: 6.1667, lng: -75.6167 },
  'Bello': { lat: 6.3373, lng: -75.558 },
  'Sabaneta': { lat: 6.15, lng: -75.6 },
  'Chía': { lat: 4.85, lng: -74.05 },
  'Cajicá': { lat: 4.9167, lng: -74.0333 },
  'Zipaquirá': { lat: 5.0333, lng: -74.0 },
  'Rionegro': { lat: 6.155, lng: -75.3889 },
  'Floridablanca': { lat: 7.217, lng: -73.067 },
  'Palmira': { lat: 3.583, lng: -76.25 },
  'Tuluá': { lat: 4.083, lng: -76.2 },
  'Valledupar': { lat: 10.483, lng: -73.25 },
  'Sincelejo': { lat: 9.295, lng: -75.3961 },
  'Riohacha': { lat: 11.5442, lng: -72.9069 },
};

/** Lookup city coordinates with accent-insensitive fallback */
export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
  // Fallback: strip accents and try case-insensitive match
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const key = Object.keys(CITY_COORDINATES).find(k => normalize(k) === normalize(city));
  return key ? CITY_COORDINATES[key] : null;
}

export interface CoordinateResolution {
  lat: number | undefined;
  lng: number | undefined;
  source: 'geocoded' | 'city' | 'none';
}

/**
 * Resolves the coordinates a property should be published with.
 *
 * Priority: real geocoded coordinates (set by AddressAutocomplete on the
 * publish wizard) always win over the city-center fallback. The city-center
 * fallback (`getCityCoordinates`) is the safety net for properties published
 * before geocoding existed, or when the user typed a free-text address
 * without picking a suggestion \u2014 do NOT remove it when wiring geocoding in.
 */
export function resolvePropertyCoordinates(draft: {
  latitude?: number;
  longitude?: number;
  city: string;
}): CoordinateResolution {
  if (typeof draft.latitude === 'number' && typeof draft.longitude === 'number') {
    return { lat: draft.latitude, lng: draft.longitude, source: 'geocoded' };
  }

  const cityCoords = getCityCoordinates(draft.city);
  if (cityCoords) {
    return { lat: cityCoords.lat, lng: cityCoords.lng, source: 'city' };
  }

  return { lat: undefined, lng: undefined, source: 'none' };
}

// Default zoom levels
export const ZOOM_LEVELS = {
  country: 5,
  city: 12,
  neighborhood: 14,
  property: 16,
};

// Initial view state for Colombia
export const INITIAL_VIEW_STATE = {
  latitude: 4.5709,
  longitude: -74.2973,
  zoom: 5,
};

// Free MapLibre-compatible tile styles (OpenFreeMap — OSM data, no API key)
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/liberty',
  voyager: 'https://tiles.openfreemap.org/styles/bright',
};

// Default map style
export const MAP_STYLE = MAP_STYLES.light;

// Cluster configuration for property markers
export const CLUSTER_CONFIG = {
  // Zoom level at which clusters break into individual markers
  clusterMaxZoom: 14,
  // Radius of each cluster in pixels
  clusterRadius: 50,
  // Minimum points to form a cluster
  clusterMinPoints: 2,
};
