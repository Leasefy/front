/**
 * inmuebleParaMandato.test.ts — T-0030 WU-3, Slice A (R1).
 *
 * Maps a just-created `Property` (the `propertiesApi.create` response) into
 * the `InmuebleSinConsignacion` shape `buildMandatoPayload` expects — the
 * same "no second round-trip" idea WU-2's contract §3.2 established for the
 * portfolio table's alert icon, applied here to the end-of-import modal.
 */

import { describe, it, expect } from 'vitest';
import type { Property } from '@/lib/types/property';
import { inmuebleParaMandato } from './inmuebleParaMandato';

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    title: 'Depto 1',
    description: 'desc',
    type: 'apartment',
    status: 'available',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    address: 'Calle 1',
    latitude: 4.6,
    longitude: -74.0,
    monthlyRent: 1_500_000,
    adminFee: 100_000,
    deposit: 0,
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    amenities: [],
    images: [],
    thumbnailUrl: '',
    landlordId: 'landlord-1',
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  } as Property;
}

describe('inmuebleParaMandato', () => {
  it('maps the fields buildMandatoPayload needs', () => {
    const r = inmuebleParaMandato(makeProperty());
    expect(r.propertyId).toBe('prop-1');
    expect(r.propertyTitle).toBe('Depto 1');
    expect(r.propertyAddress).toBe('Calle 1');
    expect(r.propertyCity).toBe('Bogotá');
    expect(r.propertyZone).toBe('Chapinero');
    expect(r.propertyType).toBe('apartment');
    expect(r.monthlyRent).toBe(1_500_000);
    expect(r.adminFee).toBe(100_000);
  });

  it('carries a ROOM type through untouched — buildMandatoPayload is the one that omits it', () => {
    const r = inmuebleParaMandato(makeProperty({ type: 'room' }));
    expect(r.propertyType).toBe('room');
  });

  it('never emits a thumbnail — the freshly-created property has none yet (photos upload after)', () => {
    const r = inmuebleParaMandato(makeProperty({ thumbnailUrl: 'https://cdn.test/x.jpg' }));
    expect(r.propertyThumbnail).toBeNull();
  });
});
