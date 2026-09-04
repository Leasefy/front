// src/components/inmobiliaria/import/lib/importTypes.ts

export type ImportMethod = 'excel' | 'software' | 'portal' | 'enlaces';

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
  /** contract.md T-0038 §3.2.1 — optional on write; free text from the file, not constrained to COLOMBIAN_DEPARTMENTS at import time (C13: origin governs validation). */
  propertyDepartment?: string;
  propertyType?: string;
  /**
   * contract.md T-0038 §3.2.2 — raw string as read from the file (e.g.
   * "Arriendo"/"Venta"), NOT yet normalized to the wire's RENT/SALE. C13:
   * every field is optional at ingestion; completeness (including a
   * recognised listingType) is enforced at activation, not here.
   */
  listingType?: string;
  monthlyRent?: number;
  /** contract.md T-0038 §3.2.3 — required at activation when listingType resolves to SALE. */
  salePrice?: number;
  adminFee?: number;
  commissionPercent?: number;
  propertyArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  ownerName?: string;
  /** Cédula/NIT del propietario: con esto el back resuelve la ficha sin ambigüedad. */
  ownerDocument?: string;
  ownerPhone?: string;
  status?: string;
  notes?: string;
  /** contract.md T-0038 §3.2.6 (D5, R6) — "YYYY-MM-DD", agency-only. */
  consignedAt?: string;
  suggestions: AISuggestion[];
  selected: boolean;
  hasErrors: boolean;
  errorMessages: string[];

  // ── Sólo cuando el inmueble vino de un enlace ──────────────────────────
  /** El enlace del que se leyó. Se muestra para poder ir a verificar. */
  enlaceOrigen?: string;
  /** URLs de las fotos en el CDN de origen; se suben tras crear el inmueble. */
  imagenes?: string[];
  /**
   * `propertyAddress` no es la dirección exacta: es una referencia que da el
   * aviso, o el municipio, porque el portal no publica la calle. La fila
   * sigue necesitando poder corregirse a mano — por eso el input manual
   * tiene que seguir alcanzable aunque el campo ya no esté vacío.
   */
  direccionAproximada?: boolean;
  /**
   * De dónde salió cada campo: `'json-ld'` es un dato que el sitio declara,
   * `'texto'` es algo leído de una frase. La pantalla lo muestra para que la
   * persona sepa a qué números mirarles la cara.
   */
  procedencia?: Record<string, string>;
}

export interface ImportWizardState {
  method: ImportMethod | null;
  file: File | null;
  fileName: string;
  /** Lo que la persona pegó en el paso de enlaces, tal cual, para no perderlo al volver. */
  enlacesPegados: string;
  rawRows: ParsedRow[];
  headers: string[];
  sheetNames: string[];
  selectedSheet: string;
  columnMappings: ColumnMapping[];
  properties: ImportProperty[];
  aiAnalyzed: boolean;
  importProgress: number; // 0-100
  importedCount: number;
  /**
   * El lote del servidor que este wizard está trabajando. Se escribe al
   * preparar y al retomar una carga abierta; StepConfirmImport lo lee al
   * montar. Vive acá —no en el paso— para sobrevivir a «Anterior» y a un
   * remount: perderlo hacía re-subir el archivo y duplicar el lote.
   */
  loteRetomado?: string | null;
}

// Target fields that columns can map to
// T-0038 §3.8: department/listingType/salePrice/consignedAt added.
// `required: false` for all four — C13 ("origin governs validation"): every
// field is optional at ingestion, completeness is enforced at activation.
export const TARGET_FIELDS = [
  { key: 'propertyTitle', label: 'Título', required: false },
  { key: 'propertyAddress', label: 'Dirección', required: true },
  { key: 'propertyCity', label: 'Ciudad', required: true },
  { key: 'propertyZone', label: 'Barrio / Zona', required: false },
  { key: 'propertyDepartment', label: 'Departamento', required: false },
  { key: 'propertyType', label: 'Tipo de inmueble', required: true },
  { key: 'listingType', label: 'Tipo de operación (arriendo/venta)', required: false },
  { key: 'monthlyRent', label: 'Canon mensual', required: true },
  { key: 'salePrice', label: 'Precio de venta', required: false },
  { key: 'adminFee', label: 'Administración', required: false },
  { key: 'commissionPercent', label: 'Comisión %', required: false },
  { key: 'propertyArea', label: 'Área (m²)', required: false },
  { key: 'bedrooms', label: 'Habitaciones', required: false },
  { key: 'bathrooms', label: 'Baños', required: false },
  { key: 'ownerName', label: 'Propietario', required: false },
  { key: 'ownerDocument', label: 'Cédula / NIT del propietario', required: false },
  { key: 'ownerPhone', label: 'Teléfono propietario', required: false },
  { key: 'status', label: 'Estado', required: false },
  { key: 'notes', label: 'Observaciones', required: false },
  { key: 'consignedAt', label: 'Fecha de consignación', required: false },
] as const;
