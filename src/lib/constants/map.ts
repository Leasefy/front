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
};

/** Lookup city coordinates with accent-insensitive fallback */
export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
  // Fallback: strip accents and try case-insensitive match
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const key = Object.keys(CITY_COORDINATES).find(k => normalize(k) === normalize(city));
  return key ? CITY_COORDINATES[key] : null;
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
