/**
 * toCreatePayload.test.ts — T-0038 §3.2/§3.8.
 *
 * `toCreatePayload` builds the `propertiesApi.create()` body for one
 * imported row. Before this task it unconditionally sent
 * `monthlyRent: p.monthlyRent ?? 0` — a live C6 violation once a SALE row
 * with no `monthlyRent` at all can reach this function (`faltantesParaElBack`
 * only requires `salePrice` for a SALE row, so `monthlyRent` is legitimately
 * absent, not just falsy).
 */

import { describe, it, expect } from 'vitest';
import { toCreatePayload } from './toCreatePayload';
import type { ImportProperty } from './importTypes';

function inmueble(parcial: Partial<ImportProperty> = {}): ImportProperty {
  return {
    _rowIndex: 0,
    propertyTitle: 'Depto Centro',
    propertyAddress: 'Calle 1',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero',
    propertyType: 'apartment',
    monthlyRent: 1_900_000,
    bathrooms: 1,
    bedrooms: 2,
    propertyArea: 40,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...parcial,
  };
}

describe('toCreatePayload — RENT row (regression)', () => {
  it('sends listingType rent and the canon, never salePrice', () => {
    const payload = toCreatePayload(inmueble());
    expect(payload.listingType).toBe('rent');
    expect(payload.monthlyRent).toBe(1_900_000);
    expect(payload.salePrice).toBeNull();
  });

  it('falls back to 0 only for a RENT row with a missing/blank canon (pre-existing behaviour, unchanged)', () => {
    const payload = toCreatePayload(inmueble({ monthlyRent: undefined }));
    expect(payload.monthlyRent).toBe(0);
  });
});

describe('toCreatePayload — SALE row (contract.md §3.2.2/§3.2.4)', () => {
  function ventaRow(parcial: Partial<ImportProperty> = {}): ImportProperty {
    return inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: 350_000_000, ...parcial });
  }

  it('sends listingType sale, salePrice, and monthlyRent: null — never 0 (C6)', () => {
    const payload = toCreatePayload(ventaRow());
    expect(payload.listingType).toBe('sale');
    expect(payload.salePrice).toBe(350_000_000);
    expect(payload.monthlyRent).toBeNull();
  });

  it('never coerces a missing salePrice to 0 (C6)', () => {
    const payload = toCreatePayload(ventaRow({ salePrice: undefined }));
    expect(payload.salePrice).toBeNull();
    expect(payload.monthlyRent).toBeNull();
  });
});

describe('toCreatePayload — department and consignedAt pass through', () => {
  it('sends department when mapped', () => {
    expect(toCreatePayload(inmueble({ propertyDepartment: 'Antioquia' })).department).toBe('Antioquia');
  });

  it('omits department when not mapped', () => {
    expect(toCreatePayload(inmueble({ propertyDepartment: undefined })).department).toBeUndefined();
  });

  it('sends consignedAt when mapped', () => {
    expect(toCreatePayload(inmueble({ consignedAt: '2026-08-29' })).consignedAt).toBe('2026-08-29');
  });
});
