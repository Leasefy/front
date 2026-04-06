// src/components/inmobiliaria/import/lib/importTypes.ts

export type ImportMethod = 'excel' | 'software' | 'portal';

export interface ParsedRow {
  _rowIndex: number;
  [columnName: string]: unknown;
}

export interface ColumnMapping {
  sourceColumn: string;       // Header from file, e.g. "Canon mensual"
  targetField: string | null; // Leasefy field, e.g. "monthlyRent"
  confidence: number;         // 0-1 from heuristic
  isManual: boolean;          // User overrode the suggestion
}

export interface AISuggestion {
  field: string;
  suggestedValue: string;
  confidence: 'alta' | 'media' | 'baja';
  reasoning: string;
  accepted: boolean | null; // null = pending
}

export interface ImportProperty {
  _rowIndex: number;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyZone?: string;
  propertyType?: string;
  monthlyRent?: number;
  adminFee?: number;
  commissionPercent?: number;
  suggestions: AISuggestion[];
  selected: boolean;
  hasErrors: boolean;
  errorMessages: string[];
}

export interface ImportWizardState {
  method: ImportMethod | null;
  file: File | null;
  fileName: string;
  rawRows: ParsedRow[];
  headers: string[];
  sheetNames: string[];
  selectedSheet: string;
  columnMappings: ColumnMapping[];
  properties: ImportProperty[];
  aiAnalyzed: boolean;
  importProgress: number; // 0-100
  importedCount: number;
}

// Target fields that columns can map to
export const TARGET_FIELDS = [
  { key: 'propertyTitle', labelKey: 'inmobiliaria.import.fields.propertyTitle', required: true },
  { key: 'propertyAddress', labelKey: 'inmobiliaria.import.fields.propertyAddress', required: true },
  { key: 'propertyCity', labelKey: 'inmobiliaria.import.fields.propertyCity', required: true },
  { key: 'propertyZone', labelKey: 'inmobiliaria.import.fields.propertyZone', required: false },
  { key: 'propertyType', labelKey: 'inmobiliaria.import.fields.propertyType', required: true },
  { key: 'monthlyRent', labelKey: 'inmobiliaria.import.fields.monthlyRent', required: true },
  { key: 'adminFee', labelKey: 'inmobiliaria.import.fields.adminFee', required: false },
  { key: 'commissionPercent', labelKey: 'inmobiliaria.import.fields.commissionPercent', required: false },
] as const;
