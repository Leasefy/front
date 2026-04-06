// src/components/inmobiliaria/import/lib/columnMapping.ts
// Heuristic column matcher: Tier 1 keyword dictionary + Tier 2 Levenshtein distance

import type { ColumnMapping } from './importTypes';

/**
 * Keyword dictionary for Tier 1 exact substring matching.
 * Keys are Leasefy target field names; values are Spanish/English keywords.
 */
export const COLUMN_KEYWORDS: Record<string, string[]> = {
  propertyTitle:    ['titulo', 'nombre', 'inmueble', 'propiedad', 'descripcion corta'],
  propertyAddress:  ['direccion', 'direccion', 'address', 'ubicacion', 'ubicacion', 'calle'],
  propertyCity:     ['ciudad', 'municipio', 'city'],
  propertyZone:     ['barrio', 'zona', 'sector', 'localidad', 'urbanizacion', 'urbanizacion'],
  propertyType:     ['tipo', 'tipo inmueble', 'clase', 'type'],
  monthlyRent:      ['canon', 'arriendo', 'valor', 'precio', 'alquiler', 'renta', 'mensual', 'rent'],
  adminFee:         ['admin', 'administracion', 'administracion', 'cuota admin', 'copropiedad'],
  commissionPercent:['comision', 'comision', 'fee', 'honorario', 'honorarios'],
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
  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedHeader.includes(normalize(keyword)) || normalize(keyword).includes(normalizedHeader)) {
        return { targetField: field, confidence: 0.92 };
      }
    }
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
