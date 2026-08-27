/**
 * map.test.ts — resolvePropertyCoordinates: decides which lat/lng a property
 * gets published with.
 *
 * Priority: real geocoded coordinates (from AddressAutocomplete) always win;
 * falling back to the city-center table only when geocoding never happened.
 * This is the safety net that must never be removed — see PublishContext.
 */

import { describe, it, expect } from 'vitest';
import { resolvePropertyCoordinates } from '../map';

describe('resolvePropertyCoordinates', () => {
  it('uses geocoded coordinates when both latitude and longitude are present', () => {
    const result = resolvePropertyCoordinates({ latitude: 4.6768, longitude: -74.0482, city: 'Bogotá' });
    expect(result).toEqual({ lat: 4.6768, lng: -74.0482, source: 'geocoded' });
  });

  it('falls back to the city center when geocoded coordinates are absent', () => {
    const result = resolvePropertyCoordinates({ city: 'Bogotá' });
    expect(result).toEqual({ lat: 4.711, lng: -74.0721, source: 'city' });
  });

  it('falls back to the city center when only one of lat/lng is present (partial geocode)', () => {
    const result = resolvePropertyCoordinates({ latitude: 4.6768, city: 'Medellín' });
    expect(result).toEqual({ lat: 6.2442, lng: -75.5812, source: 'city' });
  });

  it('returns undefined coordinates with source "none" when there is no geocode and no known city', () => {
    const result = resolvePropertyCoordinates({ city: 'Ciudad Inexistente' });
    expect(result).toEqual({ lat: undefined, lng: undefined, source: 'none' });
  });

  it('is accent/case-insensitive for the city fallback, matching getCityCoordinates', () => {
    const result = resolvePropertyCoordinates({ city: 'medellin' });
    expect(result).toEqual({ lat: 6.2442, lng: -75.5812, source: 'city' });
  });

  it('resolves Itagüí instead of silently dropping the coordinates (T-0030 WU-3, real defect)', () => {
    // A live import produced `latitude: null, longitude: null` for an
    // Itagüí property immediately after a 200 from the geocoder (empty
    // `results`) because Itagüí — a real, common Aburrá Valley city, already
    // recognized as valid by leer-enlace.ts's own CIUDADES set — had no
    // entry in CITY_COORDINATES. Omitting coordinates for a real city is a
    // regression, not honesty; honesty is only owed to a city we don't know.
    const result = resolvePropertyCoordinates({ city: 'Itagüí' });
    expect(result.source).toBe('city');
    expect(result.lat).not.toBeUndefined();
    expect(result.lng).not.toBeUndefined();
  });

  it('still returns "none" for a city genuinely absent from the table', () => {
    // The fix must not turn every unresolved city into a fabricated
    // centroid — only real, recognized Colombian cities get one.
    const result = resolvePropertyCoordinates({ city: 'Ciudad Inexistente' });
    expect(result).toEqual({ lat: undefined, lng: undefined, source: 'none' });
  });
});
