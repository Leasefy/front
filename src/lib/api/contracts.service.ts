/**
 * Contracts API service
 * Endpoints for creating, signing, and managing rental contracts
 */

import { apiClient, getAccessToken, ApiError } from './client';
import type {
  BackendContract,
  CreateContractDto,
  SignContractDto,
  UploadContractPdfResponse,
  ContractPreview,
  ContractSignedPdf,
  UpdateContractDto,
  RejectContractDto,
  CancelContractDto,
  BackendContractRejection,
  SendOtpDto,
  SendOtpResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from './contracts.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
import type { Contract, ContractType, ContractStatus, SignatureStatus, ContractRejection } from '@/lib/types/contract';
import type { ContractAuditEvent, ContractAuditEventType, ContractAuditEventMetadata } from '@/lib/types/contract';

// ============================================================================
// Status mapping (UPPERCASE backend -> lowercase frontend)
// ============================================================================

const CONTRACT_STATUS_MAP: Record<string, ContractStatus> = {
  DRAFT: 'draft',
  PENDING_LANDLORD: 'pending_landlord',
  PENDING_LANDLORD_SIGNATURE: 'pending_landlord',
  PENDING_TENANT: 'pending_tenant',
  PENDING_TENANT_SIGNATURE: 'pending_tenant',
  REJECTED_PENDING_MODIFICATIONS: 'rejected_pending_modifications',
  SIGNED: 'signed',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

const CONTRACT_TYPE_MAP: Record<string, ContractType> = {
  BASICO: 'basico',
  AMOBLADO: 'amoblado',
  COMPARTIDO: 'compartido',
  CUSTOM: 'custom',
};

const SIGNATURE_STATUS_MAP: Record<string, SignatureStatus> = {
  PENDING: 'pending',
  SIGNED: 'signed',
};

const AUDIT_TYPE_MAP: Record<string, ContractAuditEventType> = {
  CREATED: 'created',
  SENT_TO_LANDLORD: 'sent_to_landlord',
  LANDLORD_SIGNED: 'landlord_signed',
  SENT_TO_TENANT: 'sent_to_tenant',
  TENANT_SIGNED: 'tenant_signed',
  ACTIVATED: 'activated',
};

// ============================================================================
// Mapper
// ============================================================================

function mapBackendContract(bc: BackendContract): Contract {
  return {
    id: bc.id,
    applicationId: bc.applicationId,
    propertyId: bc.propertyId,
    tenantId: bc.tenantId,
    landlordId: bc.landlordId,
    // Deprecated: backend no modela template/type. Solo para compat del tipo.
    templateId: bc.templateId ?? '',
    type: (bc.type ? (CONTRACT_TYPE_MAP[bc.type] ?? bc.type) : 'custom') as ContractType,
    status: (CONTRACT_STATUS_MAP[bc.status] ?? bc.status) as ContractStatus,
    // Snapshot fields — pueden venir null en contratos legacy.
    propertyAddress: bc.propertyAddress ?? '',
    propertyCity: bc.propertyCity ?? '',
    tenantName: bc.tenantName ?? '',
    tenantEmail: bc.tenantEmail ?? '',
    tenantPhone: bc.tenantPhone ?? '',
    tenantDocument: bc.tenantDocument ?? '',
    landlordName: bc.landlordName ?? '',
    landlordEmail: bc.landlordEmail ?? '',
    landlordDocument: bc.landlordDocument ?? '',
    monthlyRent: bc.monthlyRent,
    adminFee: bc.propertyAdminFee ?? 0,              // backend: propertyAdminFee → front: adminFee
    startDate: bc.startDate,
    endDate: bc.endDate,
    paymentDueDay: bc.paymentDay,                    // backend: paymentDay → front: paymentDueDay
    // Deprecated: garantías no modeladas en backend todavía.
    guaranteeType: (bc.guaranteeType ?? 'poliza') as 'poliza' | 'codeudor',
    guaranteeDetails: bc.guaranteeDetails,
    landlordSignature: bc.landlordSignature
      ? {
          signedAt: bc.landlordSignature.signedAt,
          signedBy: bc.landlordSignature.signedBy,
          signerId: bc.landlordSignature.signerId,
          ipAddress: bc.landlordSignature.ipAddress,
          userAgent: bc.landlordSignature.userAgent,
          status: (SIGNATURE_STATUS_MAP[bc.landlordSignature.status] ?? bc.landlordSignature.status) as SignatureStatus,
          otpVerified: bc.landlordSignature.otpVerified,
          otpVerifiedAt: bc.landlordSignature.otpVerifiedAt,
        }
      : null,
    tenantSignature: bc.tenantSignature
      ? {
          signedAt: bc.tenantSignature.signedAt,
          signedBy: bc.tenantSignature.signedBy,
          signerId: bc.tenantSignature.signerId,
          ipAddress: bc.tenantSignature.ipAddress,
          userAgent: bc.tenantSignature.userAgent,
          status: (SIGNATURE_STATUS_MAP[bc.tenantSignature.status] ?? bc.tenantSignature.status) as SignatureStatus,
          otpVerified: bc.tenantSignature.otpVerified,
          otpVerifiedAt: bc.tenantSignature.otpVerifiedAt,
        }
      : null,
    nonNegotiableClauses: bc.nonNegotiableClauses,
    specialConditions: bc.specialConditions,
    contractOrigin: bc.contractOrigin,
    uploadedPdfPath: bc.uploadedPdfPath,
    insuranceTier: bc.insuranceTier,
    customClauses: bc.customClauses,
    createdAt: bc.createdAt,
    updatedAt: bc.updatedAt,
    signedAt: bc.signedAt ?? null,
    activatedAt: bc.activatedAt ?? null,
    auditTrail: (bc.auditTrail ?? []).map((ae) => ({
      id: ae.id,
      contractId: ae.contractId,
      type: (AUDIT_TYPE_MAP[ae.type] ?? ae.type) as ContractAuditEventType,
      timestamp: ae.timestamp,
      metadata: ae.metadata as ContractAuditEventMetadata,
    })),
    documentHash: bc.documentHash,
  };
}

// ============================================================================
// Service
// ============================================================================

export const contractsApi = {
  /** GET /contracts - list user's contracts */
  async getMine(): Promise<Contract[]> {
    const raw = await apiClient.get<BackendContract[]>('/contracts');
    return raw.map(mapBackendContract);
  },

  /** GET /contracts/:id - get single contract */
  async getById(id: string): Promise<Contract> {
    const raw = await apiClient.get<BackendContract>(`/contracts/${id}`);
    return mapBackendContract(raw);
  },

  /**
   * GET /contracts/by-application/:applicationId — returns the contract tied
   * to the given application, or null if none exists.
   */
  async getByApplicationId(applicationId: string): Promise<Contract | null> {
    const raw = await apiClient.get<BackendContract | null>(
      `/contracts/by-application/${applicationId}`
    );
    return raw ? mapBackendContract(raw) : null;
  },

  /**
   * POST /contracts/upload-pdf — upload a landlord-provided PDF.
   * Returns the storage path that must be passed as `uploadedPdfPath` to `create()`.
   */
  async uploadPdf(file: File): Promise<UploadContractPdfResponse> {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/contracts/upload-pdf`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      throw new ApiError(0, `No pudimos conectarnos al servidor. ${raw}`);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, (body as { message?: string }).message || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  /** POST /contracts - create a new contract (from an APPROVED application) */
  /**
   * Migrar contratos que ya existían fuera de Leasefy.
   *
   * Devuelve el resumen aunque haya filas fallidas: una importación de 1.200
   * contratos donde falla la 300 no puede tirar las 1.199 restantes. Por eso
   * NO lanza — el resultado se lee, no se atrapa.
   */
  async migrar(contratos: ContratoAMigrar[]): Promise<ResumenMigracion> {
    return apiClient.post<ResumenMigracion>('/contracts/migrar', { contratos });
  },

  async create(dto: CreateContractDto): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>('/contracts', dto);
    return mapBackendContract(raw);
  },

  /**
   * GET /contracts/:id/preview — returns either the generated HTML or a signed
   * URL to the uploaded PDF depending on the contract origin. Úselo para
   * renderizar el contrato en UI (iframe o HTML inline).
   */
  async getPreview(id: string): Promise<ContractPreview> {
    return apiClient.get<ContractPreview>(`/contracts/${id}/preview`);
  },

  /**
   * GET /contracts/:id/pdf — signed URL al PDF actual (válido 1h). Funciona en
   * cualquier estado del contrato. Úselo para el botón "Descargar PDF".
   */
  async getSignedPdfUrl(id: string): Promise<ContractSignedPdf> {
    return apiClient.get<ContractSignedPdf>(`/contracts/${id}/pdf`);
  },

  /** POST /contracts/:id/send - send a DRAFT contract into the signing flow (→ PENDING_LANDLORD_SIGNATURE) */
  async send(id: string): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/send`, {});
    return mapBackendContract(raw);
  },

  /** POST /contracts/:id/sign/landlord - landlord's digital signature (→ PENDING_TENANT_SIGNATURE) */
  async signAsLandlord(id: string, dto: SignContractDto): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/sign/landlord`, dto);
    return mapBackendContract(raw);
  },

  /** POST /contracts/:id/sign/tenant - tenant's digital signature (→ SIGNED, PDF generated) */
  async signAsTenant(id: string, dto: SignContractDto): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/sign/tenant`, dto);
    return mapBackendContract(raw);
  },

  /** POST /contracts/:id/activate - activate a SIGNED contract (→ ACTIVE, starts the lease) */
  async activate(id: string): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/activate`);
    return mapBackendContract(raw);
  },

  /**
   * POST /contracts/:id/remind — re-sends the pending-signature notification.
   * Rate-limited to 1 per 24h. Returns `{ remindedAt, nextAllowedAt }`.
   * Throws on 429 (too soon since last reminder).
   */
  async remind(id: string): Promise<{ remindedAt: string; nextAllowedAt: string }> {
    return apiClient.post(`/contracts/${id}/remind`, {});
  },

  /**
   * PATCH /contracts/:id — landlord edits terms and/or swaps PDF.
   * Invalidates landlord signature if there was one; contract returns to PENDING_LANDLORD_SIGNATURE.
   * Landlord must call signAsLandlord again after editing.
   */
  async update(id: string, dto: UpdateContractDto): Promise<Contract> {
    const raw = await apiClient.patch<BackendContract>(`/contracts/${id}`, dto);
    return mapBackendContract(raw);
  },

  /**
   * POST /contracts/:id/reject — tenant rejects while in PENDING_TENANT_SIGNATURE.
   * type=DEFINITIVE → CANCELLED + application CONTRACT_FAILED.
   * type=MODIFICATIONS → REJECTED_PENDING_MODIFICATIONS, awaits landlord edit.
   */
  async rejectAsTenant(id: string, dto: RejectContractDto): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/reject`, dto);
    return mapBackendContract(raw);
  },

  /**
   * POST /contracts/:id/cancel — either party, any pre-signed state.
   * Contract → CANCELLED, application → CONTRACT_FAILED.
   */
  async cancel(id: string, dto: CancelContractDto = {}): Promise<Contract> {
    const raw = await apiClient.post<BackendContract>(`/contracts/${id}/cancel`, dto);
    return mapBackendContract(raw);
  },

  /** GET /contracts/:id/rejections — rejection history, newest first. */
  async getRejections(id: string): Promise<ContractRejection[]> {
    const raw = await apiClient.get<BackendContractRejection[]>(`/contracts/${id}/rejections`);
    return raw.map(mapBackendContractRejection);
  },

  /**
   * POST /contracts/:id/otp/send — envía código OTP por email al signer (tenant o landlord).
   * Rate-limited (1 send/60s). Lanza 429 si se llama antes del cooldown.
   */
  async sendOtp(id: string, dto: SendOtpDto): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>(`/contracts/${id}/otp/send`, dto);
  },

  /**
   * POST /contracts/:id/otp/verify — valida el código y devuelve el verificationToken.
   * Ese token hay que pasarlo como `otpVerificationToken` al firmar.
   * Lanza 400 con message descriptivo si código inválido/expirado/max intentos.
   */
  async verifyOtp(id: string, dto: VerifyOtpDto): Promise<VerifyOtpResponse> {
    return apiClient.post<VerifyOtpResponse>(`/contracts/${id}/otp/verify`, dto);
  },
};

