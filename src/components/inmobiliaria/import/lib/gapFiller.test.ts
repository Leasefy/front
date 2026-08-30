/**
 * gapFiller.test.ts — T-0038 §3.2/§3.8: analyzeProperties must not suggest a
 * fabricated rental estimate for a SALE row's missing price.
 *
 * `RENT_ESTIMATES` is Colombian rent-market data only — there is no
 * comparable sale-price table. Suggesting a rent estimate for a sale
 * listing's price field would be a wrong-field number, not a real gap fill.
 */

import { describe, it, expect } from 'vitest';
import { analyzeProperties, mapRowsToProperties } from './gapFiller';
import type { ImportProperty, ColumnMapping } from './importTypes';

function inmueble(parcial: Partial<ImportProperty> = {}): ImportProperty {
  return {
    _rowIndex: 0,
    propertyTitle: 'Depto Centro',
    propertyAddress: 'Calle 1',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero',
    propertyType: 'apartment',
    bathrooms: 1,
    propertyArea: 40,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    ...parcial,
  };
}

describe('mapRowsToProperties — T-0038 new mapped fields', () => {
  function mapping(sourceColumn: string, targetField: string): ColumnMapping {
    return { sourceColumn, targetField, confidence: 1, isManual: false };
  }

  it('parses a mapped salePrice column as a number, stripping symbols', () => {
    const [result] = mapRowsToProperties(
      [{ _rowIndex: 0, 'Precio de venta': '$ 350.000.000' }],
      [mapping('Precio de venta', 'salePrice')],
    );
    expect(result.salePrice).toBe(350_000_000);
  });

  it('keeps a mapped listingType column as raw text (resolved later, not here)', () => {
    const [result] = mapRowsToProperties(
      [{ _rowIndex: 0, 'Tipo de negocio': 'Venta' }],
      [mapping('Tipo de negocio', 'listingType')],
    );
    expect(result.listingType).toBe('Venta');
  });

  it('keeps a mapped propertyDepartment column as text', () => {
    const [result] = mapRowsToProperties(
      [{ _rowIndex: 0, Departamento: 'Antioquia' }],
      [mapping('Departamento', 'propertyDepartment')],
    );
    expect(result.propertyDepartment).toBe('Antioquia');
  });

  it('keeps a mapped consignedAt column as a plain date string', () => {
    const [result] = mapRowsToProperties(
      [{ _rowIndex: 0, 'Fecha de consignación': '2026-08-29' }],
      [mapping('Fecha de consignación', 'consignedAt')],
    );
    expect(result.consignedAt).toBe('2026-08-29');
  });
});

describe('analyzeProperties — Rule 1 (missing price) is listingType-aware', () => {
  it('suggests a rent estimate for a RENT row missing monthlyRent (regression)', () => {
    const [result] = analyzeProperties([inmueble({ monthlyRent: undefined })]);
    const suggestion = result.suggestions.find((s) => s.field === 'monthlyRent');
    expect(suggestion).toBeTruthy();
  });

  it('does NOT suggest a monthlyRent estimate for a SALE row missing salePrice', () => {
    const [result] = analyzeProperties([
      inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: undefined }),
    ]);
    const suggestion = result.suggestions.find((s) => s.field === 'monthlyRent');
    expect(suggestion).toBeUndefined();
  });

  it('does not touch a SALE row that already has a salePrice', () => {
    const [result] = analyzeProperties([
      inmueble({ listingType: 'Venta', monthlyRent: undefined, salePrice: 350_000_000 }),
    ]);
    expect(result.suggestions.find((s) => s.field === 'monthlyRent')).toBeUndefined();
    expect(result.salePrice).toBe(350_000_000);
  });
});
