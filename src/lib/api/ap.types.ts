/**
 * Cuentas por pagar (AP) del microservicio `agent` — contrato del cliente
 * (2026-09-02, captura de facturas de proveedor por IA).
 *
 * Rutas: `{NEXT_PUBLIC_AGENT_URL}/api/agency/{agencyId}/ap/*` con el JWT del
 * usuario. Shapes espejo de `agency-ap-vendors.ts`, `agency-ap-bills.ts` y
 * `agency-ap-bills-extract.ts` del micro.
 */

// ── Proveedores ─────────────────────────────────────────────────────────────

export type ApBankAccountType = 'corriente' | 'ahorros' | 'nequi' | 'daviplata';

export interface ApVendor {
  id: string;
  tenantId: string;
  name: string;
  /** NIT o cédula, tal como se guardó (puede traer DV y puntos). */
  documentNumber: string;
  bankName: string | null;
  /** Enmascarado (últimos 4) en el listado. */
  bankAccountNumber: string | null;
  bankAccountType: string | null;
  bankAccountHolder: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface ApCreateVendorBody {
  name: string;
  documentNumber: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountType?: ApBankAccountType;
  bankAccountHolder?: string;
  email?: string;
  phone?: string;
}

// ── Centros de costo ────────────────────────────────────────────────────────

export interface ApCostCenter {
  code: string;
  name: string;
}

// ── Facturas ────────────────────────────────────────────────────────────────

export interface ApBill {
  id: string;
  tenantId: string;
  vendorId: string;
  invoiceNumber: string;
  /** Decimal serializado como string. */
  amountCop: string;
  baseGravableCop: string | null;
  ivaCop: string | null;
  costCenterCode: string;
  issuedAt: string;
  dueDate: string;
  status: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  /** La factura original en Storage (URL firmada), si se capturó desde una foto/PDF. */
  adjuntoUrl: string | null;
  concepto: string | null;
}

export interface ApCreateBillBody {
  vendorId: string;
  invoiceNumber: string;
  /** Pesos enteros. */
  amountCop: number;
  baseGravableCop?: number;
  ivaCop?: number;
  retentionCodes?: Record<string, unknown>;
  costCenterCode: string;
  /** ISO datetime */
  issuedAt: string;
  /** ISO datetime */
  dueDate: string;
  adjuntoUrl?: string;
  concepto?: string;
}

// ── Extracción por IA ───────────────────────────────────────────────────────

export const FACTURA_PDF_MEDIA_TYPE = 'application/pdf';

/** Lo que se acepta para una factura: fotos y PDF. Cualquier otra cosa se rechaza ANTES de subir. */
export const FACTURA_MEDIA_TYPES_SOPORTADOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  FACTURA_PDF_MEDIA_TYPE,
];

/** Topes del agente (`MAX_ARCHIVOS`, `MAX_BYTES_TOTAL`, `MAX_BYTES_POR_ARCHIVO` de documentos-a-bloques.ts). */
export const FACTURA_MAX_ARCHIVOS = 10;
export const FACTURA_MAX_BYTES_TOTAL = 20 * 1024 * 1024;
export const FACTURA_MAX_BYTES_POR_ARCHIVO = 10 * 1024 * 1024;

export interface FacturaDocumentoRequest {
  nombre: string;
  mediaType: string;
  base64: string;
}

export type FacturaTipoDocumento =
  | 'factura_electronica'
  | 'cuenta_de_cobro'
  | 'factura_pos'
  | 'recibo'
  | 'otro';

/** Campos leídos de la factura, ya normalizados por el micro (pesos enteros, fechas YYYY-MM-DD). */
export interface FacturaExtraida {
  proveedorNombre: string | null;
  proveedorNit: string | null;
  proveedorDv: string | null;
  proveedorCorreo: string | null;
  proveedorTelefono: string | null;
  numeroFactura: string | null;
  cufe: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  moneda: string | null;
  subtotalCop: number | null;
  ivaCop: number | null;
  retencionesCop: number | null;
  totalCop: number | null;
  concepto: string | null;
  inmuebleReferencia: string | null;
  formaDePago: string | null;
  fieldConfidence: Record<string, number>;
}

export interface FacturaItem {
  descripcion: string;
  cantidad: number | null;
  valorUnitarioCop: number | null;
  valorCop: number | null;
}

export interface FacturaConflicto {
  campo: keyof FacturaExtraida | string;
  valores: Array<{ valor: string; documento: string }>;
}

export interface FacturaDocumentoDetectado {
  nombre: string;
  tipo: FacturaTipoDocumento | string;
}

export interface ApVendorCandidato {
  vendorId: string;
  name: string;
  documentNumber: string;
}

export interface FacturaSugerencia {
  vendorId: string | null;
  invoiceNumber: string;
  amountCop: number | null;
  baseGravableCop: number | null;
  ivaCop: number | null;
  /** ISO datetime o null (no se inventa). */
  issuedAt: string | null;
  dueDate: string | null;
  costCenterCode: string | null;
}

/** Respuesta de `POST /ap/bills/extract`. */
export interface FacturaExtractResponse {
  success: true;
  factura: FacturaExtraida;
  items: FacturaItem[];
  conflictos: FacturaConflicto[];
  documentos: FacturaDocumentoDetectado[];
  /** confianza global promedio (0-1) */
  confidence: number;
  proveedor: {
    match: ApVendorCandidato | null;
    candidatos: ApVendorCandidato[];
  };
  sugerencia: FacturaSugerencia;
  /** URL firmada del primer documento en Storage; null si el micro no tiene Storage configurado. */
  adjuntoUrl: string | null;
  tokensUsed: number;
  estimatedCostUsd: number;
}
