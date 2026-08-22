/**
 * properties.mapper.test.ts — PropertyType boundary mapping (front lowercase
 * <-> backend UPPERCASE Prisma enum).
 *
 * T-0011: the backend enum grew from 4 to 7 values (APARTMENT, HOUSE, STUDIO,
 * ROOM, COMMERCIAL, OFFICE, WAREHOUSE — contract.md §3.2). Before this, the
 * commission consignment wizard offered commercial/office/warehouse in its UI
 * but TYPE_TO_BACKEND only covered 4 values, so those three were silently
 * coerced to 'apartment' by the wizard's own SUPPORTED_TYPES allow-list.
 */

import { describe, it, expect } from 'vitest';
import { TYPE_TO_BACKEND, mapBackendProperty } from '../properties.mapper';
import type { BackendProperty } from '../properties.types';
import type { PropertyType } from '@/lib/types/property';

const ALL_TYPES: PropertyType[] = [
  'apartment',
  'house',
  'studio',
  'room',
  'commercial',
  'office',
  'warehouse',
];

describe('TYPE_TO_BACKEND', () => {
  it('maps every front PropertyType to its UPPERCASE wire value (contract.md §3.2)', () => {
    expect(TYPE_TO_BACKEND).toEqual({
      apartment: 'APARTMENT',
      house: 'HOUSE',
      studio: 'STUDIO',
      room: 'ROOM',
      commercial: 'COMMERCIAL',
      office: 'OFFICE',
      warehouse: 'WAREHOUSE',
    });
  });

  it('has an entry for every PropertyType value — no silent gaps', () => {
    for (const type of ALL_TYPES) {
      expect(TYPE_TO_BACKEND[type]).toBeDefined();
    }
  });
});

function backendPropertyOfType(type: string): BackendProperty {
  return {
    id: 'p1',
    title: 'T',
    description: 'D',
    type,
    status: 'AVAILABLE',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    address: 'Calle 1',
    latitude: null,
    longitude: null,
    monthlyRent: 100,
    adminFee: 0,
    deposit: 0,
    bedrooms: 1,
    bathrooms: 1,
    area: 10,
    floor: null,
    parkingSpaces: null,
    stratum: null,
    yearBuilt: null,
    amenities: [],
    images: [],
    landlordId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as BackendProperty;
}

describe('mapBackendProperty — reverse type mapping', () => {
  it.each([
    ['APARTMENT', 'apartment'],
    ['HOUSE', 'house'],
    ['STUDIO', 'studio'],
    ['ROOM', 'room'],
    ['COMMERCIAL', 'commercial'],
    ['OFFICE', 'office'],
    ['WAREHOUSE', 'warehouse'],
  ])('maps backend %s to front %s', (backendType, frontType) => {
    const result = mapBackendProperty(backendPropertyOfType(backendType));
    expect(result.type).toBe(frontType);
  });
});
