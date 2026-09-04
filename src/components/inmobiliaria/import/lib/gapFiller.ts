// src/components/inmobiliaria/import/lib/gapFiller.ts
// Mock AI gap-filling engine — deterministic heuristic rules, no real AI backend

import type { ImportProperty, AISuggestion, ParsedRow, ColumnMapping } from './importTypes';
import { resolveImportListingType } from './requisitosDelBack';
import { cleanNumericValue } from './valorNumerico';

// Reexport: los tests y cualquier consumidor viejo siguen importándolo de acá.
export { cleanNumericValue } from './valorNumerico';

// ============================================================================
// Rent estimates by city + property type (Colombian market data)
// ============================================================================

export const RENT_ESTIMATES: Record<string, Record<string, number>> = {
  bogota: {
    apartment: 1800000,
    house: 2800000,
    studio: 1200000,
    commercial: 3500000,
    office: 2500000,
    warehouse: 4000000,
  },
  medellin: {
    apartment: 1600000,
    house: 2400000,
    studio: 1000000,
    commercial: 3000000,
    office: 2200000,
    warehouse: 3500000,
  },
  cali: {
    apartment: 1400000,
    house: 2000000,
    studio: 900000,
    commercial: 2500000,
    office: 1800000,
    warehouse: 3000000,
  },
  barranquilla: {
    apartment: 1300000,
    house: 1800000,
    studio: 800000,
    commercial: 2200000,
    office: 1600000,
    warehouse: 2800000,
  },
  default: {
    apartment: 1500000,
    house: 2200000,
    studio: 950000,
    commercial: 2800000,
    office: 2000000,
    warehouse: 3200000,
  },
};

export const COLOMBIAN_CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Manizales',
  'Santa Marta',
  'Ibagué',
  'Villavicencio',
  'Armenia',
  'Neiva',
  'Popayán',
  'Montería',
  'Pasto',
];

// ============================================================================
// Numeric value cleaner — handles Colombian and US formats
// ============================================================================



// ============================================================================
// Property type normalization
// ============================================================================

const TYPE_NORMALIZATIONS: Record<string, string> = {
  apto: 'apartment',
  apartamento: 'apartment',
  apt: 'apartment',
  flat: 'apartment',
  casa: 'house',
  vivienda: 'house',
  'casa-lote': 'house',
  casalote: 'house',
  local: 'commercial',
  comercial: 'commercial',
  'local comercial': 'commercial',
  oficina: 'office',
  bodega: 'warehouse',
  estudio: 'studio',
  studio: 'studio',
  apartment: 'apartment',
  house: 'house',
  commercial: 'commercial',
  office: 'office',
  warehouse: 'warehouse',
};

function normalizePropertyType(raw: string): { normalized: string; wasNormalized: boolean } {
  const lower = raw.toLowerCase().trim();
  const normalized = TYPE_NORMALIZATIONS[lower];
  if (normalized) {
    return { normalized, wasNormalized: normalized !== lower };
  }
  // Partial matching
  for (const [key, value] of Object.entries(TYPE_NORMALIZATIONS)) {
    if (lower.includes(key)) {
      return { normalized: value, wasNormalized: true };
    }
  }
  return { normalized: raw, wasNormalized: false };
}

// ============================================================================
// City extraction from address
// ============================================================================

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extractCityFromAddress(address: string): string | null {
  const normalizedAddr = stripAccents(address.toLowerCase());
  for (const city of COLOMBIAN_CITIES) {
    if (normalizedAddr.includes(stripAccents(city.toLowerCase()))) {
      return city;
    }
  }
  return null;
}

function getCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ============================================================================
// Row → ImportProperty mapper
// ============================================================================

/** Cómo escriben «sin dato» los exports reales. En minúscula, comparado tras `trim()`. */
const MARCADORES_DE_VACIO = new Set([
  '-', '--', '\u2013', '\u2014', 'n/a', 'na', 'n.a', 'n.a.', 'null', 'nulo',
  's/d', 'sin dato', 'sin datos', 'no aplica', '#n/a', '#n/d', 'nan', 'none',
]);

export function mapRowsToProperties(
  rawRows: ParsedRow[],
  columnMappings: ColumnMapping[]
): ImportProperty[] {
  // T-0038 §3.2.3 — salePrice added; propertyDepartment/listingType/
  // consignedAt are strings and need no entry here (the `else` branch below
  // already handles any mapped targetField generically).
  const numericFields = new Set(['monthlyRent', 'salePrice', 'adminFee', 'commissionPercent', 'propertyArea', 'bedrooms', 'bathrooms']);

  return rawRows.map((row) => {
    const prop: ImportProperty = {
      _rowIndex: row._rowIndex,
      suggestions: [],
      selected: true,
      hasErrors: false,
      errorMessages: [],
    };

    for (const mapping of columnMappings) {
      if (!mapping.targetField || !(mapping.sourceColumn in row)) continue;

      const rawValue = row[mapping.sourceColumn];
      const field = mapping.targetField;

      if (numericFields.has(field)) {
        const num = cleanNumericValue(rawValue);
        if (num !== undefined) {
          (prop as unknown as Record<string, unknown>)[field] = num;
        }
      } else {
        const strVal = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : '';
        // «-», «N/A», «null»… son la forma en que un export dice «vacío».
        // Guardarlos como texto real mete basura visible en el inmueble.
        if (strVal && !MARCADORES_DE_VACIO.has(strVal.toLowerCase())) {
          (prop as unknown as Record<string, unknown>)[field] = strVal;
        }
      }
    }

    return prop;
  });
}

