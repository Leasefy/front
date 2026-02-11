import { describe, it, expect } from 'vitest';

import {
  parseSearchQuery,
  generateFilterDescription,
} from '@/lib/search/parseSearchQuery';

// ---------------------------------------------------------------------------
// parseSearchQuery
// ---------------------------------------------------------------------------

describe('parseSearchQuery', () => {
  // 1. Empty / whitespace input ------------------------------------------------
  it('returns all-null defaults for an empty string', () => {
    const result = parseSearchQuery('');

    expect(result).toEqual({
      city: null,
      propertyType: null,
      bedrooms: null,
      minPrice: null,
      maxPrice: null,
      minArea: null,
      maxArea: null,
      amenities: [],
      rawQuery: '',
    });
  });

  it('returns all-null defaults for whitespace-only input', () => {
    const result = parseSearchQuery('   ');
    expect(result.city).toBeNull();
    expect(result.propertyType).toBeNull();
    expect(result.rawQuery).toBe('');
  });

  // 2. City detection ----------------------------------------------------------
  it('detects city by full name: "apartamento en bogota"', () => {
    const result = parseSearchQuery('apartamento en bogota');
    expect(result.city).toBe('Bogota');
  });

  it('detects city with accent: "apartamento en bogota"', () => {
    const result = parseSearchQuery('apartamento en bogota');
    expect(result.city).toBe('Bogota');
  });

  // 3. City abbreviation -------------------------------------------------------
  it('detects city abbreviation: "apto en med" -> Medellin', () => {
    const result = parseSearchQuery('apto en med');
    expect(result.city).toBe('Medellin');
  });

  it('detects city abbreviation: "apto en baq" -> Barranquilla', () => {
    const result = parseSearchQuery('apto en baq');
    expect(result.city).toBe('Barranquilla');
  });

  it('detects city abbreviation: "casa en ctg" -> Cartagena', () => {
    const result = parseSearchQuery('casa en ctg');
    expect(result.city).toBe('Cartagena');
  });

  it('detects city abbreviation: "apto en bog" -> Bogota', () => {
    const result = parseSearchQuery('apto en bog');
    expect(result.city).toBe('Bogota');
  });

  it('detects neighborhood that maps to city: "apto en poblado" -> Medellin', () => {
    const result = parseSearchQuery('apto en poblado');
    expect(result.city).toBe('Medellin');
  });

  // 4. Property type -----------------------------------------------------------
  it('detects property type: "casa en cali" -> house', () => {
    const result = parseSearchQuery('casa en cali');
    expect(result.propertyType).toBe('house');
  });

  it('detects property type: "apto" -> apartment', () => {
    const result = parseSearchQuery('apto en bogota');
    expect(result.propertyType).toBe('apartment');
  });

  it('detects property type: "apartamento" -> apartment', () => {
    const result = parseSearchQuery('apartamento grande');
    expect(result.propertyType).toBe('apartment');
  });

  it('detects property type: "estudio" -> studio', () => {
    const result = parseSearchQuery('estudio en medellin');
    expect(result.propertyType).toBe('studio');
  });

  it('detects property type: "loft" -> studio', () => {
    const result = parseSearchQuery('loft amoblado');
    expect(result.propertyType).toBe('studio');
  });

  it('detects property type: "habitacion" -> room', () => {
    const result = parseSearchQuery('habitacion en bogota');
    expect(result.propertyType).toBe('room');
  });

  // 5. Bedrooms ----------------------------------------------------------------
  it('detects bedrooms: "apto 3 habitaciones" -> 3', () => {
    const result = parseSearchQuery('apto 3 habitaciones');
    expect(result.bedrooms).toBe(3);
  });

  it('detects bedrooms abbreviated: "2 hab" -> 2', () => {
    const result = parseSearchQuery('apto 2 hab en bogota');
    expect(result.bedrooms).toBe(2);
  });

  it('detects bedrooms via "cuartos": "3 cuartos" -> 3', () => {
    const result = parseSearchQuery('casa 3 cuartos');
    expect(result.bedrooms).toBe(3);
  });

  it('detects bedrooms via "alcobas": "2 alcobas" -> 2', () => {
    const result = parseSearchQuery('apto 2 alcobas');
    expect(result.bedrooms).toBe(2);
  });

  it('returns null bedrooms when none specified', () => {
    const result = parseSearchQuery('apto en bogota');
    expect(result.bedrooms).toBeNull();
  });

  // 6. Price range -------------------------------------------------------------
  it('parses price range: "entre 1 y 2 millones"', () => {
    const result = parseSearchQuery('entre 1 y 2 millones');
    expect(result.minPrice).toBe(1_000_000);
    expect(result.maxPrice).toBe(2_000_000);
  });

  it('parses price range with dash: "1-2 millones"', () => {
    const result = parseSearchQuery('apto 1-2 millones');
    expect(result.minPrice).toBe(1_000_000);
    expect(result.maxPrice).toBe(2_000_000);
  });

  // 7. Price max ---------------------------------------------------------------
  it('parses max price: "hasta 2M"', () => {
    const result = parseSearchQuery('hasta 2M');
    expect(result.minPrice).toBeNull();
    expect(result.maxPrice).toBe(2_000_000);
  });

  it('parses max price: "menos de 3 millones"', () => {
    const result = parseSearchQuery('menos de 3 millones');
    expect(result.maxPrice).toBe(3_000_000);
  });

  // 8. Price min ---------------------------------------------------------------
  it('parses min price: "desde 1M"', () => {
    const result = parseSearchQuery('desde 1M');
    expect(result.minPrice).toBe(1_000_000);
    expect(result.maxPrice).toBeNull();
  });

  it('parses min price: "mas de 1 millon"', () => {
    const result = parseSearchQuery('mas de 1 millon');
    expect(result.minPrice).toBe(1_000_000);
    expect(result.maxPrice).toBeNull();
  });

  // 9. Single price (+-20% range) ----------------------------------------------
  it('parses single price: "2 millones" -> 1.6M-2.4M', () => {
    const result = parseSearchQuery('2 millones');
    expect(result.minPrice).toBe(Math.floor(2_000_000 * 0.8)); // 1_600_000
    expect(result.maxPrice).toBe(Math.ceil(2_000_000 * 1.2)); // 2_400_000
  });

  // 10. "economico" keyword ----------------------------------------------------
  it('parses "economico" -> maxPrice 1.5M', () => {
    const result = parseSearchQuery('apto economico');
    expect(result.minPrice).toBeNull();
    expect(result.maxPrice).toBe(1_500_000);
  });

  it('parses "barato" -> maxPrice 1.5M', () => {
    const result = parseSearchQuery('casa barato');
    expect(result.maxPrice).toBe(1_500_000);
  });

  // 11. Area exact -------------------------------------------------------------
  it('parses area: "80m2" -> minArea=64, maxArea=96', () => {
    const result = parseSearchQuery('apto 80m2');
    expect(result.minArea).toBe(Math.floor(80 * 0.8)); // 64
    expect(result.maxArea).toBe(Math.ceil(80 * 1.2)); // 96
  });

  it('parses area with unicode: "80m\u00B2" -> minArea=64, maxArea=96', () => {
    const result = parseSearchQuery('apto 80m\u00B2');
    expect(result.minArea).toBe(64);
    expect(result.maxArea).toBe(96);
  });

  it('parses area: "100 metros cuadrados"', () => {
    const result = parseSearchQuery('casa de 100 metros cuadrados');
    expect(result.minArea).toBe(Math.floor(100 * 0.8)); // 80
    expect(result.maxArea).toBe(Math.ceil(100 * 1.2)); // 120
  });

  // 12. Area descriptor --------------------------------------------------------
  it('parses area descriptor: "grande" -> minArea=100', () => {
    const result = parseSearchQuery('apto grande');
    expect(result.minArea).toBe(100);
    expect(result.maxArea).toBeNull();
  });

  it('parses area descriptor: "pequeno" -> maxArea=60', () => {
    const result = parseSearchQuery('apto pequeno');
    expect(result.minArea).toBeNull();
    expect(result.maxArea).toBe(60);
  });

  // 13. Amenities --------------------------------------------------------------
  it('detects multiple amenities: "con piscina y gimnasio"', () => {
    const result = parseSearchQuery('apto con piscina y gimnasio');
    expect(result.amenities).toContain('pool');
    expect(result.amenities).toContain('gym');
    expect(result.amenities).toHaveLength(2);
  });

  it('detects single amenity: "parqueadero"', () => {
    const result = parseSearchQuery('casa con parqueadero');
    expect(result.amenities).toContain('parking');
  });

  it('detects amenity: "amoblado" -> furnished', () => {
    const result = parseSearchQuery('apto amoblado');
    expect(result.amenities).toContain('furnished');
  });

  it('detects amenity: "mascota" -> pets', () => {
    const result = parseSearchQuery('apto acepta mascota');
    expect(result.amenities).toContain('pets');
  });

  it('detects amenity: "seguridad" -> security', () => {
    const result = parseSearchQuery('apto con seguridad');
    expect(result.amenities).toContain('security');
  });

  it('detects amenity: "ascensor" -> elevator', () => {
    const result = parseSearchQuery('apto con ascensor');
    expect(result.amenities).toContain('elevator');
  });

  it('detects amenity: "terraza" -> terrace', () => {
    const result = parseSearchQuery('apto con terraza');
    expect(result.amenities).toContain('terrace');
  });

  it('detects amenity: "bbq" -> bbq', () => {
    const result = parseSearchQuery('casa con bbq');
    expect(result.amenities).toContain('bbq');
  });

  it('returns empty amenities when none mentioned', () => {
    const result = parseSearchQuery('apto en bogota');
    expect(result.amenities).toEqual([]);
  });

  // 14. Complex query ----------------------------------------------------------
  it('parses complex query with multiple facets', () => {
    const query = 'apartamento 3 hab en medellin entre 1 y 2 millones con piscina';
    const result = parseSearchQuery(query);

    expect(result.propertyType).toBe('apartment');
    expect(result.bedrooms).toBe(3);
    expect(result.city).toBe('Medellin');
    expect(result.minPrice).toBe(1_000_000);
    expect(result.maxPrice).toBe(2_000_000);
    expect(result.amenities).toContain('pool');
    expect(result.rawQuery).toBe(query);
  });

  // 15. rawQuery preservation --------------------------------------------------
  it('preserves rawQuery as trimmed input', () => {
    const result = parseSearchQuery('  apto en bogota  ');
    expect(result.rawQuery).toBe('apto en bogota');
  });

  it('preserves rawQuery for non-empty input', () => {
    const query = 'casa grande en cali';
    const result = parseSearchQuery(query);
    expect(result.rawQuery).toBe(query);
  });
});

