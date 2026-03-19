/**
 * Natural language search query parser
 * Parses Spanish natural language queries into structured filter criteria
 */

import type { PropertyType } from '@/lib/types/property';

/**
 * Structured result from parsing a natural language query
 */
export interface ParsedQuery {
  city: string | null;
  propertyType: PropertyType | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  amenities: string[];
  rawQuery: string;
}

// City patterns mapping to standardized city names
const cityPatterns: Record<string, RegExp> = {
  Bogota: /\b(bogot[aá]|bog)\b/i,
  Medellin: /\b(medell[ií]n|med|poblado|laureles|envigado)\b/i,
  Cali: /\bcali\b/i,
  Barranquilla: /\b(barranquilla|baq)\b/i,
  Cartagena: /\b(cartagena|ctg)\b/i,
  Bucaramanga: /\b(bucaramanga|buca)\b/i,
  Pereira: /\bpereira\b/i,
  'Santa Marta': /\b(santa\s*marta)\b/i,
  Manizales: /\bmanizales\b/i,
  Cucuta: /\bc[uú]cuta\b/i,
};

// Property type patterns
const typePatterns: Record<PropertyType, RegExp> = {
  apartment: /\b(apto|apartamento|depto|departamento)\b/i,
  house: /\b(casa)\b/i,
  studio: /\b(estudio|loft)\b/i,
  room: /\b(habitaci[oó]n|cuarto|pieza)\b/i,
};

// Amenity patterns mapping to amenity IDs
const amenityPatterns: Record<string, RegExp> = {
  pool: /\b(piscina)\b/i,
  gym: /\b(gimn|gym|gimnasio)\b/i,
  parking: /\b(parqueadero|parking|garaje)\b/i,
  pets: /\b(mascota|perro|gato)\b/i,
  furnished: /\b(amoblado|amueblado)\b/i,
  security: /\b(seguridad|vigilancia|porteria)\b/i,
  balcony: /\b(balc[oó]n)\b/i,
  elevator: /\b(ascensor|elevador)\b/i,
  terrace: /\b(terraza)\b/i,
  bbq: /\b(bbq|asador|parrilla)\b/i,
};

/**
 * Parse bedroom count from query
 * Handles: "2 habitaciones", "3 hab", "2 cuartos", "2 alcobas"
 */
function parseBedrooms(query: string): number | null {
  const bedroomMatch = query.match(
    /(\d+)\s*(habitacion|hab|cuarto|alcoba|dormitorio)/i
  );
  if (bedroomMatch) {
    return parseInt(bedroomMatch[1], 10);
  }
  return null;
}

/**
 * Parse price range from query (Colombian pesos)
 * Handles various formats:
 * - "1-2 millones", "entre 1 y 2 millones"
 * - "menos de 2 millones", "hasta 2M"
 * - "más de 1 millón", "desde 1M"
 * - "1.5 millones", "2M"
 */
function parsePriceRange(query: string): { min: number | null; max: number | null } {
  const result = { min: null as number | null, max: null as number | null };

  // Normalize query - replace dots with nothing for number parsing
  const normalizedQuery = query.replace(/(\d)\.(\d)/g, '$1$2');

  // Range pattern: "entre 1 y 2 millones", "1-2 millones", "de 1 a 2M"
  const rangeMatch = normalizedQuery.match(
    /(?:entre\s*)?(\d+(?:,\d+)?)\s*(?:y|a|-)\s*(\d+(?:,\d+)?)\s*(?:millones?|M|mill)/i
  );
  if (rangeMatch) {
    result.min = parseFloat(rangeMatch[1].replace(',', '.')) * 1_000_000;
    result.max = parseFloat(rangeMatch[2].replace(',', '.')) * 1_000_000;
    return result;
  }

  // Max pattern: "menos de 2 millones", "hasta 2M", "máximo 3M"
  const maxMatch = normalizedQuery.match(
    /(?:menos\s*de|max|m[aá]ximo|hasta)\s*(\d+(?:,\d+)?)\s*(?:millones?|M|mill)/i
  );
  if (maxMatch) {
    result.max = parseFloat(maxMatch[1].replace(',', '.')) * 1_000_000;
    return result;
  }

  // Min pattern: "más de 1 millón", "desde 1M", "mínimo 1.5M"
  const minMatch = normalizedQuery.match(
    /(?:m[aá]s\s*de|min|m[ií]nimo|desde)\s*(\d+(?:,\d+)?)\s*(?:millones?|M|mill)/i
  );
  if (minMatch) {
    result.min = parseFloat(minMatch[1].replace(',', '.')) * 1_000_000;
    return result;
  }

  // Single price (use as approximate max): "2 millones", "1.5M"
  const singleMatch = normalizedQuery.match(
    /(\d+(?:,\d+)?)\s*(?:millones?|M|mill)\b/i
  );
  if (singleMatch) {
    const price = parseFloat(singleMatch[1].replace(',', '.')) * 1_000_000;
    // Set a range around the mentioned price (±20%)
    result.min = Math.floor(price * 0.8);
    result.max = Math.ceil(price * 1.2);
    return result;
  }

  // "Económico" pattern - low price
  if (/\b(econ[oó]mico|barato|bajo\s*precio)\b/i.test(query)) {
    result.max = 1_500_000; // Max 1.5M for "economico"
    return result;
  }

  return result;
}

