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

/**
 * Un `Decimal` de Prisma llega por JSON como string ("10.00"), no como número.
 * Devolver el string haría que la pantalla compare textos: "9" > "10" es true.
 */
function aNumero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

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
    usoInmueble: bc.usoInmueble ?? null,
    periodicidad: bc.periodicidad ?? null,
    // Decimal de Prisma: viaja como string ("10.00"). Sin esto, `12 > 10`
    // compara textos y un 9% saldría mayor que un 10%.
    comisionPorcentaje: aNumero(bc.comisionPorcentaje),
    comisionDeConsignacion: aNumero(bc.comisionDeConsignacion),
    // Quién retiene qué. Puede faltar en respuestas viejas: null significa
    // «no vino», y la pantalla cae a los perfiles por defecto diciéndolo.
    perfilesTributarios: bc.perfilesTributarios ?? null,
    inquilinoTipoPersona: bc.inquilinoTipoPersona ?? null,
    inquilinoResponsableIva: bc.inquilinoResponsableIva ?? null,
    inquilinoRetenedorRenta: bc.inquilinoRetenedorRenta ?? null,
    inquilinoRetenedorIva: bc.inquilinoRetenedorIva ?? null,
    inquilinoRetenedorIca: bc.inquilinoRetenedorIca ?? null,
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
   * Migración de cartera: **preparar → resolver → activar**.
   *
   * Tres pasos y no uno, porque un import que crea o falla obliga a corregir
   * el Excel y volver a subirlo por cada dato que falte — y en 1.200 contratos
   * siempre falta algo.
   */
  migracion: {
    /**
     * 1. Deja las filas listas para revisar. NO crea contratos.
     *
     * Encola un job — `202` con `EstadoDeLote`, no `201` con `ResumenLote`
     * (contrato §3.2.A). El `lote` de la respuesta es SIEMPRE del servidor.
     *
     * `idempotencyKey` es lo que hace que un doble click o un reintento tras
     * una conexión caída no dupliquen el lote: la MISMA fila del archivo,
     * dos veces, cae en el mismo lote. Se genera una vez por archivo leído
     * (ver `generarIdempotencyKey` en `MigrarContratos.tsx`) y se reusa en
     * cada reintento de ESE archivo.
     *
     * `lote` sigue existiendo en el request a propósito (§11-J5 del
     * contrato): el back lo acepta e ignora, para que un front viejo que
     * todavía lo manda no choque contra `forbidNonWhitelisted`. Este front
     * ya no genera un id acá — lo hacía colisionar entre dos archivos
     * parecidos (N2).
     */
    async preparar(contratos: FilaAMigrar[], idempotencyKey?: string): Promise<EstadoDeLote> {
      return apiClient.post<EstadoDeLote>('/contracts/migrar/preparar', {
        contratos,
        lote: undefined,
        idempotencyKey,
      });
    },

    /**
     * 2. La lista de trabajo, por página: qué quedó pendiente y por qué.
     *
     * `total` viene del back, NO del largo de `filas`: con páginas de 50 y
     * 1.200 pendientes, medirlo por lo recibido diría «quedan 50» para siempre.
     */
    async filas(
      lote?: string,
      opciones?: { pagina?: number; porPagina?: number; estado?: EstadoMigracion },
    ): Promise<PaginaDeFilas> {
      const q = new URLSearchParams();
      if (lote) q.set('lote', lote);
      if (opciones?.pagina) q.set('pagina', String(opciones.pagina));
      if (opciones?.porPagina) q.set('porPagina', String(opciones.porPagina));
      if (opciones?.estado) q.set('estado', opciones.estado);
      const qs = q.toString();
      return apiClient.get<PaginaDeFilas>(
        `/contracts/migrar/filas${qs ? `?${qs}` : ''}`,
      );
    },

    /**
     * 2-bis. Aplicar la misma resolución a muchas filas.
     *
     * Devuelve qué falló y por qué, fila por fila. Doscientos contratos del
     * mismo propietario no pueden costar doscientas veces el mismo nombre.
     */
    async resolverMasivo(
      ids: string[],
      cambios: {
        usoInmueble?: 'VIVIENDA' | 'COMERCIAL';
        propietario?: {
          nombre: string;
          documento: string;
          correo?: string;
          telefono?: string;
          comisionPorcentaje?: number;
        };
        /** El bulk exit de N12 (contract.md §3.2.B5). */
        paymentDay?: number;
      },
    ): Promise<ResultadoMasivo> {
      return apiClient.patch<ResultadoMasivo>('/contracts/migrar/filas', {
        ids,
        ...cambios,
      });
    },

    async resumen(lote?: string): Promise<ResumenLote> {
      const q = lote ? `?lote=${encodeURIComponent(lote)}` : '';
      return apiClient.get<ResumenLote>(`/contracts/migrar/resumen${q}`);
    },

    /**
     * Los lotes a medio migrar. Sin esto, recargar la pantalla borraba la
     * lista de trabajo y la única forma de volver era subir el archivo otra
     * vez — duplicando las 1.200 filas.
     */
    async lotesAbiertos(): Promise<LoteAbierto[]> {
      return apiClient.get<LoteAbierto[]>('/contracts/migrar/lotes');
    },

    /** Corregir una fila. Pasa sola a LISTO cuando ya no le falta nada. */
    async resolver(id: string, cambios: CambiosDeFila): Promise<FilaDeMigracion> {
      return apiClient.patch<FilaDeMigracion>(`/contracts/migrar/filas/${id}`, cambios);
    },

    /** Crear el inmueble que el contrato dice tener y no está cargado. */
    async crearInmueble(
      id: string,
      datos: { address: string; city: string; neighborhood?: string },
    ): Promise<FilaDeMigracion> {
      return apiClient.post<FilaDeMigracion>(
        `/contracts/migrar/filas/${id}/inmueble`,
        datos,
      );
    },

    /** Registrar al propietario y consignar. Sin esto no se genera un cobro. */
    async registrarPropietario(
      id: string,
      datos: {
        nombre: string;
        documento: string;
        correo?: string;
        telefono?: string;
        comisionPorcentaje?: number;
      },
    ): Promise<FilaDeMigracion> {
      return apiClient.post<FilaDeMigracion>(
        `/contracts/migrar/filas/${id}/propietario`,
        datos,
      );
    },

    async descartar(id: string): Promise<FilaDeMigracion> {
      return apiClient.delete<FilaDeMigracion>(`/contracts/migrar/filas/${id}`);
    },

    /** 3. Convierte en contratos las filas LISTO. Sólo esas. */
    async activar(lote?: string, invitar = true): Promise<ResumenActivacion> {
      return apiClient.post<ResumenActivacion>('/contracts/migrar/activar', {
        lote,
        invitar,
      });
    },
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

  /** Lo que el contrato cobra además del canon. */
  async conceptos(id: string): Promise<ConceptoDelContrato[]> {
    return apiClient.get<ConceptoDelContrato[]>(`/contracts/${id}/conceptos`);
  },

  async agregarConcepto(
    id: string,
    dto: Omit<ConceptoDelContrato, 'id'>,
  ): Promise<ConceptoDelContrato> {
    return apiClient.post<ConceptoDelContrato>(`/contracts/${id}/conceptos`, dto);
  },

  async quitarConcepto(id: string, conceptoId: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(
      `/contracts/${id}/conceptos/${conceptoId}`,
    );
  },

  /**
   * PATCH /contracts/:id/administracion — uso, periodicidad y comisión.
   *
   * Ruta aparte de `update` a propósito: aquélla invalida las firmas y sólo
   * corre sobre borradores. Ninguno de estos tres viaja en el documento
   * firmado, y un contrato migrado nace ACTIVE.
   *
   * Cambiar la comisión también la escribe en la consignación, que es de donde
   * sale la plata del propietario.
   */
  async actualizarAdministracion(
    id: string,
    dto: {
      usoInmueble?: 'VIVIENDA' | 'COMERCIAL';
      periodicidad?: 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
      comisionPorcentaje?: number;
      /*
       * El perfil tributario del inquilino. `null` es una acción —«volvé a no
       * saberlo»— y no lo mismo que no mandar el campo, que lo deja como está.
       */
      inquilinoTipoPersona?: 'NATURAL' | 'JURIDICA' | null;
      inquilinoResponsableIva?: boolean | null;
      inquilinoRetenedorRenta?: boolean | null;
      inquilinoRetenedorIva?: boolean | null;
      inquilinoRetenedorIca?: boolean | null;
    },
  ): Promise<Contract> {
    const raw = await apiClient.patch<BackendContract>(
      `/contracts/${id}/administracion`,
      dto,
    );
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

/**
 * Una fila del archivo, como viene. La dirección, no nuestro uuid.
 *
 * Casi todo es opcional A PROPÓSITO, igual que en `MigrarContratoDto`
 * (`back/src/contracts/dto/migrar-contrato.dto.ts`): el archivo del owner
 * puede no traer una columna, y lo que falta se manda ausente, nunca un
 * default inventado (`armar-fila.ts` es donde se decide eso). `direccion` e
 * `inquilino` son la excepción — el DTO los exige siempre presentes, aunque
 * vacíos.
 */
export interface FilaAMigrar {
  direccion: string;
  inquilino: { nombre: string; correo: string; telefono?: string; documento?: string };
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  deposit?: number;
  paymentDay?: number;
  /** Sin esto no se puede liquidar: vivienda va sin IVA, comercial con IVA. */
  usoInmueble?: 'VIVIENDA' | 'COMERCIAL';
  periodicidad?: 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  comisionPorcentaje?: number;
}

export type EstadoMigracion = 'PENDIENTE' | 'LISTO' | 'ACTIVADO' | 'DESCARTADO';

/**
 * Qué le falta a una fila para poder activarse.
 *
 * Cada uno tiene su propia salida en pantalla: no alcanza con decir que "algo
 * falta", porque lo que se hace para resolverlo es distinto en cada caso.
 */
export type Faltante =
  | 'inmueble'
  | 'inmueble_ambiguo'
  | 'inmueble_ocupado'
  | 'propietario'
  | 'inquilino_correo'
  | 'inquilino_nombre'
  | 'fechas'
  | 'canon'
  | 'uso'
  | 'dia_de_pago';

export interface InmuebleCandidato {
  id: string;
  address: string;
  city: string | null;
  ocupado?: boolean;
}

export interface FilaDeMigracion {
  id: string;
  lote: string;
  /** Índice en el archivo, para señalar la línea real que hay que corregir. */
  fila: number;
  datos: FilaAMigrar;
  propertyId: string | null;
  propietarioId: string | null;
  tenantId: string | null;
  candidatos: InmuebleCandidato[];
  estado: EstadoMigracion;
  faltantes: Faltante[];
  contractId: string | null;
  /**
   * Decisiones explícitas del usuario que anulan un chequeo automático.
   * Ausente/`undefined` se trata como `[]` — nunca indexar sin default
   * (contract.md §3.2.B6). Hoy el único valor posible es
   * `'inmueble_ocupado'`.
   */
  overrides?: string[];
}

export interface CambiosDeFila {
  propertyId?: string;
  inquilinoCorreo?: string;
  inquilinoNombre?: string;
  usoInmueble?: 'VIVIENDA' | 'COMERCIAL';
  monthlyRent?: number;
  startDate?: string;
  endDate?: string;
  paymentDay?: number;
  /** "Sé que está ocupado, seguir igual" — contract.md §3.2.B4/J7. */
  permitirInmuebleOcupado?: boolean;
}

/**
 * Un concepto que el contrato cobra además del canon.
 *
 * `nombre` y `base` son una COPIA del catálogo al momento de agregarlo, no una
 * referencia: el catálogo se va a limpiar con la inmobiliaria, y un contrato
 * firmado no puede cambiar de tratamiento tributario porque alguien renombró
 * una fila.
 */
export interface ConceptoDelContrato {
  id: string;
  conceptoId: string;
  nombre: string;
  base: 'ARRENDAMIENTO' | 'COMISION' | 'SERVICIO_GRAVADO' | 'NO_GRAVADO';
  paga: 'INQUILINO' | 'PROPIETARIO' | 'INMOBILIARIA' | 'TERCERO';
  recibe: 'INQUILINO' | 'PROPIETARIO' | 'INMOBILIARIA' | 'TERCERO';
  valorCop: number;
  /** Si entra en el cobro de cada mes. Falso = una sola vez. */
  recurrente: boolean;
}

/** Un lote a medio migrar, para poder retomarlo. */
export interface LoteAbierto {
  lote: string;
  pendientes: number;
  listos: number;
}

export interface PaginaDeFilas {
  filas: FilaDeMigracion[];
  /** Cuántas hay en total con este filtro — NO el largo de `filas`. */
  total: number;
  pagina: number;
  porPagina: number;
}

/** Qué pasó con cada fila de una resolución masiva, una por una. */
export interface ResultadoMasivo {
  pedidas: number;
  aplicadas: number;
  fallidas: Array<{ id: string; fila: number | null; motivo: string }>;
}

export interface ResumenLote {
  lote: string | null;
  total: number;
  pendientes: number;
  listos: number;
  activados: number;
  descartados: number;
}

export type EstadoLoteMigracion = 'ENCOLADO' | 'PROCESANDO' | 'LISTO' | 'FALLIDO';

/**
 * Superset estructural de `ResumenLote` — mismos nombres y significado en
 * `total/pendientes/listos/activados/descartados` (contrato §3.2.A2), a
 * propósito: es lo que hace que un front viejo no reviente al recibir esta
 * forma en vez de `ResumenLote`, aunque quede mostrando un lote vacío.
 *
 * `POST /contracts/migrar/preparar` devuelve esto con `202`. El `lote` es
 * SIEMPRE del servidor — el id armado en el cliente (`lote-${filas.length}-…`)
 * podía colisionar entre dos archivos parecidos.
 */
export interface EstadoDeLote {
  lote: string;
  estado: EstadoLoteMigracion;
  total: number;
  procesadas: number;
  pendientes: number;
  listos: number;
  activados: number;
  descartados: number;
  /** Sólo diagnóstico — nunca condicionar comportamiento a esto. */
  jobId?: string | null;
  /** Sólo cuando `estado === 'FALLIDO'`. Español, para mostrar tal cual. */
  error?: string | null;
  creadoEn?: string;
}

export interface ResultadoDeFila {
  fila: number;
  estado: 'creado' | 'fallido';
  contratoId?: string;
  inquilinoInvitado: boolean;
  motivo?: string;
}

export interface ResumenActivacion {
  intentadas: number;
  activadas: number;
  fallidas: number;
  invitados: number;
  resultados: ResultadoDeFila[];
}
