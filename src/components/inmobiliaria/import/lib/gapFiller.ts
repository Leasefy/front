// src/components/inmobiliaria/import/lib/gapFiller.ts
// Mock AI gap-filling engine — deterministic heuristic rules, no real AI backend

import type { ImportProperty, AISuggestion, ParsedRow, ColumnMapping } from './importTypes';
import { tipoEfectivo } from './requisitosDelBack';
import { tituloSugerido } from './tituloSugerido';
import { cleanNumericValue } from './valorNumerico';
import {
  documentoYNombre,
  estratoDePalabras,
  fechaDeOrigen,
} from '@/lib/migracion/valores-de-origen';

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
  /*
   * 🔴 «Apartaestudio» va ARRIBA de «apt»: la búsqueda parcial recorre este
   * objeto en orden y `'apartaestudio'.includes('apt')` es verdadero, así que
   * los 293 apartaestudios del archivo real entraban como apartamentos. Un
   * apartaestudio es un `studio` — es el tipo que existe para eso.
   */
  apartaestudio: 'studio',
  'aparta estudio': 'studio',
  'aparta-estudio': 'studio',
  apto: 'apartment',
  apartamento: 'apartment',
  apt: 'apartment',
  flat: 'apartment',
  casa: 'house',
  // Una finca es una casa en el campo: `house` es el tipo más cercano que
  // existe. «Casa Finca» ya caía acá por «casa».
  finca: 'house',
  'casa finca': 'house',
  // «Cabaña» viene en el archivo real (con y sin tilde según quién la escribió).
  // Lo que NO se fuerza a ningún tipo: «Lote», «Celda Parqueadero», «Edificio»
  // y «Amoblados». No hay `PropertyType` que signifique eso, y elegir el más
  // parecido guardaría una mentira que después nadie revisa: llegan crudos y
  // el back los marca `faltante: tipo` con el valor original a la vista.
  cabana: 'house',
  'cabaña': 'house',
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

      if (field === 'stratum') {
        // El archivo real trae el estrato en PALABRAS («Tres», «No
        // Estratificada»). `cleanNumericValue` lo dejaría vacío siempre.
        const estrato = estratoDePalabras(rawValue);
        if (estrato !== undefined) prop.stratum = estrato;
      } else if (field === 'consignedAt') {
        // «2026-09-08 10:10:08» → «2026-09-08». Lo que no es una fecha queda
        // vacío: el back valida el formato al revisar y una fecha inventada
        // no da error, corre datos.
        const fecha = fechaDeOrigen(rawValue);
        if (fecha) prop.consignedAt = fecha;
      } else if (numericFields.has(field)) {
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

    /*
     * El archivo real trae al propietario EMPAQUETADO en una celda:
     * «901548190 - PORTOFINO PROPIEDAD RAIZ S.A.S». Sin partirlo, el inmueble
     * se consignaba a nombre de «901548190 - PORTOFINO…» y su documento
     * quedaba vacío — es decir, el back nunca podía resolver la ficha por
     * documento y creaba un propietario nuevo por cada variante del texto.
     *
     * Sólo se parte cuando la izquierda tiene cara de documento y la fila no
     * traía ya una columna propia de cédula: si el archivo la trae aparte, esa
     * gana (es un dato, no una deducción).
     */
    if (prop.ownerName && !prop.ownerDocument) {
      const { documento, nombre } = documentoYNombre(prop.ownerName);
      if (documento) {
        prop.ownerDocument = documento;
        if (nombre) prop.ownerName = nombre;
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
      tipoEfectivo(prop) === 'rent' &&
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
      /*
       * 🔴 El MUNICIPIO, no el barrio. Antes se prefería `propertyZone` y
       * salían títulos como «Bodega en HOSPITAL» — el barrio de una celda de
       * parqueadero. Y el tipo se traducía a siete etiquetas del enum, así que
       * una «Casa Finca» salía como «Casa» y un «Lote» como «Bodega».
       *
       * `tituloSugerido` es el MISMO cálculo que el back usa para guardar
       * (`src/properties/titulo.ts`): lo que se propone acá es literalmente lo
       * que queda si la persona no escribe otro.
       */
      const titleSuggestion = tituloSugerido(
        effectiveType,
        effectiveCity,
        prop.propertyZone,
      );

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