// ============================================================================
// Main gap-filling analysis engine
// ============================================================================

export function analyzeProperties(properties: ImportProperty[]): ImportProperty[] {
  return properties.map((prop) => {
    const suggestions: AISuggestion[] = [];
    const errorMessages: string[] = [];
    const updates: Partial<ImportProperty> = {};

    // Rule 3: Missing or invalid propertyType — normalize first
    if (prop.propertyType) {
      const { normalized, wasNormalized } = normalizePropertyType(prop.propertyType);
      if (wasNormalized) {
        // Auto-apply normalization — not a user suggestion
        updates.propertyType = normalized;
      }
    } else {
      // No type — suggest apartment as default
      suggestions.push({
        field: 'propertyType',
        suggestedValue: 'apartment',
        confidence: 'media',
        reasoning: 'Tipo no especificado. Se sugiere Apartamento como valor predeterminado.',
        accepted: null,
      });
    }

    const effectiveType =
      updates.propertyType ||
      prop.propertyType ||
      'apartment';

    // Rule 4: Missing propertyCity
    if (!prop.propertyCity) {
      const detectedCity = prop.propertyAddress
        ? extractCityFromAddress(prop.propertyAddress)
        : null;

      if (detectedCity) {
        suggestions.push({
          field: 'propertyCity',
          suggestedValue: detectedCity,
          confidence: 'media',
          reasoning: 'Ciudad detectada en la dirección proporcionada.',
          accepted: null,
        });
      } else {
        suggestions.push({
          field: 'propertyCity',
          suggestedValue: 'Bogotá',
          confidence: 'baja',
          reasoning: 'No se pudo detectar ciudad. Se sugiere Bogotá como valor predeterminado.',
          accepted: null,
        });
      }
    }

    const effectiveCity = prop.propertyCity || 'Bogotá';

    // Rule 1: Missing monthlyRent — T-0038: only for a RENT row. A SALE row's
    // missing price is `salePrice`, and there is no comparable sale-price
    // market-estimate table here (RENT_ESTIMATES is rent-only, Colombian
    // market data) — suggesting a rental estimate for a sale listing's price
    // would be a fabricated, wrong-field number, not a gap fill.
    if (
      resolveImportListingType(prop.listingType) === 'rent' &&
      (!prop.monthlyRent || prop.monthlyRent === 0 || isNaN(prop.monthlyRent))
    ) {
      const cityKey = getCityKey(effectiveCity);
      const cityEstimates = RENT_ESTIMATES[cityKey] || RENT_ESTIMATES['default'];
      const typeKey = effectiveType in cityEstimates ? effectiveType : 'apartment';
      const estimate = cityEstimates[typeKey];

      const typeLabel =
        effectiveType === 'apartment'
          ? 'Apartamento'
          : effectiveType === 'house'
            ? 'Casa'
            : effectiveType === 'studio'
              ? 'Estudio'
              : effectiveType === 'commercial'
                ? 'Local comercial'
                : effectiveType === 'office'
                  ? 'Oficina'
                  : 'Bodega';

      suggestions.push({
        field: 'monthlyRent',
        suggestedValue: String(estimate),
        confidence: 'media',
        reasoning: `Estimado basado en promedios de mercado para ${typeLabel} en ${effectiveCity}.`,
        accepted: null,
      });
    }

    // (Antes acá se sugería «Por definir» como barrio. Un barrio es un dato,
    // no una suposición: aceptar esa sugerencia guardaba la palabra «Por
    // definir» como barrio del inmueble y pasaba la validación del back con
    // un valor falso. Hoy el barrio faltante lo pide `faltantesParaElBack`,
    // con un campo para escribir el de verdad.)

    // Rule 5: Missing commissionPercent (0% is valid — only suggest when undefined/NaN)
    if (
      prop.commissionPercent === undefined ||
      prop.commissionPercent === null ||
      (typeof prop.commissionPercent === 'number' && isNaN(prop.commissionPercent))
    ) {
      suggestions.push({
        field: 'commissionPercent',
        suggestedValue: '10',
        confidence: 'alta',
        reasoning: 'Porcentaje estándar del mercado colombiano (8–12%).',
        accepted: null,
      });
    }

    // Rule 6: Missing propertyTitle
    if (!prop.propertyTitle) {
      const zone = prop.propertyZone;
      const city = effectiveCity;
      const typeLabel =
        effectiveType === 'apartment'
          ? 'Apartamento'
          : effectiveType === 'house'
            ? 'Casa'
            : effectiveType === 'studio'
              ? 'Estudio'
              : effectiveType === 'commercial'
                ? 'Local comercial'
                : effectiveType === 'office'
                  ? 'Oficina'
                  : 'Bodega';

      const titleSuggestion = zone
        ? `${typeLabel} en ${zone}`
        : `${typeLabel} en ${city}`;

      suggestions.push({
        field: 'propertyTitle',
        suggestedValue: titleSuggestion,
        confidence: 'media',
        reasoning: 'Título generado automáticamente a partir de los datos disponibles.',
        accepted: null,
      });
    }

    // Error detection — must have address
    if (!prop.propertyAddress) {
      errorMessages.push('Dirección requerida. Esta propiedad no puede importarse sin dirección.');
    }

    const hasErrors = errorMessages.length > 0;

    return {
      ...prop,
      ...updates,
      suggestions,
      hasErrors,
      errorMessages,
      selected: !hasErrors, // Properties with errors are deselected by default
    };
  });
}
