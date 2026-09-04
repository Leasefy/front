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

// ═══════════════════════════════════════════════════════════════════════════
// Batería adversarial de valores (auditoría 2026-09-01): plata, áreas y
// conteos como los escriben los sistemas colombianos de verdad. La regla es
// una sola: un valor se entiende ENTERO o no se entiende — jamás un número
// distinto al de la celda, jamás el prefijo que `parseFloat` alcanzó a leer.
// ═══════════════════════════════════════════════════════════════════════════

import { cleanNumericValue, mapRowsToProperties as mapear } from './gapFiller';

describe('cleanNumericValue — formatos de plata colombianos', () => {
  it.each([
    ['1.800.000', 1_800_000],
    ['500.000', 500_000], // 🔴 la clase de bug del repo: parseFloat("500.000") = 500
    ['$ 1.200.000', 1_200_000],
    ['$1.200.000', 1_200_000],
    ['1.200.000 COP', 1_200_000],
    ['1.234.567,89', 1_234_567.89],
    ['1,200,000', 1_200_000],
    ['1,200,000.50', 1_200_000.5],
    ['1200000', 1_200_000],
    ['2400000.75', 2_400_000.75],
    ['1.234', 1_234], // un punto con grupo de 3 en un archivo CO = miles
  ])('«%s» → %d', (crudo, esperado) => {
    expect(cleanNumericValue(crudo)).toBe(esperado);
  });

  it('siete cifras con un solo separador no se vuelven la milésima parte', () => {
    expect(cleanNumericValue('1.500.000')).toBe(1_500_000);
    expect(cleanNumericValue('12.500.000')).toBe(12_500_000);
  });

  it("apóstrofo de miles («1'200.000», común en Colombia) no se vuelve 1", () => {
    expect(cleanNumericValue("1'200.000")).toBe(1_200_000);
    expect(cleanNumericValue('1’200.000')).toBe(1_200_000); // apóstrofo tipográfico
    expect(cleanNumericValue("1'200,50")).toBe(1_200.5);
  });

  it('coma decimal sola («65,5» de un área) es 65,5 — no 655', () => {
    expect(cleanNumericValue('65,5')).toBe(65.5);
    expect(cleanNumericValue('65.5')).toBe(65.5);
  });

  it('sufijos de unidad se quitan; el número queda entero', () => {
    expect(cleanNumericValue('65 m2')).toBe(65);
    expect(cleanNumericValue('65m²')).toBe(65);
    expect(cleanNumericValue('10%')).toBe(10);
    expect(cleanNumericValue('10 %')).toBe(10);
  });

  it('🔴 lo que no es un número COMPLETO no produce número: nada de prefijos de parseFloat', () => {
    expect(cleanNumericValue('$1.2M')).toBeUndefined();
    expect(cleanNumericValue('1.2 millones')).toBeUndefined();
    expect(cleanNumericValue('120 millones')).toBeUndefined();
    expect(cleanNumericValue('tres')).toBeUndefined();
    expect(cleanNumericValue('1.200.000-1.500.000')).toBeUndefined(); // un rango no es un valor
    expect(cleanNumericValue('12.34.56')).toBeUndefined(); // separadores incoherentes
  });

  it('vacíos y marcadores de «sin dato» quedan undefined', () => {
    for (const v of ['', '   ', '-', 'N/A', 'n/a', 'NA', 'null', 'NULL', 's/d', '#N/A']) {
      expect(cleanNumericValue(v)).toBeUndefined();
    }
  });

  it('un número que ya viene como número pasa tal cual; NaN no', () => {
    expect(cleanNumericValue(2_400_000)).toBe(2_400_000);
    expect(cleanNumericValue(Number.NaN)).toBeUndefined();
  });
});

describe('mapRowsToProperties — celdas con marcadores de vacío', () => {
  const mapeo = [
    { sourceColumn: 'Dirección', targetField: 'propertyAddress', confidence: 0.92, isManual: false },
    { sourceColumn: 'Barrio', targetField: 'propertyZone', confidence: 0.92, isManual: false },
    { sourceColumn: 'Canon', targetField: 'monthlyRent', confidence: 0.92, isManual: false },
  ];

  it('«-», «N/A» y «null» en un campo de texto NO entran como texto real', () => {
    const [p] = mapear(
      [{ _rowIndex: 1, 'Dirección': 'N/A', Barrio: '-', Canon: '1.200.000' }],
      mapeo,
    );
    expect(p.propertyAddress).toBeUndefined();
    expect(p.propertyZone).toBeUndefined();
    expect(p.monthlyRent).toBe(1_200_000);
  });

  it('una dirección real con guiones adentro no se confunde con el marcador «-»', () => {
    const [p] = mapear(
      [{ _rowIndex: 1, 'Dirección': 'Calle 45 # 12-34', Barrio: 'Centro', Canon: '900.000' }],
      mapeo,
    );
    expect(p.propertyAddress).toBe('Calle 45 # 12-34');
  });

  it('un numérico ilegible queda vacío (visible en revisión), nunca un número inventado', () => {
    const [p] = mapear([{ _rowIndex: 1, 'Dirección': 'Cra 7 # 1-2', Barrio: 'X', Canon: 'tres millones' }], mapeo);
    expect(p.monthlyRent).toBeUndefined();
  });
});
