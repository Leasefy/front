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
import { TYPE_TO_BACKEND, mapBackendProperty, resolveListingType } from '../properties.mapper';
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
    department: null,
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

// ============================================================================
// T-0038 §3.2 — listingType / salePrice / monthlyRent nullable / department /
// code / consignedAt
// ============================================================================

describe('resolveListingType — contract.md T-0038 §3.2.2, C19 no silent coercion', () => {
  it('defaults absent (older producer) to "rent"', () => {
    expect(resolveListingType(undefined)).toBe('rent');
  });

  it('maps the wire RENT/SALE to lowercase front values', () => {
    expect(resolveListingType('RENT')).toBe('rent');
    expect(resolveListingType('SALE')).toBe('sale');
  });

  it('throws on an unknown value instead of defaulting (C19)', () => {
    expect(() => resolveListingType('LEASE')).toThrow();
    expect(() => resolveListingType('')).toThrow();
  });
});

describe('mapBackendProperty — T-0038 field mapping', () => {
  it('passes through department as-is (string or null)', () => {
    expect(mapBackendProperty({ ...backendPropertyOfType('APARTMENT'), department: 'Antioquia' }).department).toBe('Antioquia');
    expect(mapBackendProperty({ ...backendPropertyOfType('APARTMENT'), department: null }).department).toBeNull();
  });

  it('defaults listingType to "rent" when the key is absent', () => {
    const bp = backendPropertyOfType('APARTMENT');
    expect('listingType' in bp).toBe(false);
    expect(mapBackendProperty(bp).listingType).toBe('rent');
  });

  it('maps a SALE listing: listingType, salePrice, and null monthlyRent', () => {
    const bp = {
      ...backendPropertyOfType('APARTMENT'),
      listingType: 'SALE',
      salePrice: 500_000_000,
      monthlyRent: null,
    };
    const result = mapBackendProperty(bp);
    expect(result.listingType).toBe('sale');
    expect(result.salePrice).toBe(500_000_000);
    expect(result.monthlyRent).toBeNull();
  });

  it('never coerces a null salePrice/monthlyRent to 0 (C6)', () => {
    const bp = { ...backendPropertyOfType('APARTMENT'), listingType: 'SALE', salePrice: null, monthlyRent: null };
    const result = mapBackendProperty(bp);
    expect(result.salePrice).toBeNull();
    expect(result.monthlyRent).toBeNull();
  });

  it('throws when listingType is present but not a recognised member (C19)', () => {
    const bp = { ...backendPropertyOfType('APARTMENT'), listingType: 'LEASE' };
    expect(() => mapBackendProperty(bp)).toThrow();
  });

  it('code stays undefined when the key is absent — never fabricated (PUBLIC route)', () => {
    const bp = backendPropertyOfType('APARTMENT');
    expect('code' in bp).toBe(false);
    expect(mapBackendProperty(bp).code).toBeUndefined();
  });

  it('code passes through when present (PORTFOLIO route)', () => {
    expect(mapBackendProperty({ ...backendPropertyOfType('APARTMENT'), code: 7 }).code).toBe(7);
  });

  it('consignedAt: absent key stays absent — "not entitled", distinct from null', () => {
    const bp = backendPropertyOfType('APARTMENT');
    expect('consignedAt' in bp).toBe(false);
    const result = mapBackendProperty(bp);
    expect('consignedAt' in result).toBe(false);
    expect(result.consignedAt).toBeUndefined();
  });

  it('consignedAt: explicit null means "entitled, unrecorded" — distinct from absent', () => {
    const result = mapBackendProperty({ ...backendPropertyOfType('APARTMENT'), consignedAt: null });
    expect('consignedAt' in result).toBe(true);
    expect(result.consignedAt).toBeNull();
  });

  it('consignedAt: passes through the date-only string verbatim (no Date parsing)', () => {
    const result = mapBackendProperty({ ...backendPropertyOfType('APARTMENT'), consignedAt: '2026-08-29' });
    expect(result.consignedAt).toBe('2026-08-29');
  });
});

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