/**
 * Parse area from query
 * Handles: "80m²", "100 metros", "80 m2"
 * Also handles size descriptors: "grande", "pequeño", "amplio"
 */
function parseArea(query: string): { min: number | null; max: number | null } {
  const result = { min: null as number | null, max: null as number | null };

  // Exact area pattern: "80m²", "100 m2", "80 metros"
  const areaMatch = query.match(/(\d+)\s*(?:m²|m2|metros?\s*cuadrados?)/i);
  if (areaMatch) {
    const area = parseInt(areaMatch[1], 10);
    // Create a ±20% range around the mentioned area
    result.min = Math.floor(area * 0.8);
    result.max = Math.ceil(area * 1.2);
    return result;
  }

  // Size descriptors
  if (/\b(grande|amplio|espacioso)\b/i.test(query)) {
    result.min = 100; // Min 100m² for "grande"
    return result;
  }

  if (/\b(peque[ñn]o|compacto|mini)\b/i.test(query)) {
    result.max = 60; // Max 60m² for "pequeño"
    return result;
  }

  return result;
}

/**
 * Parse a natural language query into structured filter criteria
 * @param query - Natural language search query in Spanish
 * @returns Structured filter criteria
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    city: null,
    propertyType: null,
    bedrooms: null,
    minPrice: null,
    maxPrice: null,
    minArea: null,
    maxArea: null,
    amenities: [],
    rawQuery: query.trim(),
  };

  if (!query.trim()) {
    return result;
  }

  // Detect city
  for (const [cityName, pattern] of Object.entries(cityPatterns)) {
    if (pattern.test(query)) {
      result.city = cityName;
      break;
    }
  }

  // Detect property type
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(query)) {
      result.propertyType = type as PropertyType;
      break;
    }
  }

  // Detect bedrooms
  result.bedrooms = parseBedrooms(query);

  // Detect price range
  const priceRange = parsePriceRange(query);
  result.minPrice = priceRange.min;
  result.maxPrice = priceRange.max;

  // Detect area
  const areaRange = parseArea(query);
  result.minArea = areaRange.min;
  result.maxArea = areaRange.max;

  // Detect amenities
  for (const [amenityId, pattern] of Object.entries(amenityPatterns)) {
    if (pattern.test(query)) {
      result.amenities.push(amenityId);
    }
  }

  return result;
}

/**
 * Generate a natural language description from filter state
 * Used for bidirectional sync - filters -> search input
 * @param filters - Current filter state
 * @returns Natural language description of filters
 */
export function generateFilterDescription(filters: {
  city: string | null;
  propertyType: PropertyType | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}): string {
  const parts: string[] = [];

  // Property type
  if (filters.propertyType) {
    const typeNames: Record<PropertyType, string> = {
      apartment: 'Apartamento',
      house: 'Casa',
      studio: 'Estudio',
      room: 'Habitacion',
    };
    parts.push(typeNames[filters.propertyType]);
  }

  // Bedrooms
  if (filters.bedrooms !== null) {
    if (filters.bedrooms === 4) {
      parts.push('4+ habitaciones');
    } else {
      parts.push(`${filters.bedrooms} ${filters.bedrooms === 1 ? 'habitacion' : 'habitaciones'}`);
    }
  }

  // City
  if (filters.city) {
    parts.push(`en ${filters.city}`);
  }

  // Price range
  if (filters.minPrice !== null && filters.maxPrice !== null) {
    const minM = filters.minPrice / 1_000_000;
    const maxM = filters.maxPrice / 1_000_000;
    parts.push(`${minM}-${maxM}M COP`);
  } else if (filters.maxPrice !== null) {
    const maxM = filters.maxPrice / 1_000_000;
    parts.push(`hasta ${maxM}M COP`);
  } else if (filters.minPrice !== null) {
    const minM = filters.minPrice / 1_000_000;
    parts.push(`desde ${minM}M COP`);
  }

  return parts.join(', ');
}
