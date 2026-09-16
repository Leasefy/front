// src/components/inmobiliaria/import/lib/importTypes.ts

export type ImportMethod = 'excel' | 'software' | 'portal' | 'enlaces';

export interface ParsedRow {
  _rowIndex: number;
  [columnName: string]: unknown;
}

/**
 * Una columna que trae DOS datos en cada celda y se parte en dos campos:
 * «3 - CR 50 127 SUR 61» (código + dirección), «[1] 901548190 - PORTOFINO
 * S.A.S» (documento + nombre). La izquierda es siempre el dato corto (código
 * o documento) y la derecha el texto; la celda que no tenga esa forma va
 * entera a la derecha. Ver `columnaCompuesta.ts`.
 */
export interface DivisionDeColumna {
  /** [izquierda, derecha] → campo de destino de cada parte, o null = se ignora. */
  destinos: [string | null, string | null];
}

export interface ColumnMapping {
  sourceColumn: string;       // Header from file, e.g. "Canon mensual"
  targetField: string | null; // Leasefy field, e.g. "monthlyRent"
  confidence: number;         // 0-1 from heuristic
  isManual: boolean;          // User overrode the suggestion
  /** Presente cuando la columna se parte en dos; entonces `targetField` es null. */
  partes?: DivisionDeColumna;
}

export interface AISuggestion {
  field: string;
  suggestedValue: string;
  confidence: 'alta' | 'media' | 'baja';
  reasoning: string;
  accepted: boolean | null; // null = pending
}

/**
 * Un dueño cuando la fila trae VARIOS (Nico, 2026-09-13: «un inmueble puede
 * tener múltiples propietarios con diferentes % del canon»). Sale de la
 * columna multivalor del archivo real («[1] doc - nombre, [2] doc - nombre»),
 * del teléfono numerado con el mismo marcador, y de la columna de porcentajes
 * («60, 40») o de plata por dueño, si vienen.
 */
export interface DuenoDelArchivo {
  documento?: string;
  nombre?: string;
  telefono?: string;
  correo?: string;
  /** Su % del canon tal como lo escribió el archivo (60 = 60 %). */
  porcentaje?: number;
  /** Su parte del canon en pesos, si el archivo la trae repartida. */
  canon?: number;
  /** El `[n]` con el que el archivo lo numeró. */
  orden?: number;
}

export interface ImportProperty {
  _rowIndex: number;
  /**
   * El código del inmueble en el sistema del que se migra (Propiedades.csv,
   * columna «Código»). Es la llave con la que la inmobiliaria identifica el
   * inmueble y con la que sus contratos lo nombran, así que viaja al back como
   * `externalId` y se guarda en `Property.externalId`.
   */
  externalId?: string;
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
  /**
   * TODOS los dueños cuando son dos o más, en el orden del archivo, con su %
   * o su plata. `ownerName`/`ownerDocument`/`ownerPhone` siguen siendo el `[1]`
   * (compatibilidad: un archivo de un dueño por fila no cambia en nada).
   * Viajan al back como `propietarios[]` y quedan escritos en el mandato.
   */
  owners?: DuenoDelArchivo[];
  status?: string;
  notes?: string;
  /** contract.md T-0038 §3.2.6 (D5, R6) — "YYYY-MM-DD", agency-only. */
  consignedAt?: string;
  /** Estrato ya leído a número (el archivo lo trae en palabras: «Tres»). */
  stratum?: number;
  /**
   * ── Tres columnas más del archivo real, que sí viajan ─────────────────────
   *
   * `toImportarInmuebleDto` las manda como `urbanizacion`, `llavesEn` y
   * `creadaPor`, los nombres exactos que declara `ImportarInmuebleDto` en el
   * back. Las dos primeras terminan dentro de la descripción del inmueble; la
   * tercera queda en el registro de lo que vino tal cual, sin copiarse a la
   * ficha (es un empleado de la otra empresa, no describe al inmueble).
   */
  urbanizacion?: string;
  llavesEn?: string;
  creadaPor?: string;
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
  { key: 'externalId', label: 'Código', required: false },
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
  // Varios dueños con su % (Nico, 2026-09-13): «60, 40» o «60 %, 40 %», en
  // el mismo orden que los dueños de la columna «Propietario».
  { key: 'ownerShare', label: '% de cada propietario', required: false },
  // …o la plata de cada uno («$660.000, $440.000»), si el archivo reparte así.
  { key: 'ownerRent', label: 'Canon de cada propietario', required: false },
  { key: 'status', label: 'Estado', required: false },
  { key: 'notes', label: 'Observaciones', required: false },
  { key: 'consignedAt', label: 'Fecha de consignación', required: false },
  { key: 'stratum', label: 'Estrato', required: false },
  { key: 'urbanizacion', label: 'Urbanización / conjunto', required: false },
  { key: 'llavesEn', label: 'Llaves en', required: false },
  { key: 'creadaPor', label: 'Creada por', required: false },
] as const;
