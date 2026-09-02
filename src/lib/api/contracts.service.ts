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
import type { CobroConDesglose } from './recibos-de-caja.types';
import { normalizeCobro } from './inmobiliaria.service';
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

/**
 * Exportado (T-0036 contract.md §3.2.B6) — la pantalla del detalle de
 * contrato lo llama directo sobre `res.contrato` después de invitar al
 * inquilino, sin pasar por un segundo `getById`. `invitarInquilino()` de
 * abajo devuelve el `ResultadoInvitacion` CRUDO (sin mapear `contrato`)
 * porque `invitado`/`tenantId` viajan junto a él y no hay un segundo shape.
 */
export function mapBackendContract(bc: BackendContract): Contract {
  return {
    id: bc.id,
    applicationId: bc.applicationId,
    propertyId: bc.propertyId,
    tenantId: bc.tenantId,
    landlordId: bc.landlordId,
    // T-0040 — passthrough puro. NADA de `?? 0`, `?? null` ni `Number(...)`:
    // `undefined` tiene que sobrevivir el mapper para que la opcionalidad del
    // tipo signifique algo, y un `0` coalescido sería un código válido a la
    // vista (los códigos arrancan en 1).
    code: bc.code,
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
    // Un back anterior a esta rama no los manda: el default es el del esquema.
    prorratearPrimerMes: bc.prorratearPrimerMes ?? false,
    diasDePlazo: bc.diasDePlazo ?? null,
    usoInmueble: bc.usoInmueble ?? null,
    periodicidad: bc.periodicidad ?? null,
    // Decimal de Prisma: viaja como string ("10.00"). Sin esto, `12 > 10`
    // compara textos y un 9% saldría mayor que un 10%.
    comisionPorcentaje: aNumero(bc.comisionPorcentaje),
    comisionDeConsignacion: aNumero(bc.comisionDeConsignacion),
    // Quién retiene qué. Puede faltar en respuestas viejas: null significa
    // «no vino», y la pantalla cae a los perfiles por defecto diciéndolo.
    perfilesTributarios: bc.perfilesTributarios ?? null,
    // Ya resuelto por el back, con el origen de cada valor. `null` = respuesta
    // vieja, y la pantalla lo dice en vez de inventar el efectivo.
    regimenTributario: bc.regimenTributario ?? null,
    arrendadorResponsableIva: bc.arrendadorResponsableIva ?? null,
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
   * PATCH /contracts/:id/inmueble — vincula un inmueble a un contrato
   * migrado que se activó sin uno (T-0033 contract.md §3.2.D2). Sólo llena
   * un `propertyId` nulo — no existe "desvincular". Devuelve el mismo shape
   * que `getById`, así que reusa `mapBackendContract` sin un segundo mapper.
   */
  async asignarInmueble(id: string, propertyId: string): Promise<Contract> {
    const raw = await apiClient.patch<BackendContract>(
      `/contracts/${id}/inmueble`,
      { propertyId },
    );
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

    /**
     * "Seleccionar las {total} del lote" (contract.md §3.2.G1) — todos los
     * ids de un lote, en el MISMO orden que `filas()`, para que el front los
     * troceé en `CHUNK_MASIVA = 100` y se los mande a `resolverMasivo` sin
     * traer el `datos` JSON completo de cada fila. `lote` es obligatorio: un
     * volcado de ids de toda la agencia no es un flujo de trabajo.
     */
    async idsDeFilas(lote: string, estado?: EstadoMigracion): Promise<IdsDeFilas> {
      const q = new URLSearchParams({ lote });
      if (estado) q.set('estado', estado);
      return apiClient.get<IdsDeFilas>(`/contracts/migrar/filas/ids?${q.toString()}`);
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

    /**
     * 1-bis. El estado de UN lote — contrato §3.2.A2. Misma forma que el
     * `202` de `preparar()`; ésta es la ruta que se sondea mientras
     * `estado ∈ {ENCOLADO, PROCESANDO}` (§11-J9: cada 3s, techo de 10min).
     * El sondeo es una conveniencia mientras la pestaña sigue abierta —
     * nunca el mecanismo de finalización (`use-estado-de-lote.ts`).
     */
    async estadoDeLote(lote: string): Promise<EstadoDeLote> {
      return apiClient.get<EstadoDeLote>(`/contracts/migrar/lotes/${encodeURIComponent(lote)}`);
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

    /**
     * Corregir a quién quedó consignada la fila, y con qué comisión.
     *
     * Distinto de `registrarPropietario`: aquél hace el PRIMER enlace desde
     * el nombre y el documento del archivo; éste corrige uno que ya existe y
     * quedó mal. Por eso el propietario viaja como **id de una ficha
     * elegida** — escribir un nombre distinto encima de uno equivocado sólo
     * crea una tercera ficha.
     */
    async corregirPropietario(
      id: string,
      cambios: { propietarioId?: string; comisionPorcentaje?: number },
    ): Promise<FilaDeMigracion> {
      return apiClient.patch<FilaDeMigracion>(
        `/contracts/migrar/filas/${id}/propietario`,
        cambios,
      );
    },

    async descartar(id: string): Promise<FilaDeMigracion> {
      return apiClient.delete<FilaDeMigracion>(`/contracts/migrar/filas/${id}`);
    },

    /**
     * Descarta un lote entero de una sola vez (contract.md §3.2.C). El
     * `lote` se codifica igual que `estadoDeLote` — los lotes generados
     * antes de que el servidor los emitiera no están garantizados URL-safe.
     */
    async descartarLote(lote: string): Promise<DescarteDeLote> {
      return apiClient.delete<DescarteDeLote>(
        `/contracts/migrar/lotes/${encodeURIComponent(lote)}`,
      );
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
   * POST /contracts/:id/invitar-inquilino — invita (o vincula) al inquilino
   * de un contrato migrado que se activó sin uno (T-0036 contract.md §3.2.B).
   * Sin body — el back no lo espera (§0.2 no aplica: no hay DTO en esta
   * tarea). Devuelve el wire CRUDO — `contrato` es `BackendContract` sin
   * mapear, porque `invitado`/`tenantId` viajan junto a él y no hay un
   * segundo shape. El caller mapea con `mapBackendContract(res.contrato)`.
   */
  async invitarInquilino(id: string): Promise<ResultadoInvitacion> {
    return apiClient.post<ResultadoInvitacion>(`/contracts/${id}/invitar-inquilino`, {});
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
   * GET /contracts/:id/cobros — los cobros que este contrato ha generado, con
   * su desglose (canon, administración, conceptos, impuestos, mora) y los
   * recibos de caja vivos. Más reciente primero.
   *
   * Un cobro sabe su contrato por `Cobro.contractId`; los anteriores a esa
   * columna se rellenaron por el arriendo o por el inmueble.
   */
  async cobros(id: string): Promise<CobroConDesglose[]> {
    const rows = await apiClient.get<CobroConDesglose[] | { data: CobroConDesglose[] }>(
      `/contracts/${id}/cobros`,
    );
    const lista = Array.isArray(rows) ? rows : rows.data;
    return lista.map(normalizeCobro);
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
      /**
       * Quién GENERA el IVA es el arrendador (el propietario); quién RETIENE
       * es el inquilino. `null` = volver a heredar de la ficha del propietario.
       */
      arrendadorResponsableIva?: boolean | null;
      inquilinoTipoPersona?: 'NATURAL' | 'JURIDICA' | null;
      inquilinoResponsableIva?: boolean | null;
      inquilinoRetenedorRenta?: boolean | null;
      inquilinoRetenedorIva?: boolean | null;
      inquilinoRetenedorIca?: boolean | null;
      /**
       * Términos de cobro. `diasDePlazo: null` = volver a heredar los de la
       * inmobiliaria. La mora corre desde el día de pago + plazo.
       */
      diasDePlazo?: number | null;
      prorratearPrimerMes?: boolean;
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
  /**
   * El propietario que trae el archivo. Con documento, el back consigna el
   * inmueble apenas lo resuelve — la fila no vuelve a pedir lo que el
   * archivo ya dijo, ni siquiera si la persona recarga a mitad.
   */
  propietario?: { nombre?: string; documento?: string; correo?: string; telefono?: string };
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
   * A QUIÉN quedó consignado el inmueble de esta fila, con nombre.
   *
   * `propietarioId` solo no alcanza para revisar nada: un uuid no dice si el
   * contrato de la señora del 802 quedó pegado a su propietario o al del
   * 1003. Lo arma el back en la misma consulta de la página (nunca una
   * petición por fila). `null` = todavía sin consignar.
   */
  propietario?: { id: string; nombre: string; documento: string } | null;
  /**
   * El % que se le cobra al propietario, **el de la consignación** — que es
   * el que efectivamente va a facturar, no el que traía el archivo.
   */
  comisionPorcentaje?: number | null;
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

/**
 * Un lote a medio migrar, para poder retomarlo.
 *
 * F1 (contract.md §3.2.A3, §5 P10) — `estado`/`total`/`creadoEn` son
 * **opcionales, nuevos**: un lote anterior a T-0031 no tiene fila
 * `MigracionLote` y legítimamente los omite (`lotesAbiertos()` hace
 * left-join). Ausencia ⇒ el front asume `estado: 'LISTO'` (ya no encolado,
 * simplemente sin `MigracionLote` que lo diga) y `total` cae a
 * `pendientes + listos`.
 */
export interface LoteAbierto {
  lote: string;
  pendientes: number;
  listos: number;
  /**
   * T-0035 (contract.md T-0035 §1) — misma proyección y misma razón de ser
   * que `ResumenLote.activables`. La tarjeta "Tenés una migración sin
   * terminar" debe leer ESTE campo para decidir qué mostrar, nunca `listos`
   * solo — mirar `listos` es exactamente el bug que dejaba invisible un
   * lote de 1.365 filas sin inmueble bajo el modo sparse.
   */
  activables: number;
  estado?: EstadoLoteMigracion;
  total?: number;
  creadoEn?: string;
}

export interface PaginaDeFilas {
  filas: FilaDeMigracion[];
  /** Cuántas hay en total con este filtro — NO el largo de `filas`. */
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * `GET migrar/filas/ids` (contract.md §3.2.G1) — los ids de todo un lote, en
 * el MISMO orden que `filas()`, para "seleccionar las {total} del lote" sin
 * traer el `datos` JSON completo de cada fila.
 */
export interface IdsDeFilas {
  ids: string[];
  /** El total real que matchea el filtro — `=== ids.length` salvo `truncado`. */
  total: number;
  /** `true` cuando el lote superó el tope del back y `ids` quedó recortado.
   *  Ausente ⇒ se trata como `false` (back viejo). */
  truncado?: boolean;
}

/** Qué pasó con cada fila de una resolución masiva, una por una. */
export interface ResultadoMasivo {
  pedidas: number;
  aplicadas: number;
  fallidas: Array<{ id: string; fila: number | null; motivo: string }>;
  /**
   * Filas saltadas por una razón estructural que reintentar no arregla
   * (contract.md §3.2.G3) — hoy exactamente: se pidió `propietario` y la
   * fila no tiene inmueble. Ausente/`undefined` ⇒ se trata como `[]` (back
   * viejo). Una fila que cae acá NUNCA cae también en `fallidas`.
   */
  omitidas?: Array<{ id: string; fila: number | null; motivo: string }>;
}

export interface ResumenLote {
  lote: string | null;
  total: number;
  pendientes: number;
  listos: number;
  activados: number;
  descartados: number;
  /**
   * T-0035 — cuántas de `pendientes` + `listos` activaría `POST
   * migrar/activar` AHORA MISMO, con el estado actual del flag del back
   * (`MIGRACION_CONTRATOS_SPARSE`). Con el flag apagado es igual a
   * `listos` (comportamiento de siempre); con el flag prendido también
   * cuenta `pendientes`, porque el back las toma. El front decide si
   * ofrecer el botón de activar mirando ESTE campo, nunca `listos` solo —
   * el back es quien conoce su propia política, no hay que reimplementarla
   * acá ni inferirla del nombre del flag.
   */
  activables: number;
}

/**
 * `DELETE migrar/lotes/:lote` (contract.md §3.2.C3) — resultado de
 * descartar un lote entero. Los cuatro campos son obligatorios: es un tipo
 * nuevo, no hay productor viejo contra el que degradar.
 */
export interface DescarteDeLote {
  lote: string;
  /** Filas que ESTA llamada movió PENDIENTE|LISTO → DESCARTADO. */
  descartadas: number;
  /** Filas ya ACTIVADO. Intactas — la mitad honesta de la respuesta. */
  activadas: number;
  /** Filas que ya estaban DESCARTADO antes de esta llamada. */
  yaDescartadas: number;
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
  /**
   * T-0036 §3.2.A4 — `true` sólo cuando esta fila tenía un correo válido y
   * quedó sin cuenta (activación con `invitar:false`, sin usuario
   * existente). Ausente ⇒ se trata como `false` (back viejo). Mirrors
   * `inquilinoInvitado` exactamente.
   */
  inquilinoPendienteDeInvitar?: boolean;
  motivo?: string;
}

export interface ResumenActivacion {
  intentadas: number;
  activadas: number;
  fallidas: number;
  invitados: number;
  /**
   * T-0036 §3.2.A4 — cuántas filas retuvieron un correo sin invitar a
   * nadie. Ausente ⇒ NO renderizar nada — nunca `0`. Un back viejo que
   * todavía no manda este campo no puede afirmar un conteo que no tiene.
   */
  porInvitar?: number;
  resultados: ResultadoDeFila[];
}

/**
 * `POST /contracts/:id/invitar-inquilino` (contract.md §3.2.B3, T-0036) —
 * resultado de invitar (o vincular) al inquilino de un contrato migrado que
 * se activó sin uno. Los tres campos son obligatorios: tipo nuevo, no hay
 * productor viejo contra el que degradar.
 */
export interface ResultadoInvitacion {
  /**
   * `true` = se mandó una invitación por correo. `false` = la persona ya
   * tenía cuenta en Leasefy y sólo se vinculó — no se mandó nada. Las dos
   * son un `200`: sin este campo la pantalla no puede distinguirlas.
   */
  invitado: boolean;
  /** El usuario que quedó vinculado al contrato. Nunca null en un 200. */
  tenantId: string;
  /**
   * El contrato completo, releído después del write. Mismo shape que
   * `GET /contracts/:id` — `BackendContract`, SIN mapear. No se introduce
   * un tercer shape.
   */
  contrato: BackendContract;
}