// ---------------------------------------------------------------------------
// generateFilterDescription
// ---------------------------------------------------------------------------

describe('generateFilterDescription', () => {
  const emptyFilters = {
    city: null,
    propertyType: null,
    bedrooms: null,
    minPrice: null,
    maxPrice: null,
  } as const;

  // 1. Empty filters -----------------------------------------------------------
  it('returns empty string for empty filters', () => {
    expect(generateFilterDescription({ ...emptyFilters })).toBe('');
  });

  // 2. Type only ---------------------------------------------------------------
  it('returns type name: apartment -> "Apartamento"', () => {
    expect(
      generateFilterDescription({ ...emptyFilters, propertyType: 'apartment' })
    ).toBe('Apartamento');
  });

  it('returns type name: house -> "Casa"', () => {
    expect(
      generateFilterDescription({ ...emptyFilters, propertyType: 'house' })
    ).toBe('Casa');
  });

  it('returns type name: studio -> "Estudio"', () => {
    expect(
      generateFilterDescription({ ...emptyFilters, propertyType: 'studio' })
    ).toBe('Estudio');
  });

  it('returns type name: room -> "Habitacion"', () => {
    expect(
      generateFilterDescription({ ...emptyFilters, propertyType: 'room' })
    ).toBe('Habitacion');
  });

  // 3. Full filter combination -------------------------------------------------
  it('generates full description with all filter parts', () => {
    const description = generateFilterDescription({
      propertyType: 'house',
      bedrooms: 2,
      city: 'Bogota',
      minPrice: 1_000_000,
      maxPrice: 2_000_000,
    });
    expect(description).toBe('Casa, 2 habitaciones, en Bogota, 1-2M COP');
  });

  // 4. Max price only ----------------------------------------------------------
  it('generates "hasta" for max price only', () => {
    const description = generateFilterDescription({
      ...emptyFilters,
      maxPrice: 2_000_000,
    });
    expect(description).toBe('hasta 2M COP');
  });

  // 5. Min price only ----------------------------------------------------------
  it('generates "desde" for min price only', () => {
    const description = generateFilterDescription({
      ...emptyFilters,
      minPrice: 1_000_000,
    });
    expect(description).toBe('desde 1M COP');
  });

  // 6. Singular bedroom --------------------------------------------------------
  it('uses singular "habitacion" for 1 bedroom', () => {
    const description = generateFilterDescription({
      ...emptyFilters,
      bedrooms: 1,
    });
    expect(description).toBe('1 habitacion');
  });

  // 7. 4 bedrooms -> "4+" -----------------------------------------------------
  it('uses "4+ habitaciones" for 4 bedrooms', () => {
    const description = generateFilterDescription({
      ...emptyFilters,
      bedrooms: 4,
    });
    expect(description).toBe('4+ habitaciones');
  });

  // Extra: plural bedrooms (not 1, not 4) --------------------------------------
  it('uses plural "habitaciones" for 3 bedrooms', () => {
    const description = generateFilterDescription({
      ...emptyFilters,
      bedrooms: 3,
    });
    expect(description).toBe('3 habitaciones');
  });

  // Extra: city only -----------------------------------------------------------
  it('generates city-only description', () => {
    const description = generateFilterDescription({
      ...emptyFilters,
      city: 'Medellin',
    });
    expect(description).toBe('en Medellin');
  });
});
