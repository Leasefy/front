/**
 * toImportarInmuebleDto.test.ts — T-0038, contract-addendum-3.md §3.1.1/§3.4.
 *
 * Every field is OMITTED when absent, never defaulted — the opposite
 * discipline from `toCreatePayload.ts`. A `?? 0` / `?? 'apartment'` here
 * would hide a real gap from the back's own faltantes detection instead of
 * surfacing it in the review step.
 *
 * ⚠ The wire names and casing asserted below are frozen. An earlier version
 * of this file asserted `propertyType: 'apartment'` — the wrong key with the
 * wrong casing — so it stayed green while every `preparar()` call returned
 * 400. It is not enough for these assertions to pass; they have to assert
 * what the back actually declares. The proof that they do is `back`'s
 * `importacion-contrato-wire.spec.ts`, which runs the real `ValidationPipe`
 * over this exact payload.
 */

import { describe, it, expect } from 'vitest';
import { toImportarInmuebleDto } from './toImportarInmuebleDto';
import type { ImportProperty } from './importTypes';

function inmueble(parcial: Partial<ImportProperty> = {}): ImportProperty {
  return {
    _rowIndex: 0,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...parcial,
  };
}

describe('toImportarInmuebleDto — omit-if-absent (C13), never a coerced default', () => {
  it('returns an empty object for a completely blank row — no field is fabricated', () => {
    expect(toImportarInmuebleDto(inmueble())).toEqual({});
  });

  it('carries every mapped field straight through', () => {
    const dto = toImportarInmuebleDto(
      inmueble({
        propertyTitle: 'Depto Centro',
        propertyAddress: 'Calle 1',
        propertyCity: 'Bogotá',
        propertyZone: 'Chapinero',
        propertyDepartment: 'Cundinamarca',
        propertyType: 'apartment',
        propertyArea: 45,
        bedrooms: 2,
        bathrooms: 1,
        adminFee: 150_000,
        consignedAt: '2026-08-29',
      }),
    );
    expect(dto).toMatchObject({
      title: 'Depto Centro',
      address: 'Calle 1',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      department: 'Cundinamarca',
      type: 'APARTMENT',
      area: 45,
      bedrooms: 2,
      bathrooms: 1,
      adminFee: 150_000,
      consignedAt: '2026-08-29',
    });
  });

  it('omits monthlyRent/salePrice/adminFee/consignedAt when absent — never 0/"" (C6)', () => {
    const dto = toImportarInmuebleDto(inmueble({ propertyTitle: 'X' }));
    expect('monthlyRent' in dto).toBe(false);
    expect('salePrice' in dto).toBe(false);
    expect('adminFee' in dto).toBe(false);
    expect('consignedAt' in dto).toBe(false);
  });
});

describe('toImportarInmuebleDto — wire names and casing (addendum-3 §3.4)', () => {
  it('translates the domain type to UPPER_SNAKE under the key `type`, never `propertyType`', () => {
    const dto = toImportarInmuebleDto(inmueble({ propertyType: 'warehouse' }));
    expect(dto.type).toBe('WAREHOUSE');
    expect('propertyType' in dto).toBe(false);
  });

  // `normalizePropertyType` returns the raw cell when nothing matches, and
  // that string must reach the back INTACT: `revisar()` reports `tipo` with
  // the original value visible next to the address, which is how the reviewer
  // knows what to fix. Upper-casing or defaulting it violates C13/C19.
  it('passes an unmappable type through RAW — never upper-cased, never defaulted', () => {
    const dto = toImportarInmuebleDto(inmueble({ propertyType: 'Apartaestudio' }));
    expect(dto.type).toBe('Apartaestudio');
  });

  it('omits `type` entirely when the row has none — never a fabricated APARTMENT (C19)', () => {
    expect('type' in toImportarInmuebleDto(inmueble())).toBe(false);
  });
});

describe('toImportarInmuebleDto — listingType branch (C13, no premature validation)', () => {
  it('a RENT row sends monthlyRent, never salePrice', () => {
    const dto = toImportarInmuebleDto(inmueble({ listingType: 'Arriendo', monthlyRent: 1_900_000 }));
    expect(dto.listingType).toBe('RENT');
    expect(dto.monthlyRent).toBe(1_900_000);
    expect('salePrice' in dto).toBe(false);
  });

  it('a SALE row sends salePrice, never monthlyRent', () => {
    const dto = toImportarInmuebleDto(inmueble({ listingType: 'Venta', salePrice: 350_000_000 }));
    expect(dto.listingType).toBe('SALE');
    expect(dto.salePrice).toBe(350_000_000);
    expect('monthlyRent' in dto).toBe(false);
  });

  it('a SALE row with no salePrice yet omits it entirely — the back reports precio_venta as faltante, not a fabricated 0', () => {
    const dto = toImportarInmuebleDto(inmueble({ listingType: 'Venta' }));
    expect(dto.listingType).toBe('SALE');
    expect('salePrice' in dto).toBe(false);
    expect('monthlyRent' in dto).toBe(false);
  });

  it('no listingType hint at all — omits listingType, forwards whichever price is present (lets the back decide)', () => {
    const dto = toImportarInmuebleDto(inmueble({ monthlyRent: 1_200_000 }));
    expect('listingType' in dto).toBe(false);
    expect(dto.monthlyRent).toBe(1_200_000);
  });
});
