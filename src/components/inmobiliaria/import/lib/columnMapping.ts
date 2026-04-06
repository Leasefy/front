// src/components/inmobiliaria/import/lib/columnMapping.ts
// Heuristic column matcher: Tier 1 keyword dictionary + Tier 2 Levenshtein distance

import type { ColumnMapping } from './importTypes';

/**
 * Keyword dictionary for Tier 1 exact substring matching.
 * Keys are Leasefy target field names; values are Spanish/English keywords.
 */
/**
 * Keywords ordered by specificity — longer/more specific phrases first.
 * The matcher checks in order, so "tipo inmueble" matches propertyType before
 * "inmueble" could match propertyTitle.
 */
export const COLUMN_KEYWORDS: Record<string, string[]> = {
  propertyType:     ['tipo inmueble', 'tipo de inmueble', 'tipo propiedad', 'clase inmueble', 'tipo', 'clase', 'type'],
  propertyTitle:    ['titulo', 'nombre propiedad', 'descripcion corta', 'nombre'],
  propertyAddress:  ['direccion', 'address', 'ubicacion', 'calle', 'dir'],
  propertyCity:     ['ciudad', 'municipio', 'city'],
  propertyZone:     ['barrio', 'zona', 'sector', 'localidad', 'urbanizacion', 'vecindario'],
  monthlyRent:      ['canon mensual', 'canon', 'arriendo', 'valor arriendo', 'precio', 'alquiler', 'renta mensual', 'renta', 'mensual', 'rent'],
  adminFee:         ['administracion', 'admin', 'cuota admin', 'copropiedad', 'cuota'],
  commissionPercent:['comision', 'fee', 'honorario', 'honorarios', 'porcentaje'],
  propertyArea:     ['area m2', 'area', 'metros', 'm2', 'metros cuadrados', 'superficie', 'tamano'],
  bedrooms:         ['alcobas', 'habitaciones', 'cuartos', 'dormitorios', 'hab', 'recamaras', 'bedrooms'],
  bathrooms:        ['banos', 'bano', 'bathrooms', 'wc'],
  ownerName:        ['propietario', 'dueno', 'nombre propietario', 'owner'],
  ownerPhone:       ['tel propietario', 'telefono propietario', 'celular propietario', 'tel', 'telefono', 'celular', 'phone'],
  status:           ['estado', 'status', 'disponibilidad'],
  notes:            ['observaciones', 'notas', 'comentarios', 'descripcion', 'notes'],
};

/**
 * Normalize a string for comparison:
 * - Lowercase
 * - Strip diacritics (NFD decomposition)
 * - Trim whitespace
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Standard dynamic programming Levenshtein distance.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Try Tier 1: keyword exact substring match.
 * Returns { targetField, confidence } or null if no match.
 */
function tier1Match(normalizedHeader: string): { targetField: string; confidence: number } | null {
  // Collect ALL matches, prefer forward matches (header contains keyword) over reverse
  let bestField: string | null = null;
  let bestScore = 0;

  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    for (const keyword of keywords) {
      const normKeyword = normalize(keyword);
      const forwardMatch = normalizedHeader.includes(normKeyword);
      const reverseMatch = normKeyword.includes(normalizedHeader);

      if (forwardMatch) {
        // Forward match: header contains keyword — strong signal, score by keyword length
        const score = 1000 + normKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      } else if (reverseMatch && normalizedHeader.length >= normKeyword.length * 0.6) {
        // Reverse match: keyword contains header — weaker, only when header is substantial
        const score = normKeyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }
  }

  if (bestField) {
    return { targetField: bestField, confidence: 0.92 };
  }
  return null;
}

/**
 * Try Tier 2: Levenshtein distance against all keywords.
 * Returns { targetField, confidence } or null if no match above threshold.
 */
function tier2Match(normalizedHeader: string): { targetField: string; confidence: number } | null {
  const THRESHOLD = 0.5;
  let bestField: string | null = null;
  let bestConfidence = 0;

  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    for (const keyword of keywords) {
      const normKeyword = normalize(keyword);
      const maxLen = Math.max(normalizedHeader.length, normKeyword.length);
      if (maxLen === 0) continue;
      const dist = levenshteinDistance(normalizedHeader, normKeyword);
      const confidence = 1 - dist / maxLen;
      if (confidence >= THRESHOLD && confidence > bestConfidence) {
        bestConfidence = confidence;
        bestField = field;
      }
    }
  }

  if (bestField) {
    // Cap tier 2 confidence below tier 1 threshold
    const cappedConfidence = Math.min(bestConfidence, 0.89);
    return { targetField: bestField, confidence: cappedConfidence };
  }

  return null;
}

/**
 * Auto-map an array of column headers to Leasefy target fields.
 *
 * Rules:
 * - Tier 1 (keyword substring match): confidence 0.9+
 * - Tier 2 (Levenshtein): confidence 0.5–0.89
 * - No match: targetField null, confidence 0
 * - Deduplication: if two headers map to same targetField, keep the higher-confidence one
 */
export function autoMapColumns(headers: string[]): ColumnMapping[] {
  // First pass: score each header
  const results: ColumnMapping[] = headers.map((header) => {
    const normalized = normalize(header);
    const tier1 = tier1Match(normalized);
    if (tier1) {
      return {
        sourceColumn: header,
        targetField: tier1.targetField,
        confidence: tier1.confidence,
        isManual: false,
      };
    }
    const tier2 = tier2Match(normalized);
    if (tier2) {
      return {
        sourceColumn: header,
        targetField: tier2.targetField,
        confidence: tier2.confidence,
        isManual: false,
      };
    }
    return {
      sourceColumn: header,
      targetField: null,
      confidence: 0,
      isManual: false,
    };
  });

  // Deduplication pass: for each targetField, keep only the highest confidence mapping
  const fieldToIndex = new Map<string, number>();

  for (let i = 0; i < results.length; i++) {
    const { targetField, confidence } = results[i];
    if (!targetField) continue;

    if (fieldToIndex.has(targetField)) {
      const existingIndex = fieldToIndex.get(targetField)!;
      if (confidence > results[existingIndex].confidence) {
        // Current one is better — nullify the existing one
        results[existingIndex] = {
          ...results[existingIndex],
          targetField: null,
          confidence: 0,
        };
        fieldToIndex.set(targetField, i);
      } else {
        // Existing one is better — nullify current
        results[i] = {
          ...results[i],
          targetField: null,
          confidence: 0,
        };
      }
    } else {
      fieldToIndex.set(targetField, i);
    }
  }

  return results;
}

export type { ColumnMapping };
