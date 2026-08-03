/**
 * geocodeImportRow.test.ts — coordinate resolution for one imported row.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const autocompleteMock = vi.fn();

vi.mock('@/lib/api/geocode.service', () => ({
  geocodeApi: {
    autocomplete: (...args: unknown[]) => autocompleteMock(...args),
  },
}));

import { geocodeImportRow } from './geocodeImportRow';

beforeEach(() => {
  autocompleteMock.mockReset();
});

describe('geocodeImportRow', () => {
  it('returns the first autocomplete result as geocoded coordinates', async () => {
    autocompleteMock.mockResolvedValue([
      { lat: 4.6, lon: -74.0, label: 'Calle 123, Bogotá', placeId: '1' },
      { lat: 4.7, lon: -74.1, label: 'Calle 124, Bogotá', placeId: '2' },
    ]);

    const result = await geocodeImportRow({ propertyAddress: 'Calle 123', propertyCity: 'Bogotá' });

    expect(result).toEqual({ lat: 4.6, lng: -74.0, source: 'geocoded' });
    expect(autocompleteMock).toHaveBeenCalledWith('Calle 123');
  });

  it('falls back to the city center when there are no autocomplete results', async () => {
    autocompleteMock.mockResolvedValue([]);

    const result = await geocodeImportRow({ propertyAddress: 'Dirección rara', propertyCity: 'Medellín' });

    expect(result).toEqual({ lat: 6.2442, lng: -75.5812, source: 'city' });
  });

  it('falls back to the city center when the geocode call throws', async () => {
    autocompleteMock.mockRejectedValue(new Error('geocoding_upstream_error'));

    const result = await geocodeImportRow({ propertyAddress: 'Calle 1', propertyCity: 'Cali' });

    expect(result).toEqual({ lat: 3.4516, lng: -76.532, source: 'city' });
  });

  it('falls back to the city center without calling geocode when the address is empty', async () => {
    const result = await geocodeImportRow({ propertyAddress: '', propertyCity: 'Cartagena' });

    expect(autocompleteMock).not.toHaveBeenCalled();
    expect(result).toEqual({ lat: 10.391, lng: -75.4794, source: 'city' });
  });

  it('returns source "none" when neither the address nor the city resolve', async () => {
    autocompleteMock.mockResolvedValue([]);

    const result = await geocodeImportRow({ propertyAddress: 'Sin resultados', propertyCity: 'Ciudad Inexistente' });

    expect(result).toEqual({ lat: undefined, lng: undefined, source: 'none' });
  });
});