function mapBackendContractRejection(br: BackendContractRejection): ContractRejection {
  return {
    id: br.id,
    contractId: br.contractId,
    rejectedByUserId: br.rejectedByUserId,
    type: br.type,
    reason: br.reason,
    createdAt: br.createdAt,
    rejectedBy: br.rejectedBy,
  };
}

// ============================================================================
// Migración de cartera
// ============================================================================

export interface ContratoAMigrar {
  propertyId: string;
  inquilino: {
    nombre: string;
    correo: string;
    telefono?: string;
    documento?: string;
  };
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit?: number;
  paymentDay: number;
  /** Sin esto no se puede liquidar: vivienda va sin IVA, comercial con IVA. */
  usoInmueble: 'VIVIENDA' | 'COMERCIAL';
  periodicidad?: 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  comisionPorcentaje?: number;
  /** Por defecto true: el inquilino migrado sigue usando su portal. */
  invitar?: boolean;
}

export interface ResultadoDeFila {
  /** Índice en el archivo, para señalar la fila real que hay que corregir. */
  fila: number;
  estado: 'creado' | 'omitido' | 'fallido';
  contratoId?: string;
  inquilinoInvitado: boolean;
  motivo?: string;
}

export interface ResumenMigracion {
  total: number;
  creados: number;
  omitidos: number;
  fallidos: number;
  invitados: number;
  resultados: ResultadoDeFila[];
}
