/**
 * Backend types for contract endpoints
 * Maps to /contracts controller in NestJS backend
 */

import type { PerfilesDelContrato } from '@/lib/types/contract';

export interface BackendSignature {
  signedAt: string;
  signedBy: string;
  signerId: string;
  ipAddress: string;
  userAgent: string;
  status: string;
  otpVerified: boolean;
  otpVerifiedAt?: string;
}

export interface BackendAuditEvent {
  id: string;
  contractId: string;
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface BackendContract {
  id: string;
  applicationId?: string;
  /**
   * `null` en un contrato MIGRADO al que la inmobiliaria decidió no
   * importarle el inmueble (T-0033) — el `Contract` existe igual, aparece
   * en la lista y el detalle como cualquier otro, sólo que dice "Sin
   * inmueble". Es la fuente de verdad de "¿tiene inmueble?": nunca inferir
   * eso de un `propertyAddress` vacío, que también lo produce una fila
   * legacy anterior a las columnas de snapshot.
   */
  propertyId: string | null;
  /**
   * `null` en un contrato MIGRADO sin correo de inquilino (T-0031, D2/D4) —
   * el `Contract` existe igual, sin usuario inquilino asociado. No es un
   * dato ausente por error.
   */
  tenantId: string | null;
  landlordId: string;
  /**
   * Número consecutivo del contrato, legible por humanos (T-0040).
   *
   * Lo asigna **el servidor** y arranca en 1 dentro de su alcance: por
   * inmobiliaria, o por propietario cuando el contrato no tiene inmobiliaria
   * (`Contract.agencyId` es nullable a propósito — existe el contrato
   * marketplace / directo con el propietario). La secuencia es INDEPENDIENTE
   * de la de inmuebles: el primer contrato de una agencia es el 1 aunque ya
   * administre 40 propiedades.
   *
   * **Nunca se manda de vuelta en una escritura.** No está en ningún DTO de
   * request del back y `forbidNonWhitelisted` devuelve 400 del request entero
   * si viaja.
   *
   * Opcional acá y NO opcional en el wire: la columna es `Int NOT NULL`, así
   * que el back nunca manda `null`. El único caso de ausencia real es un
   * `front` desplegado por delante del `back` — build anterior a T-0040. La
   * degradación congelada para ese caso es **no renderizar nada**: ni `—`, ni
   * `#0`, ni `#undefined`, ni el UUID en su lugar. Guardá siempre con
   * `!= null`.
   */
  code?: number;
  status: string;

  // ─── Snapshot fields (Opción A implementada 2026-04-20) ───────────────────
  // El backend captura estos datos al crear el contrato. Son inmutables por diseño —
  // reflejan el estado legal al momento de la firma. Pueden venir null en contratos
  // legacy donde el backfill best-effort no encontró el dato original.
  landlordName: string | null;
  landlordEmail: string | null;
  landlordDocument: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantDocument: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  propertyAdminFee: number | null;

  // ─── Terms (editables vía PATCH antes de firmas) ─────────────────────────
  /**
   * `null` en un contrato MIGRADO sin ese dato (T-0031, M2, D6 — nunca `0`
   * como sentinela de "desconocido"). `monthlyRent`/`startDate`/`endDate`/
   * `paymentDay` son las 5 columnas que la CHECK `contracts_native_complete`
   * exige completas sólo para `contractOrigin !== 'MIGRATED'`.
   */
  monthlyRent: number | null;
  startDate: string | null;
  endDate: string | null;
  paymentDay: number | null;         // backend usa `paymentDay` (el front lo mapea a paymentDueDay)
  /**
   * Términos de cobro (columnas `prorratear_primer_mes` / `dias_de_plazo`).
   * Opcionales acá porque un back anterior a esta rama no los manda;
   * `diasDePlazo: null` = hereda los de la inmobiliaria.
   */
  prorratearPrimerMes?: boolean;
  diasDePlazo?: number | null;

  // ─── Administración (NO viajan en el documento firmado) ──────────────────
  usoInmueble?: 'VIVIENDA' | 'COMERCIAL' | null;
  periodicidad?: 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null;
  /** La del contrato. Llega como string: es Decimal en Prisma. */
  comisionPorcentaje?: number | string | null;
  /** La de la consignación — la que de verdad liquida. Sólo la devuelve GET /:id. */
  comisionDeConsignacion?: number | null;
  /**
   * El dueño según la consignación del inmueble (la ficha `Propietario` de
   * la inmobiliaria). `landlordName` NO es eso en un contrato migrado: es el
   * usuario que corrió la migración. Sólo lo devuelve GET /:id.
   */
  propietarioDeLaConsignacion?: {
    id: string;
    name: string;
    documentNumber: string;
  } | null;
  /**
   * Quién retiene qué, por parte. Sólo lo devuelven GET /:id y
   * PATCH /:id/administracion — las dos con la MISMA forma, a propósito: una
   * respuesta sin el campo se leería como «no hay perfiles» justo después de
   * haberlos guardado.
   */
  perfilesTributarios?: PerfilesDelContrato | null;
  /**
   * El régimen tributario YA RESUELTO por el back, con el origen de cada
   * valor. La pantalla lo muestra tal cual: recalcularlo acá sería una
   * segunda cuenta que un día no coincide con la que cobra.
   */
  regimenTributario?: RegimenTributarioDelContrato | null;
  /** null = heredar de la ficha del propietario. */
  arrendadorResponsableIva?: boolean | null;
  /*
   * Los campos CRUDOS del perfil del inquilino, tal cual están guardados.
   * `perfilesTributarios.inquilino` ya viene con los defaults mezclados, así
   * que no sirve para poblar un formulario: no distingue «configurado en
   * NATURAL» de «vacío, y NATURAL es el default».
   */
  inquilinoTipoPersona?: 'NATURAL' | 'JURIDICA' | null;
  inquilinoResponsableIva?: boolean | null;
  inquilinoRetenedorRenta?: boolean | null;
  inquilinoRetenedorIva?: boolean | null;
  inquilinoRetenedorIca?: boolean | null;

  // ─── PDF origin ──────────────────────────────────────────────────────────
  contractOrigin?: ContractOrigin;
  uploadedPdfPath?: string;
  insuranceTier?: InsuranceTier;
  customClauses?: CustomClause[];

  // ─── Signatures ──────────────────────────────────────────────────────────
  landlordSignature?: BackendSignature | null;
  tenantSignature?: BackendSignature | null;
  documentHash?: string;

  // ─── Metadata ────────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
  /** Fecha en que ambas firmas quedaron completas (contrato SIGNED). Null si no firmaron los dos. */
  signedAt?: string | null;
  /** Fecha en que el contrato entró en vigencia (ACTIVE). Null si no se activó. */
  activatedAt?: string | null;

  // ─── Legacy / deprecated (kept optional — backend doesn't model these) ───
  /** @deprecated el backend no modela templates. Siempre undefined. */
  templateId?: string;
  /** @deprecated el backend no modela type del contrato. Siempre undefined. */
  type?: string;
  /** @deprecated el backend no modela garantías todavía. Siempre undefined. */
  guaranteeType?: string;
  /** @deprecated el backend no modela garantías todavía. Siempre undefined. */
  guaranteeDetails?: string;
  /** @deprecated el backend no modela cláusulas no negociables todavía. */
  nonNegotiableClauses?: Array<{ id: string; title: string; content: string; required: boolean }>;
  /** @deprecated el backend no modela condiciones especiales todavía. */
  specialConditions?: string;
  /**
   * @deprecated el backend no devuelve un array de audit events. El audit trail se deriva
   * de los campos existentes (createdAt, landlordSignature.signedAt, tenantSignature.signedAt).
   */
  auditTrail?: BackendAuditEvent[];
}

export type ContractOrigin = 'GENERATED' | 'UPLOADED_PDF';
export type InsuranceTier = 'NONE' | 'BASIC' | 'PREMIUM';

export interface CustomClause {
  title: string;      // max 100
  content: string;    // max 2000
}

export interface CreateContractDto {
  applicationId: string;
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  monthlyRent: number;      // COP, min 100000
  deposit: number;          // COP, min 0
  paymentDay: number;       // 1-28
  /** Prorratear el primer cobro por los días realmente ocupados. Default: false. */
  prorratearPrimerMes?: boolean;
  /** Días de plazo antes de la mora (0-60). `null`/ausente = hereda los de la inmobiliaria. */
  diasDePlazo?: number | null;
  insuranceTier?: InsuranceTier;          // default NONE
  customClauses?: CustomClause[];
  /** Default: 'GENERATED'. Use 'UPLOADED_PDF' when a landlord-provided PDF is attached. */
  contractOrigin?: ContractOrigin;
  /** Required when contractOrigin === 'UPLOADED_PDF'. Returned by POST /contracts/upload-pdf. */
  uploadedPdfPath?: string;
}

/**
 * Contrato armado a mano (sin postulación): inmueble consignado + inquilino +
 * los mismos términos de `CreateContractDto`. `tenantId` (inquilino existente)
 * e `inquilino` (nuevo, por documento) son excluyentes.
 */
export interface CrearContratoManualDto extends Omit<CreateContractDto, 'applicationId'> {
  propertyId: string;
  tenantId?: string;
  inquilino?: {
    nombre: string;
    documento: string;
    /** Obligatorio si el documento no es de ningún inquilino de la agencia: ahí llega la invitación. */
    correo?: string;
    telefono?: string;
  };
}

export interface ContratoManualCreadoBackend {
  contract: BackendContract;
  inquilino: {
    userId: string;
    /** Se le acaba de mandar la invitación a crear su cuenta. */
    invitado: boolean;
    /** Ya era inquilino de la agencia. */
    existente: boolean;
  };
}

export interface UploadContractPdfResponse {
  uploadedPdfPath: string;
}

export interface SignContractDto {
  acceptedTerms: boolean;      // must be true
  consentText: string;         // max 500 chars
  signatureData?: string;      // optional base64 PNG
  /**
   * Token UUID devuelto por `POST /contracts/:id/otp/verify`. One-use.
   * Opcional por backward-compat: si no viene, el backend permite firmar sin OTP
   * (hasta que activen el feature flag que lo hace obligatorio).
   */
  otpVerificationToken?: string;
}

// ============================================================================
// OTP flow for contract signing (email-based)
// ============================================================================

export type ContractOtpRole = 'tenant' | 'landlord';

export interface SendOtpDto {
  role: ContractOtpRole;
}

export interface SendOtpResponse {
  /** Email del destinatario enmascarado por el backend (ej: "ni***s@example.com"). */
  sentTo: string;
  /** ISO — el código vence a esta hora (10 min por default). */
  expiresAt: string;
  /** Segundos hasta poder pedir un nuevo código (rate limit del backend). */
  cooldownSeconds: number;
}

export interface VerifyOtpDto {
  role: ContractOtpRole;
  code: string;
}

export interface VerifyOtpResponse {
  /** UUID v4 one-use — pasar este valor como `otpVerificationToken` al firmar. */
  verificationToken: string;
  /** ISO — el token vence a esta hora (5 min). */
  expiresAt: string;
}

/** Shape returned by GET /contracts/:id/preview */
export type ContractPreview =
  | { origin: 'GENERATED'; html: string }
  | { origin: 'UPLOADED_PDF'; pdfUrl: string; expiresAt: string };

/**
 * Shape returned by GET /contracts/:id/pdf — signed URL para descargar el PDF actual.
 * Funciona en cualquier estado del contrato (DRAFT → EXPIRED → CANCELLED).
 * El backend elige automáticamente el PDF correcto según el estado:
 *  - Sin firmas: PDF original (UPLOADED_PDF) o generado al vuelo (GENERATED).
 *  - Tenant firmó: PDF con certificado parcial + banner "ESPERANDO FIRMA DEL PROPIETARIO".
 *  - Ambos firmaron: PDF final con certificado completo + hash SHA-256.
 */
export interface ContractSignedPdf {
  url: string;
  expiresAt: string;
}

// ============================================================================
// Rejection / edit / cancel flow (backend handoff CONTRACT_REJECTION_FLOW)
// ============================================================================

/** PATCH /contracts/:id — landlord edits terms and/or swaps PDF. Any edit invalidates landlord signature. */
export interface UpdateContractDto {
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  deposit?: number;
  paymentDay?: number;
  prorratearPrimerMes?: boolean;
  /** `null` vuelve a heredar los días de plazo de la inmobiliaria. */
  diasDePlazo?: number | null;
  insuranceTier?: InsuranceTier;
  customClauses?: CustomClause[];
  /** Only valid for UPLOADED_PDF contracts. 400 otherwise. */
  uploadedPdfPath?: string;
}

/** POST /contracts/:id/reject — tenant only, PENDING_TENANT_SIGNATURE only. */
export interface RejectContractDto {
  type: 'DEFINITIVE' | 'MODIFICATIONS';
  reason: string;              // required, 5-2000 chars
}

/** POST /contracts/:id/cancel — either party, any pre-signed state. */
export interface CancelContractDto {
  reason?: string;             // optional, max 2000 chars
}

/** Raw shape from GET /contracts/:id/rejections. */
export interface BackendContractRejection {
  id: string;
  contractId: string;
  rejectedByUserId: string;
  type: 'DEFINITIVE' | 'MODIFICATIONS';
  reason: string;
  createdAt: string;
  rejectedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/** De dónde salió cada valor del régimen. Lo decide el back. */
export type OrigenDelValorTributario =
  | 'CONTRATO'
  | 'PROPIETARIO'
  | 'TIPO_DE_INMUEBLE'
  | 'SIN_DEFINIR';

export interface ValorTributarioResuelto {
  valor: boolean | null;
  origen: OrigenDelValorTributario;
}

export interface RegimenTributarioDelContrato {
  usoComercial: ValorTributarioResuelto;
  arrendadorResponsableIva: ValorTributarioResuelto;
  inquilinoRetenedorRenta: ValorTributarioResuelto;
  inquilinoRetenedorIva: ValorTributarioResuelto;
  inquilinoRetenedorIca: ValorTributarioResuelto;
}
