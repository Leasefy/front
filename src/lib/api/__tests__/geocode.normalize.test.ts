/**
 * geocode.normalize.test.ts — normalization of LocationIQ /autocomplete
 * responses into the shape consumed by the front (GeocodeSuggestion[]).
 *
 * Fail-closed contract: entries missing valid lat/lon, place_id, or a label
 * are dropped rather than surfaced with fabricated data.
 */

import { describe, it, expect } from 'vitest';
import { normalizeAutocompleteResults } from '../geocode.normalize';

const FULL_RESULT = {
  place_id: '134560401',
  lat: '4.6768169',
  lon: '-74.0482148',
  display_name: 'Calle 123 #45-67, Chapinero, Bogotá, Cundinamarca, Colombia',
  display_place: 'Calle 123',
  address: {
    road: 'Calle 123',
    neighbourhood: 'Chapinero',
    city: 'Bogotá',
    state: 'Cundinamarca',
    country: 'Colombia',
    country_code: 'co',
  },
};

describe('normalizeAutocompleteResults', () => {
  it('normalizes a full LocationIQ result into a GeocodeSuggestion', () => {
    const result = normalizeAutocompleteResults([FULL_RESULT]);

    expect(result).toEqual([
      {
        label: FULL_RESULT.display_name,
        lat: 4.6768169,
        lon: -74.0482148,
        placeId: '134560401',
        city: 'Bogotá',
        neighborhood: 'Chapinero',
        road: 'Calle 123',
      },
    ]);
  });

  it('falls back to town/village when address.city is missing', () => {
    const result = normalizeAutocompleteResults([
      {
        ...FULL_RESULT,
        address: { ...FULL_RESULT.address, city: undefined, town: 'Envigado' },
      },
    ]);

    expect(result[0].city).toBe('Envigado');
  });

  it('falls back to suburb/city_district when neighbourhood is missing', () => {
    const result = normalizeAutocompleteResults([
      {
        ...FULL_RESULT,
        address: { ...FULL_RESULT.address, neighbourhood: undefined, suburb: 'Poblado' },
      },
    ]);

    expect(result[0].neighborhood).toBe('Poblado');
  });

  it('drops entries with invalid (non-finite) lat/lon — fail-closed', () => {
    const result = normalizeAutocompleteResults([
      { ...FULL_RESULT, lat: 'not-a-number' },
      { ...FULL_RESULT, lon: undefined },
    ]);

    expect(result).toEqual([]);
  });

  it('drops entries without a place_id', () => {
    const result = normalizeAutocompleteResults([{ ...FULL_RESULT, place_id: undefined }]);
    expect(result).toEqual([]);
  });

  it('drops entries without a label (display_name/display_place)', () => {
    const result = normalizeAutocompleteResults([
      { ...FULL_RESULT, display_name: undefined, display_place: undefined },
    ]);
    expect(result).toEqual([]);
  });

  it('omits optional city/neighborhood/road keys when absent rather than setting empty strings', () => {
    const result = normalizeAutocompleteResults([
      {
        place_id: '1',
        lat: '1.0',
        lon: '2.0',
        display_name: 'Some place',
        address: {},
      },
    ]);

    expect(result).toEqual([{ label: 'Some place', lat: 1, lon: 2, placeId: '1' }]);
  });

  it('returns an empty array for non-array input', () => {
    expect(normalizeAutocompleteResults(null)).toEqual([]);
    expect(normalizeAutocompleteResults(undefined)).toEqual([]);
    expect(normalizeAutocompleteResults({ error: 'Unable to geocode' })).toEqual([]);
  });

  it('returns an empty array for an empty input array', () => {
    expect(normalizeAutocompleteResults([])).toEqual([]);
  });

  it('skips non-object entries inside the array', () => {
    expect(normalizeAutocompleteResults([null, 'string', 42, FULL_RESULT])).toEqual([
      {
        label: FULL_RESULT.display_name,
        lat: 4.6768169,
        lon: -74.0482148,
        placeId: '134560401',
        city: 'Bogotá',
        neighborhood: 'Chapinero',
        road: 'Calle 123',
      },
    ]);
  });
});
