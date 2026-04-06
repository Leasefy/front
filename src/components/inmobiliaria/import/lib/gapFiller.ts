// src/components/inmobiliaria/import/lib/gapFiller.ts
// Mock AI gap-filling engine — deterministic heuristic rules, no real AI backend

import type { ImportProperty, AISuggestion, ParsedRow, ColumnMapping } from './importTypes';

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

export function cleanNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;

  const str = String(value).trim();

  // Remove currency symbols, spaces
  let cleaned = str.replace(/[$\s]/g, '');

  // Handle Colombian format: 1.800.000 (dots as thousand separators, comma as decimal)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // All dots are thousand separators
    cleaned = cleaned.replace(/\./g, '');
  } else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    // Colombian: 1.800.000,50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.?\d{1,2})?$/.test(cleaned)) {
    // US format: 1,800,000
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Plain number with possible commas
    cleaned = cleaned.replace(/,/g, '');
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? undefined : result;
}

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

function extractCityFromAddress(address: string): string | null {
  const lower = address.toLowerCase();
  for (const city of COLOMBIAN_CITIES) {
    if (lower.includes(city.toLowerCase())) {
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

export function mapRowsToProperties(
  rawRows: ParsedRow[],
  columnMappings: ColumnMapping[]
): ImportProperty[] {
  const numericFields = new Set(['monthlyRent', 'adminFee', 'commissionPercent']);

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
        if (strVal) {
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

    // Rule 1: Missing monthlyRent
    if (!prop.monthlyRent || prop.monthlyRent === 0 || isNaN(prop.monthlyRent)) {
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

    // Rule 2: Missing propertyZone
    if (!prop.propertyZone) {
      suggestions.push({
        field: 'propertyZone',
        suggestedValue: 'Por definir',
        confidence: 'baja',
        reasoning: 'No se detectó barrio o zona. Revisa manualmente.',
        accepted: null,
      });
    }

    // Rule 5: Missing commissionPercent
    if (
      !prop.commissionPercent ||
      prop.commissionPercent === 0 ||
      isNaN(prop.commissionPercent)
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
