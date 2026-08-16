/**
 * Inmobiliaria API service
 * Connects to backend /api/v1/inmobiliaria endpoints
 */

import { apiClient, getAccessToken, ApiError } from '@/lib/api/client';
import { AVALUO_WIZARD_ORIGIN } from '@/lib/avaluo/wizard-url';
import type {
  AgencyProfile,
  UpdateAgencyPayload,
  Propietario,
  PropietarioFormData,
  Agente,
  AgenteFormData,
  Consignacion,
  ConsignacionFormData,
  PipelineItem,
  PipelineStage,
  Cobro,
  CobroSummary,
  Dispersion,
  DispersionSummary,
  SolicitudMantenimiento,
  Renovacion,
  InmobiliariaDashboardKPIs,
  DocumentTemplate,
  PropertyDocument,
  ActaEntrega,
  AgencyUser,
  UserInvite,
  AgencyIntegration,
  AgencyBilling,
  BillingInvoice,
  AgencyConfigOverview,
  AgencyBillingDetail,
  AgencyInvoicesResponse,
  CarteraReport,
  OcupacionReport,
  ComisionesAgenteReport,
  RendimientoAgentesReport,
  VencimientosReport,
  FlujoCajaReport,
  ExtractoPropietario,
  AnalyticsData,
  TrendAnalysis,
  ForecastData,
  ReportDefinition,
  InvitationInfo,
  AgencyMember,
  AgencyInviteResult,
  AgencyOnboardingStatus,
} from '@/lib/types/inmobiliaria';
import { adaptarDispersion, type DispersionDelBack } from './dispersion-adapter';
import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';

const BASE = '/inmobiliaria';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/**
 * La lista, venga envuelta en `{ data }` o pelada.
 *
 * ⚠️ Esto NO es tolerancia por gusto: **cinco tablas del panel decían «todavía
 * no tenés nada» con los datos ahí**. El código hacía `res.data` sobre lo que
 * el back devuelve como array pelado, `[].data` es `undefined`, y el hook lo
 * pinta como lista vacía. Medido en el CRM de Propietarios: la respuesta traía
 * tres propietarios y la pantalla mostraba «Todavía no tenés propietarios».
 *
 * Es la tercera vez que la misma confusión de forma tumba una pantalla, y
 * ninguna de las tres se cayó: se veía como «no hay datos», que es indistinguible
 * de la verdad. Un `.data` a secas vuelve a romperse en silencio el día que un
 * endpoint cambie de forma; esto no.
 *
 * Lo que sí falla ruidosamente es una forma que no es ninguna de las dos —
 * ahí el problema es real y tiene que verse.
 */
function lista<T>(res: { data?: T[] } | T[] | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

// Permission response types
export interface UserPermissionsResponse {
  role: string;
  context: string;
  agencyId?: string;
  agencyRole?: string;
  teamRole?: string | null;
  ownerId?: string;
  permissions: 'FULL_ACCESS' | Record<string, string[]> | null;
}

export interface MemberPermissionsResponse {
  memberId: string;
  role: string;
  isAdmin: boolean;
  permissions: Record<string, string[]> | null;
  effectivePermissions: 'FULL_ACCESS' | Record<string, string[]>;
  usingDefaults: boolean;
  note?: string;
}

// ============================================================================
// Propietarios
// ============================================================================

export const propietariosApi = {
  async getAll(params?: { page?: number; limit?: number; search?: string; city?: string; tags?: string }): Promise<Propietario[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.city) query.set('city', params.city);
    if (params?.tags) query.set('tags', params.tags);
    const qs = query.toString();
    const res = await apiClient.get<{ data: Propietario[] } | Propietario[]>(`${BASE}/propietarios${qs ? `?${qs}` : ''}`);
    return lista(res);
  },

  async getById(id: string): Promise<Propietario> {
    return apiClient.get<Propietario>(`${BASE}/propietarios/${id}`);
  },

  async create(data: PropietarioFormData): Promise<Propietario> {
    return apiClient.post<Propietario>(`${BASE}/propietarios`, data);
  },

  async update(id: string, data: Partial<PropietarioFormData>): Promise<Propietario> {
    return apiClient.patch<Propietario>(`${BASE}/propietarios/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/propietarios/${id}`);
  },

  async getConsignaciones(id: string): Promise<Consignacion[]> {
    const res = await apiClient.get<{ data: Consignacion[] } | Consignacion[]>(`${BASE}/propietarios/${id}/consignaciones`);
    return lista(res);
  },

  async getCobros(id: string): Promise<Cobro[]> {
    const res = await apiClient.get<{ data: Cobro[] } | Cobro[]>(`${BASE}/propietarios/${id}/cobros`);
    return lista(res);
  },

  async getDispersiones(id: string): Promise<Dispersion[]> {
    const res = await apiClient.get<{ data: Dispersion[] } | Dispersion[]>(`${BASE}/propietarios/${id}/dispersiones`);
    return lista(res);
  },

  async getExtracto(id: string, month?: string): Promise<ExtractoPropietario> {
    const qs = month ? `?month=${month}` : '';
    return apiClient.get<ExtractoPropietario>(`${BASE}/propietarios/${id}/extracto${qs}`);
  },
};

// ============================================================================
// Agentes
// ============================================================================

export const agentesApi = {
  async getAll(): Promise<Agente[]> {
    const res = await apiClient.get<{ data: Agente[] } | Agente[]>(`${BASE}/agentes`);
    return lista(res);
  },

  async getById(id: string): Promise<Agente> {
    return apiClient.get<Agente>(`${BASE}/agentes/${id}`);
  },

  async create(data: AgenteFormData): Promise<Agente> {
    return apiClient.post<Agente>(`${BASE}/agentes`, data);
  },

  async update(id: string, data: Partial<AgenteFormData>): Promise<Agente> {
    return apiClient.patch<Agente>(`${BASE}/agentes/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/agentes/${id}`);
  },

  async getConsignaciones(id: string): Promise<Consignacion[]> {
    const res = await apiClient.get<{ data: Consignacion[] } | Consignacion[]>(`${BASE}/agentes/${id}/consignaciones`);
    return lista(res);
  },

  async getPipeline(id: string): Promise<PipelineItem[]> {
    const res = await apiClient.get<{ data: PipelineItem[] } | PipelineItem[]>(`${BASE}/agentes/${id}/pipeline`);
    return lista(res);
  },

  async getMetrics(id: string): Promise<Agente['metrics']> {
    return apiClient.get<Agente['metrics']>(`${BASE}/agentes/${id}/metrics`);
  },

  async getLeaderboard(): Promise<Agente[]> {
    const res = await apiClient.get<{ data: Agente[] } | Agente[]>(`${BASE}/agentes/leaderboard`);
    return lista(res);
  },
};

// ============================================================================
// Consignaciones (Portafolio)
// ============================================================================

/**
 * Backend consignacion row: Prisma returns UPPER_SNAKE enums
 * (status ACTIVE/TERMINATED/…, availability AVAILABLE/RENTED/…,
 * propertyType APARTMENT/…) and the agent link as `agenteUserId`.
 * The frontend `Consignacion` type declares lowercase enums and `agenteId`,
 * so every read/write goes through this boundary mapping.
 */
type RawConsignacion = Omit<
  Consignacion,
  'status' | 'availability' | 'propertyType' | 'agenteId'
> & {
  status?: string | null;
  availability?: string | null;
  propertyType?: string | null;
  agenteUserId?: string | null;
  agenteId?: string | null;
};

export function normalizeConsignacion(raw: RawConsignacion): Consignacion {
  const lower = (v?: string | null) => (v ?? '').toLowerCase();
  return {
    ...(raw as unknown as Consignacion),
    status: (lower(raw.status) || 'active') as Consignacion['status'],
    availability: (lower(raw.availability) || 'available') as Consignacion['availability'],
    propertyType: (lower(raw.propertyType) || 'apartment') as Consignacion['propertyType'],
    agenteId: raw.agenteId ?? raw.agenteUserId ?? '',
  };
}

/**
 * Fields accepted by PUT /inmobiliaria/consignaciones/:id
 * (UpdateConsignacionDto = Partial<CreateConsignacionDto> + status/availability/…).
 * NOTE: `agenteId` is accepted here only to be STRIPPED: the backend key is
 * `agenteUserId` (a User id), while the front's agente ids are AgencyMember
 * ids — sending either would corrupt the assignment or 400
 * (forbidNonWhitelisted). Agent reassignment needs the dedicated
 * assign-agent endpoint plus a userId the frontend does not have yet.
 */
export type ConsignacionUpdateInput = Partial<ConsignacionFormData> & {
  status?: Consignacion['status'];
  availability?: Consignacion['availability'];
  contractDate?: string;
  contractEndDate?: string;
  currentTenantName?: string;
  leaseEndDate?: string;
  consignmentContractUrl?: string;
  /**
   * El inmueble sobre el que corre el mandato. Ahora es llave foránea en la
   * base: un id inventado se rechaza en vez de guardarse.
   */
  propertyId?: string;
  /**
   * `User.id` del agente asignado — NO el `Agente.id` del front, que es un
   * `AgencyMember.id`. Sale de `Agente.userId`, que el back expone desde
   * 2026-08-16. Ver la nota de arriba sobre `agenteId`.
   */
  agenteUserId?: string;
};

function toConsignacionPayload(data: ConsignacionUpdateInput): Record<string, unknown> {
  // Strip front-only keys the backend whitelist would reject (see note above).
  const { agenteId: _agenteId, propertyType, status, availability, ...rest } = data;
  void _agenteId;
  const payload: Record<string, unknown> = { ...rest };
  if (propertyType !== undefined) payload.propertyType = propertyType.toUpperCase();
  if (status !== undefined) payload.status = status.toUpperCase();
  if (availability !== undefined) payload.availability = availability.toUpperCase();
  return payload;
}

export const consignacionesApi = {
  async getAll(params?: {
    status?: string;
    propertyType?: string;
    propietarioId?: string;
    agenteId?: string;
    minRent?: number;
    maxRent?: number;
    /**
     * El mandato de UN inmueble. `agencyId + propertyId` es único en la base,
     * así que devuelve cero o un elemento. Lo usan las pantallas que sólo
     * tienen el id del inmueble para llegar al detalle, que abre por
     * consignación.
     */
    propertyId?: string;
  }): Promise<Consignacion[]> {
    const query = new URLSearchParams();
    if (params?.propertyId) query.set('propertyId', params.propertyId);
    if (params?.status) query.set('status', params.status);
    if (params?.propertyType) query.set('propertyType', params.propertyType);
    if (params?.propietarioId) query.set('propietarioId', params.propietarioId);
    if (params?.agenteId) query.set('agenteId', params.agenteId);
    if (params?.minRent) query.set('minRent', String(params.minRent));
    if (params?.maxRent) query.set('maxRent', String(params.maxRent));
    const qs = query.toString();
    const res = await apiClient.get<{ data: RawConsignacion[] } | RawConsignacion[]>(
      `${BASE}/consignaciones${qs ? `?${qs}` : ''}`,
    );
    // Backend returns a plain array; tolerate a { data } envelope too.
    const rows = Array.isArray(res) ? res : res.data;
    return rows.map(normalizeConsignacion);
  },

  async getById(id: string): Promise<Consignacion> {
    const raw = await apiClient.get<RawConsignacion>(`${BASE}/consignaciones/${id}`);
    return normalizeConsignacion(raw);
  },

  async create(
    data: ConsignacionFormData & {
      contractDate: string;
      propertyId?: string;
      agenteUserId?: string;
    },
  ): Promise<Consignacion> {
    const raw = await apiClient.post<RawConsignacion>(
      `${BASE}/consignaciones`,
      toConsignacionPayload(data),
    );
    return normalizeConsignacion(raw);
  },

  /** PUT (not PATCH — the backend route is @Put) with backend-cased enums. */
  async update(id: string, data: ConsignacionUpdateInput): Promise<Consignacion> {
    const raw = await apiClient.put<RawConsignacion>(
      `${BASE}/consignaciones/${id}`,
      toConsignacionPayload(data),
    );
    return normalizeConsignacion(raw);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/consignaciones/${id}`);
  },
};

// ============================================================================
// Pipeline
// ============================================================================

/** Raw pipeline item as the backend returns it (UPPER_SNAKE stage, nested consignacion). */
interface BackendPipelineItem {
  id: string;
  consignacionId: string;
  agenteUserId?: string | null;
  candidateName: string;
  candidateEmail?: string | null;
  candidatePhone?: string | null;
  candidateAvatar?: string | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  stage: string;
  enteredStageAt: string;
  daysInStage: number;
  nextAction?: string | null;
  nextActionDate?: string | null;
  lastContactDate?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  completedLeaseId?: string | null;
  createdAt: string;
  updatedAt: string;
  consignacion?: {
    propertyId?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    monthlyRent?: number | null;
  } | null;
}

/** Stats shape of GET /inmobiliaria/pipeline/stats (stageCounts keys in UPPER_SNAKE). */
export interface PipelineStats {
  stageCounts: Record<string, number>;
  totalAll: number;
  totalActive: number;
  totalCompleted: number;
  totalLost: number;
  closedThisMonth: number;
  conversionRate: number;
}

/** Boundary mapper: backend item (UPPER stage + nested consignacion) → flat front shape. */
function normalizePipelineItem(raw: BackendPipelineItem): PipelineItem {
  return {
    id: raw.id,
    consignacionId: raw.consignacionId,
    propertyId: raw.consignacion?.propertyId ?? '',
    candidateId: '',
    agenteId: raw.agenteUserId ?? '',
    propertyTitle: raw.consignacion?.propertyTitle ?? '',
    propertyAddress: raw.consignacion?.propertyAddress ?? '',
    monthlyRent: raw.consignacion?.monthlyRent ?? 0,
    candidateName: raw.candidateName,
    candidateEmail: raw.candidateEmail ?? '',
    candidatePhone: raw.candidatePhone ?? '',
    candidateAvatar: raw.candidateAvatar ?? undefined,
    riskScore: raw.riskScore ?? undefined,
    riskLevel: (raw.riskLevel as PipelineItem['riskLevel']) ?? undefined,
    stage: raw.stage.toLowerCase() as PipelineStage,
    enteredStageAt: raw.enteredStageAt,
    daysInStage: raw.daysInStage,
    nextAction: raw.nextAction ?? undefined,
    nextActionDate: raw.nextActionDate ?? undefined,
    lastContactDate: raw.lastContactDate ?? undefined,
    notes: raw.notes ?? undefined,
    lostReason: raw.lostReason ?? undefined,
    completedLeaseId: raw.completedLeaseId ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const pipelineApi = {
  async getAll(): Promise<PipelineItem[]> {
    const res = await apiClient.get<BackendPipelineItem[]>(`${BASE}/pipeline`);
    return (Array.isArray(res) ? res : []).map(normalizePipelineItem);
  },

  async getById(id: string): Promise<PipelineItem> {
    const res = await apiClient.get<BackendPipelineItem>(`${BASE}/pipeline/${id}`);
    return normalizePipelineItem(res);
  },

  async getStats(): Promise<PipelineStats> {
    return apiClient.get<PipelineStats>(`${BASE}/pipeline/stats`);
  },

  async create(data: Partial<PipelineItem>): Promise<PipelineItem> {
    const { stage, ...rest } = data;
    const res = await apiClient.post<BackendPipelineItem>(`${BASE}/pipeline`, {
      ...rest,
      ...(stage ? { stage: stage.toUpperCase() } : {}),
    });
    return normalizePipelineItem(res);
  },

  async update(id: string, data: Partial<PipelineItem>): Promise<PipelineItem> {
    const { stage, ...rest } = data;
    const res = await apiClient.put<BackendPipelineItem>(`${BASE}/pipeline/${id}`, {
      ...rest,
      ...(stage ? { stage: stage.toUpperCase() } : {}),
    });
    return normalizePipelineItem(res);
  },

  async moveStage(id: string, newStage: PipelineStage, lostReason?: string): Promise<PipelineItem> {
    const res = await apiClient.put<BackendPipelineItem>(`${BASE}/pipeline/${id}/stage`, {
      stage: newStage.toUpperCase(),
      ...(lostReason ? { lostReason } : {}),
    });
    return normalizePipelineItem(res);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/pipeline/${id}`);
  },
};

// ============================================================================
// Cobros
// ============================================================================

/**
 * Backend returns Cobro rows with UPPER enums (status PAID/PARTIAL/COBRO_PENDING/…)
 * and, depending on the endpoint, either a bare array or `{ data: [...] }`. The
 * front `Cobro` type uses lowercase status, so normalize both here.
 */
function normalizeCobro(raw: Cobro): Cobro {
  const s = String((raw as { status?: string }).status ?? '').toLowerCase();
  return {
    ...raw,
    status: (s === 'cobro_pending' ? 'pending' : s) as Cobro['status'],
  };
}

export const cobrosApi = {
  async getAll(params?: { month?: string; status?: string; propietarioId?: string }): Promise<Cobro[]> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month);
    if (params?.status) query.set('status', params.status);
    if (params?.propietarioId) query.set('propietarioId', params.propietarioId);
    const qs = query.toString();
    const res = await apiClient.get<Cobro[] | { data: Cobro[] }>(
      `${BASE}/cobros${qs ? `?${qs}` : ''}`,
    );
    const rows = Array.isArray(res) ? res : res?.data ?? [];
    return rows.map(normalizeCobro);
  },

  async getById(id: string): Promise<Cobro> {
    return apiClient.get<Cobro>(`${BASE}/cobros/${id}`);
  },

  async registerPayment(id: string, payment: {
    paidAmount: number;
    paymentDate: string;
    paymentMethod: string;
    paymentReference?: string;
  }): Promise<Cobro> {
    return apiClient.patch<Cobro>(`${BASE}/cobros/${id}/pay`, payment);
  },

  async getSummary(month: string): Promise<CobroSummary> {
    // Backend returns { month, totalCobros, totalExpected, totalCollected,
    // totalPending, totalLate, countByStatus } (bare or wrapped in { data }).
    // The front CobroSummary needs collectionRate + per-status counts, so derive
    // them here and default every field (avoids undefined.toFixed crashes).
    const res = await apiClient.get<Record<string, unknown> | { data: Record<string, unknown> }>(
      `${BASE}/cobros/summary?month=${month}`,
    );
    const raw = ((res as { data?: Record<string, unknown> })?.data ?? res ?? {}) as {
      month?: string;
      totalExpected?: number;
      totalCollected?: number;
      totalPending?: number;
      totalLate?: number;
      collectionRate?: number;
      countByStatus?: Record<string, number>;
    };
    const totalExpected = raw.totalExpected ?? 0;
    const totalCollected = raw.totalCollected ?? 0;
    const counts = raw.countByStatus ?? {};
    return {
      month: raw.month ?? month,
      totalExpected,
      totalCollected,
      totalPending: raw.totalPending ?? 0,
      totalLate: raw.totalLate ?? 0,
      collectionRate:
        raw.collectionRate ?? (totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0),
      cobrosPaid: counts['PAID'] ?? 0,
      cobrosPending: (counts['COBRO_PENDING'] ?? 0) + (counts['PARTIAL'] ?? 0),
      cobrosLate: counts['LATE'] ?? 0,
    };
  },

  async generate(month: string): Promise<void> {
    await apiClient.post(`${BASE}/cobros/generate`, { month });
  },

  async sendReminder(id: string): Promise<void> {
    await apiClient.post(`${BASE}/cobros/${id}/reminder`, {});
  },
};

// ============================================================================
// Avalúos (agency records-by-state)
// ============================================================================

/**
 * One agency avalúo certificate row — the micro's `by-identity` item shape,
 * proxied verbatim by the back (`GET /inmobiliaria/avaluos`). `valueCop` is null
 * for a refused valuation; `method` degrades to '—' when the snapshot is missing.
 */
export interface AgencyAvaluoItem {
  id: string;
  slug: string;
  state: string;
  valueCop: number | null;
  method: string;
  city: string | null;
  /** Owner/client the certificate is issued for; null when the back has no name on file. */
  ownerName: string | null;
  identity: string;
  submissionId: string | null;
  createdAt: string;
  updatedAt: string;
  signedAt: string | null;
}

/** The paginated envelope the back returns (pageSize fixed at 100). */
export interface AgencyAvaluoListResponse {
  items: AgencyAvaluoItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * POST /inmobiliaria/avaluos/solicitar returns EITHER a fully composed wizard
 * URL, OR an agency token + wizard path the front composes against its own
 * configured wizard origin. Both shapes are normalized to `{ wizardUrl }`.
 */
export interface AvaluoSolicitarWizardUrlResponse {
  wizardUrl: string;
}
export interface AvaluoSolicitarTokenResponse {
  agencyToken: string;
  wizardPath: string;
}
export type AvaluoSolicitarResponse =
  | AvaluoSolicitarWizardUrlResponse
  | AvaluoSolicitarTokenResponse;

export const avaluosApi = {
  /**
   * List the agency's own avalúos, optionally filtered by lifecycle state.
   * The identity is resolved server-side from the agency context — the browser
   * never supplies it. Empty until Phase 2 #3 tags new avalúos with the agency
   * email.
   */
  async list(params?: {
    state?: string;
    page?: number;
  }): Promise<AgencyAvaluoListResponse> {
    const query = new URLSearchParams();
    if (params?.state) query.set('state', params.state);
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return apiClient.get<AgencyAvaluoListResponse>(
      `${BASE}/avaluos${qs ? `?${qs}` : ''}`,
    );
  },

  /**
   * Request a new avalúo for the agency. The back resolves the agency identity
   * server-side (permission `avaluos.create`) and answers with either a ready
   * `wizardUrl` (shape a) or an `agencyToken` + `wizardPath` (shape b) to compose
   * against the front's configured wizard origin. On 422 (agency missing
   * email/name) the back's Spanish message surfaces via the thrown ApiError.
   * Always returns a normalized `{ wizardUrl }`.
   */
  async solicitar(): Promise<{ wizardUrl: string }> {
    const res = await apiClient.post<AvaluoSolicitarResponse>(
      `${BASE}/avaluos/solicitar`,
      {},
    );

    // Shape (a): a fully composed URL — open it directly.
    if ('wizardUrl' in res && res.wizardUrl) {
      return { wizardUrl: res.wizardUrl };
    }

    // Shape (b): compose `${origin}${wizardPath}?agency=<token>`.
    if ('agencyToken' in res && res.agencyToken && res.wizardPath) {
      if (!AVALUO_WIZARD_ORIGIN) {
        throw new ApiError(
          0,
          'No pudimos abrir el asistente de avalúo: falta la configuración del servicio.',
        );
      }
      const path = res.wizardPath.startsWith('/')
        ? res.wizardPath
        : `/${res.wizardPath}`;
      return {
        wizardUrl: `${AVALUO_WIZARD_ORIGIN}${path}?agency=${encodeURIComponent(res.agencyToken)}`,
      };
    }

    throw new ApiError(0, 'No pudimos abrir el asistente de avalúo. Intentá de nuevo.');
  },
};

// ============================================================================
// Dispersiones
// ============================================================================

export const dispersionesApi = {
  async getAll(params?: { month?: string; status?: string; propietarioId?: string }): Promise<Dispersion[]> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month);
    if (params?.status) query.set('status', params.status);
    if (params?.propietarioId) query.set('propietarioId', params.propietarioId);
    const qs = query.toString();
    /*
     * El back devuelve el array PELADO. Pedir `res.data` sobre un array da
     * `undefined`, y el hook lo servía como lista vacía: la pantalla decía
     * «No hay dispersiones registradas» con dispersiones en la base.
     */
    const filas = await apiClient.get<DispersionDelBack[]>(
      `${BASE}/dispersiones${qs ? `?${qs}` : ''}`,
    );
    return filas.map(adaptarDispersion);
  },

  async getById(id: string): Promise<Dispersion> {
    return adaptarDispersion(
      await apiClient.get<DispersionDelBack>(`${BASE}/dispersiones/${id}`),
    );
  },

  /**
   * Genera las dispersiones del mes. **El back calcula los montos**, no el
   * navegador: descuenta la comisión sobre el canon recaudado, resta lo que
   * paga el propietario y deja fuera la administración de la copropiedad.
   *
   * Antes esto era un `POST /dispersiones` con los totales ya calculados en el
   * cliente. La ruta no existía —así que nunca guardó nada— pero de haber
   * existido habría escrito los números viejos, salteándose la liquidación.
   */
  async generate(
    month: string,
    /**
     * A quiénes. Sin la lista, el mes entero.
     *
     * El asistente deja destildar propietarios; esa decisión se quedaba en el
     * navegador y `generate` tomaba el mes completo, así que destildar a
     * alguien no lo excluía de nada.
     */
    propietarioIds?: string[],
  ): Promise<{
    month: string;
    totalPropietarios: number;
    created: number;
    skipped: number;
    /** Los del mes que quedaron fuera por la selección. */
    noElegidos: number;
  }> {
    return apiClient.post(`${BASE}/dispersiones/generate`, {
      month,
      ...(propietarioIds ? { propietarioIds } : {}),
    });
  },

  /** El back expone PUT, no PATCH. Con PATCH la llamada moría en 404. */
  async process(id: string): Promise<Dispersion> {
    return adaptarDispersion(
      await apiClient.put<DispersionDelBack>(
        `${BASE}/dispersiones/${id}/process`,
        {},
      ),
    );
  },

  /**
   * Lo que se giraría este mes, **calculado por el back y sin escribir nada**.
   *
   * El asistente lo calculaba en el navegador y le salían otros números: la
   * comisión sobre lo pagado en vez de sobre el canon, un 10% inventado cuando
   * no encontraba la consignación, sin conceptos, y «Propietario desconocido».
   */
  async preview(month: string): Promise<VistaPreviaDeDispersiones> {
    return apiClient.get<VistaPreviaDeDispersiones>(
      `${BASE}/dispersiones/preview?month=${month}`,
    );
  },

  async getSummary(month: string): Promise<DispersionSummary> {
    // Sin envoltorio `{ data }`: el back responde el objeto directo.
    return apiClient.get<DispersionSummary>(`${BASE}/dispersiones/summary?month=${month}`);
  },
};

// ============================================================================
// Mantenimiento
// ============================================================================

export const mantenimientoApi = {
  async getAll(params?: { status?: string; consignacionId?: string }): Promise<SolicitudMantenimiento[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.consignacionId) query.set('consignacionId', params.consignacionId);
    const qs = query.toString();
    const res = await apiClient.get<{ data: SolicitudMantenimiento[] } | SolicitudMantenimiento[]>(`${BASE}/mantenimiento${qs ? `?${qs}` : ''}`);
    return lista(res);
  },

  async getById(id: string): Promise<SolicitudMantenimiento> {
    return apiClient.get<SolicitudMantenimiento>(`${BASE}/mantenimiento/${id}`);
  },

  async create(data: Partial<SolicitudMantenimiento>): Promise<SolicitudMantenimiento> {
    return apiClient.post<SolicitudMantenimiento>(`${BASE}/mantenimiento`, data);
  },

  async update(id: string, data: Partial<SolicitudMantenimiento>): Promise<SolicitudMantenimiento> {
    return apiClient.patch<SolicitudMantenimiento>(`${BASE}/mantenimiento/${id}`, data);
  },

  async changeStatus(id: string, status: string): Promise<SolicitudMantenimiento> {
    return apiClient.patch<SolicitudMantenimiento>(`${BASE}/mantenimiento/${id}/status`, { status });
  },

  /** Alias for changeStatus used by operaciones page */
  async updateStatus(id: string, status: string): Promise<SolicitudMantenimiento> {
    return apiClient.patch<SolicitudMantenimiento>(`${BASE}/mantenimiento/${id}/status`, { status });
  },

  async approveQuote(id: string, quoteId: string): Promise<SolicitudMantenimiento> {
    return apiClient.patch<SolicitudMantenimiento>(`${BASE}/mantenimiento/${id}/approve-quote`, { quoteId });
  },

  async getKanban(): Promise<Record<string, SolicitudMantenimiento[]>> {
    return apiClient.get<Record<string, SolicitudMantenimiento[]>>(`${BASE}/mantenimiento/kanban`);
  },
};

// ============================================================================
// Renovaciones
// ============================================================================

/** Front lowercase RenovacionStatus → backend RenovacionStatus enum value. */
const RENOVACION_STATUS_TO_BACKEND: Record<string, string> = {
  pending: 'RENOV_PENDING',
  notified: 'NOTIFIED',
  negotiating: 'NEGOTIATING',
  approved: 'RENOV_APPROVED',
  signed: 'RENOV_SIGNED',
  completed: 'RENOV_COMPLETED',
  terminated: 'RENOV_TERMINATED',
};

/** Backend RenovacionStatus enum value → front lowercase status. */
const RENOVACION_STATUS_TO_FRONT: Record<string, string> = {
  RENOV_PENDING: 'pending',
  NOTIFIED: 'notified',
  NEGOTIATING: 'negotiating',
  RENOV_APPROVED: 'approved',
  RENOV_SIGNED: 'signed',
  RENOV_COMPLETED: 'completed',
  RENOV_TERMINATED: 'terminated',
};

/** Derive the front urgency bucket from days until lease expiry. */
function urgencyFromDays(days: number): Renovacion['urgencyBucket'] {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

/**
 * Boundary mapper: the backend returns the RenovacionStatus enum in UPPER_SNAKE
 * (the front uses lowercase) and does NOT send urgencyBucket (only
 * daysUntilExpiry). Without this the stepper/filters never match the status and
 * the urgency badges/stats render blank.
 */
function mapRenovacion(raw: Renovacion): Renovacion {
  return {
    ...raw,
    status: (RENOVACION_STATUS_TO_FRONT[raw.status] ?? raw.status) as Renovacion['status'],
    urgencyBucket: raw.urgencyBucket ?? urgencyFromDays(raw.daysUntilExpiry),
    // The list endpoint does not include history; guarantee an array so the
    // workflow's history timeline never maps over undefined.
    history: raw.history ?? [],
  };
}

export const renovacionesApi = {
  async getAll(): Promise<Renovacion[]> {
    // The backend returns a bare array here (findMany), not a { data } wrapper.
    const rows = await apiClient.get<Renovacion[]>(`${BASE}/renovaciones`);
    return (Array.isArray(rows) ? rows : []).map(mapRenovacion);
  },

  async getById(id: string): Promise<Renovacion> {
    return mapRenovacion(await apiClient.get<Renovacion>(`${BASE}/renovaciones/${id}`));
  },

  async create(data: Partial<Renovacion>): Promise<Renovacion> {
    return mapRenovacion(await apiClient.post<Renovacion>(`${BASE}/renovaciones`, data));
  },

  async getUpcoming(): Promise<Renovacion[]> {
    const rows = await apiClient.get<Renovacion[]>(`${BASE}/renovaciones/upcoming`);
    return (Array.isArray(rows) ? rows : []).map(mapRenovacion);
  },

  /**
   * Advance a renovación to a new stage via the real backend endpoint
   * (PUT /renovaciones/:id/stage). Maps the front lowercase status to the
   * backend RenovacionStatus enum and forwards the admin-editable negotiated
   * canon and admin fee so the completed renewal bills at the new values.
   */
  async updateStage(
    id: string,
    payload: {
      status: string;
      negotiatedRent?: number;
      negotiatedAdminFee?: number;
      proposedRent?: number;
      ipcRate?: number;
      historyNote?: string;
      notificationMessage?: string;
    },
  ): Promise<void> {
    const { status, ...rest } = payload;
    await apiClient.put(`${BASE}/renovaciones/${id}/stage`, {
      status: RENOVACION_STATUS_TO_BACKEND[status] ?? status,
      ...rest,
    });
  },

  /** Upload the renewal document (multipart). Returns the stored name/path. */
  async uploadDocument(
    id: string,
    file: File,
  ): Promise<{ documentName: string; documentPath: string }> {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}${BASE}/renovaciones/${id}/document`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al subir el documento');
    }
    return res.json();
  },

  /** Get a short-lived signed URL to download the renewal document. */
  async getDocumentUrl(id: string): Promise<{ url: string; name: string }> {
    return apiClient.get<{ url: string; name: string }>(
      `${BASE}/renovaciones/${id}/document/url`,
    );
  },

  async addNote(id: string, note: string): Promise<void> {
    await apiClient.post(`${BASE}/renovaciones/${id}/notes`, { note });
  },

  async getIPC(): Promise<{ rate: number; year: number; month: number }> {
    return apiClient.get(`${BASE}/renovaciones/ipc`);
  },
};

// ============================================================================
// Reportes
// ============================================================================

export const reportesApi = {
  async getDefinitions(): Promise<ReportDefinition[]> {
    const res = await apiClient.get<{ data: ReportDefinition[] } | ReportDefinition[]>(`${BASE}/reports/definitions`);
    return lista(res);
  },

  async getCartera(params?: { startDate?: string; endDate?: string }): Promise<CarteraReport> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return apiClient.get<CarteraReport>(`${BASE}/reports/cartera${qs ? `?${qs}` : ''}`);
  },

  async getOcupacion(): Promise<OcupacionReport> {
    return apiClient.get<OcupacionReport>(`${BASE}/reports/ocupacion`);
  },

  async getComisiones(month: string): Promise<ComisionesAgenteReport> {
    return apiClient.get<ComisionesAgenteReport>(`${BASE}/reports/comisiones?month=${month}`);
  },

  async getVencimientos(): Promise<VencimientosReport> {
    return apiClient.get<VencimientosReport>(`${BASE}/reports/vencimientos`);
  },

  async getFlujoCaja(months?: number): Promise<FlujoCajaReport> {
    const qs = months ? `?months=${months}` : '';
    return apiClient.get<FlujoCajaReport>(`${BASE}/reports/flujo-caja${qs}`);
  },

  async getRendimientoAgentes(month?: string): Promise<RendimientoAgentesReport> {
    const qs = month ? `?month=${month}` : '';
    return apiClient.get<RendimientoAgentesReport>(`${BASE}/reports/rendimiento-agentes${qs}`);
  },

  async getExtracto(propietarioId: string, month?: string): Promise<unknown> {
    const qs = month ? `?month=${month}` : '';
    return apiClient.get(`${BASE}/reports/extracto/${propietarioId}${qs}`);
  },

  async export(reportId: string, format: 'pdf' | 'xlsx', params?: Record<string, string>): Promise<Blob> {
    const query = new URLSearchParams({ reportId, format, ...params });
    return apiClient.get<Blob>(`${BASE}/reports/export?${query.toString()}`);
  },
};

// ============================================================================
// AI Agents (metrics + activity)
// ============================================================================

export interface AiMetricsResponse {
  scoring: {
    evaluationsThisMonth: number;
    avgTimeMin: string;
    escalationRate: string;
    accuracyRate: string;
  };
  matching: {
    suggestionsSent: number;
    conversionRate: string;
    candidatesRedirected: number;
    avgCompatibility: string;
  };
  summary: {
    actionsThisWeek: number;
    hoursSavedThisMonth: string;
  };
}

export interface AiActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  type: string;
  title: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
  metadata: {
    applicationId?: string;
    durationMs?: number;
    result?: string;
  };
}

export interface AiActivityResponse {
  activities: AiActivityItem[];
  source: string;
}

export const aiApi = {
  async getMetrics(): Promise<AiMetricsResponse> {
    return apiClient.get<AiMetricsResponse>(`${BASE}/ai/metrics`);
  },

  async getActivity(limit?: number): Promise<AiActivityResponse> {
    const qs = limit ? `?limit=${limit}` : '';
    return apiClient.get<AiActivityResponse>(`${BASE}/ai/activity${qs}`);
  },
};

// ============================================================================
// Analytics
// ============================================================================

export const analyticsApi = {
  async getKPIs(period?: string): Promise<InmobiliariaDashboardKPIs> {
    const qs = period ? `?period=${period}` : '';
    return apiClient.get<InmobiliariaDashboardKPIs>(`${BASE}/analytics/kpis${qs}`);
  },

  async getData(period?: string): Promise<AnalyticsData> {
    const qs = period ? `?period=${period}` : '';
    return apiClient.get<AnalyticsData>(`${BASE}/analytics/charts${qs}`);
  },

  async getTrends(metricId?: string): Promise<TrendAnalysis[]> {
    const qs = metricId ? `?metricId=${metricId}` : '';
    return apiClient.get<TrendAnalysis[]>(`${BASE}/analytics/trends${qs}`);
  },

  async getForecasts(metricId?: string): Promise<ForecastData[]> {
    const qs = metricId ? `?metricId=${metricId}` : '';
    return apiClient.get<ForecastData[]>(`${BASE}/analytics/forecast${qs}`);
  },
};

// ============================================================================
// Documentos & Templates
// ============================================================================

export const documentosApi = {
  async getTemplates(): Promise<DocumentTemplate[]> {
    const res = await apiClient.get<{ data: DocumentTemplate[] } | DocumentTemplate[]>(`${BASE}/templates`);
    return lista(res);
  },

  async getDocuments(params?: { consignacionId?: string; category?: string }): Promise<PropertyDocument[]> {
    const query = new URLSearchParams();
    if (params?.consignacionId) query.set('consignacionId', params.consignacionId);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    const res = await apiClient.get<{ data: PropertyDocument[] } | PropertyDocument[]>(`${BASE}/documents${qs ? `?${qs}` : ''}`);
    return lista(res);
  },

  async generate(templateId: string, variables: Record<string, string>): Promise<PropertyDocument> {
    return apiClient.post<PropertyDocument>(`${BASE}/documents/generate`, { templateId, variables });
  },
};

// ============================================================================
// Actas de Entrega
// ============================================================================

export const actasApi = {
  async getAll(): Promise<ActaEntrega[]> {
    const res = await apiClient.get<{ data: ActaEntrega[] } | ActaEntrega[]>(`${BASE}/actas`);
    return lista(res);
  },

  async getById(id: string): Promise<ActaEntrega> {
    return apiClient.get<ActaEntrega>(`${BASE}/actas/${id}`);
  },

  async create(data: Partial<ActaEntrega>): Promise<ActaEntrega> {
    return apiClient.post<ActaEntrega>(`${BASE}/actas`, data);
  },

  async update(id: string, data: Partial<ActaEntrega>): Promise<ActaEntrega> {
    return apiClient.patch<ActaEntrega>(`${BASE}/actas/${id}`, data);
  },

  async complete(id: string): Promise<ActaEntrega> {
    return apiClient.post<ActaEntrega>(`${BASE}/actas/${id}/complete`, {});
  },
};

// ============================================================================
// Configuracion
// ============================================================================

export const inmobiliariaConfigApi = {
  // NOTE: the old `get`/`getExtended`/`update`/`updateBranding`/`updateDefaults`
  // methods were removed — PATCH /inmobiliaria/config and
  // PATCH /inmobiliaria/config/branding|defaults NEVER existed in the backend.
  // Agency profile/branding is read from GET /inmobiliaria/config (`agency` key)
  // and written through agencyApi.updateAgency / agencyApi.uploadAgencyLogo.

  // Users — canonical route is /inmobiliaria/agency/members
  async getUsers(): Promise<AgencyUser[]> {
    const res = await apiClient.get<{ data: AgencyUser[] } | AgencyUser[]>(
      `${BASE}/agency/members`
    );
    return Array.isArray(res) ? res : res.data;
  },

  async inviteUser(invite: UserInvite): Promise<AgencyInviteResult> {
    // Backend enum: ADMIN | AGENTE | CONTADOR | VIEWER — just uppercase the frontend value
    // Backend DTO rejects: message (UI-only), phone (not in DTO)
    const { message: _msg, phone: _phone, ...rest } = invite;
    const payload = {
      ...rest,
      role: invite.role.toUpperCase(),
    };
    // Response merges `emailDelivered` onto the created member.
    return apiClient.post<AgencyInviteResult>(`${BASE}/agency/members`, payload);
  },

  async updateUser(id: string, data: Partial<AgencyUser>): Promise<AgencyUser> {
    return apiClient.patch<AgencyUser>(`${BASE}/agency/members/${id}`, data);
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/agency/members/${id}`);
  },

  // Billing (legacy shape — kept for existing consumers)
  async getBilling(): Promise<AgencyBilling> {
    return apiClient.get<AgencyBilling>(`${BASE}/config/billing`);
  },

  async getInvoices(): Promise<BillingInvoice[]> {
    const res = await apiClient.get<{ data: BillingInvoice[] } | BillingInvoice[]>(`${BASE}/config/billing/invoices`);
    return lista(res);
  },

  // ==========================================================================
  // Canonical config endpoints (backend source of truth)
  // ==========================================================================

  /** GET /inmobiliaria/config — overview with subscription, usage, permissions */
  async getConfigOverview(): Promise<AgencyConfigOverview> {
    return apiClient.get<AgencyConfigOverview>(`${BASE}/config`);
  },

  /** GET /inmobiliaria/config/billing — admin-only detailed billing + limits */
  async getConfigBilling(): Promise<AgencyBillingDetail> {
    return apiClient.get<AgencyBillingDetail>(`${BASE}/config/billing`);
  },

  /** GET /inmobiliaria/config/billing/invoices?limit=N — admin-only payment history */
  async getConfigInvoices(limit = 50): Promise<AgencyInvoicesResponse> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return apiClient.get<AgencyInvoicesResponse>(
      `${BASE}/config/billing/invoices?limit=${safeLimit}`
    );
  },

  // Integrations — canonical route is /inmobiliaria/agency/integrations
  async getIntegrations(): Promise<AgencyIntegration[]> {
    const res = await apiClient.get<{ data: AgencyIntegration[] } | AgencyIntegration[]>(
      `${BASE}/agency/integrations`
    );
    return Array.isArray(res) ? res : res.data;
  },

  async toggleIntegration(id: string, enabled: boolean): Promise<AgencyIntegration> {
    // Backend route is @Put (agency.controller.ts PUT integrations/:id) — must match verb.
    return apiClient.put<AgencyIntegration>(`${BASE}/agency/integrations/${id}`, { isEnabled: enabled });
  },
};

// ============================================================================
// Dashboard
// ============================================================================

export const inmobiliariaDashboardApi = {
  async getKPIs(): Promise<InmobiliariaDashboardKPIs> {
    return apiClient.get<InmobiliariaDashboardKPIs>(`${BASE}/analytics/kpis`);
  },
};

// ============================================================================
// Agency Registration & Invitations (P1-inmobiliaria-registration)
// ============================================================================

export const agencyApi = {
  /**
   * GET /inmobiliaria/agency/invitations/:token
   * Public endpoint — no auth required.
   * Returns invitation details for display on the public invitation page.
   */
  async getInvitation(token: string): Promise<InvitationInfo> {
    return apiClient.get<InvitationInfo>(`${BASE}/agency/invitations/${token}`);
  },

  /**
   * POST /inmobiliaria/agency/invitations/:token/accept
   * Requires auth — the logged-in user accepts the invitation.
   */
  async acceptInvitation(token: string): Promise<AgencyMember> {
    return apiClient.post<AgencyMember>(`${BASE}/agency/invitations/${token}/accept`);
  },

  /**
   * POST /inmobiliaria/agency/invitations/:token/decline
   * Can be called without auth (user declines before logging in).
   */
  async declineInvitation(token: string): Promise<void> {
    await apiClient.post(`${BASE}/agency/invitations/${token}/decline`);
  },

  /**
   * POST /inmobiliaria/agency/members/:memberId/resend-invitation
   * Resends the invitation email for a pending member.
   */
  async resendInvitation(memberId: string): Promise<AgencyInviteResult> {
    // Response merges `emailDelivered` onto the member.
    return apiClient.post<AgencyInviteResult>(`${BASE}/agency/members/${memberId}/resend-invitation`);
  },

  /**
   * PATCH /inmobiliaria/agency/members/:memberId/profile
   * Updates a member's profile fields (position, agent business fields). Admin only.
   */
  async updateMemberProfile(memberId: string, data: {
    position?: string | null;
    agentRole?: 'AGENT' | 'COORDINATOR' | 'DIRECTOR';
    agentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
    specialization?: 'RESIDENTIAL' | 'COMMERCIAL' | 'BOTH';
    commissionSplit?: number;
    zone?: string | null;
    hireDate?: string | null;
  }): Promise<AgencyMember> {
    return apiClient.patch<AgencyMember>(`${BASE}/agency/members/${memberId}/profile`, data);
  },

  /**
   * GET /inmobiliaria/agency
   * Returns the caller's agency (full row + memberRole/memberStatus).
   * 404 if the user has no agency membership.
   */
  async getMyAgency(): Promise<AgencyProfile> {
    return apiClient.get<AgencyProfile>(`${BASE}/agency`);
  },

  /**
   * PUT /inmobiliaria/agency
   * Updates agency settings (profile, legal, financial defaults, logoUrl).
   * Requires agency ADMIN role — the backend answers 403 otherwise.
   * Send ONLY changed fields: the backend rejects unknown keys
   * (ValidationPipe forbidNonWhitelisted).
   */
  async updateAgency(data: UpdateAgencyPayload): Promise<AgencyProfile> {
    return apiClient.put<AgencyProfile>(`${BASE}/agency`, data);
  },

  /**
   * POST /inmobiliaria/agency/logo
   * Uploads the agency logo (multipart, field `file`; jpeg/png/webp, max 5MB).
   * Uses fetch directly for FormData — same pattern as propertiesApi.uploadImage.
   * Returns the public URL of the stored logo.
   */
  async uploadAgencyLogo(file: File): Promise<{ logoUrl: string }> {
    const token = getAccessToken();

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}${BASE}/agency/logo`, {
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
      throw new ApiError(
        res.status,
        (body as { message?: string }).message || `Error al subir el logo (${res.status})`,
      );
    }

    return res.json();
  },

  /**
   * GET /inmobiliaria/agency/onboarding-status
   * Returns the agency admin's onboarding checklist with completion state.
   */
  async getOnboardingStatus(): Promise<AgencyOnboardingStatus> {
    return apiClient.get<AgencyOnboardingStatus>(`${BASE}/agency/onboarding-status`);
  },
};

// ============================================================================
// Permissions (Phase 24 — Granular Agency Permissions)
// ============================================================================

export const permissionsApi = {
  /**
   * GET /users/me/permissions
   * Returns the current user's effective permissions based on role and context.
   */
  async getMyPermissions(): Promise<UserPermissionsResponse> {
    return apiClient.get<UserPermissionsResponse>('/users/me/permissions');
  },

  /**
   * GET /inmobiliaria/agency/members/:memberId/permissions
   * Returns a member's effective permissions (admin only).
   */
  async getMemberPermissions(memberId: string): Promise<MemberPermissionsResponse> {
    return apiClient.get<MemberPermissionsResponse>(`${BASE}/agency/members/${memberId}/permissions`);
  },

  /**
   * PUT /inmobiliaria/agency/members/:memberId/permissions
   * Updates a member's custom permissions (admin only). Pass null to reset to role defaults.
   */
  async updateMemberPermissions(memberId: string, permissions: Record<string, string[]> | null): Promise<MemberPermissionsResponse> {
    // Backend route is @Put (agency.controller.ts PUT members/:id/permissions) — must match verb.
    return apiClient.put<MemberPermissionsResponse>(`${BASE}/agency/members/${memberId}/permissions`, { permissions });
  },

  /**
   * PUT /inmobiliaria/agency/members/:memberId/role
   * Updates a member's role (admin only).
   */
  async updateMemberRole(memberId: string, role: string): Promise<unknown> {
    // Backend route is @Put (agency.controller.ts PUT members/:id/role) — must match verb.
    return apiClient.put(`${BASE}/agency/members/${memberId}/role`, { role });
  },

  /**
   * PUT /inmobiliaria/agency/members/:memberId/status
   * Activates / deactivates a member (admin only). Body: { active: boolean }.
   */
  async updateMemberStatus(memberId: string, active: boolean): Promise<unknown> {
    return apiClient.put(`${BASE}/agency/members/${memberId}/status`, { active });
  },
};

// ============================================================================
// Role Permissions (per-agency role templates)
// ============================================================================

/** The 5 granular actions a role can hold on a module. */
export type AgencyAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

/** module key → allowed actions (an absent module means no access). */
export type PermMap = Record<string, AgencyAction[]>;

/**
 * The caller agency's full per-role permission matrix. Each role's PermMap is
 * COMPLETE across all modules (an absent module resolves to []). ADMIN is
 * full-access and read-only — the backend ignores it on writes.
 */
export interface RoleMatrices {
  roles: {
    ADMIN: PermMap;
    AGENTE: PermMap;
    CONTADOR: PermMap;
    VIEWER: PermMap;
  };
}

/** Body for the PUT — only the editable roles; ADMIN is never sent. */
export interface UpdateRolePermissionsBody {
  AGENTE?: PermMap;
  CONTADOR?: PermMap;
  VIEWER?: PermMap;
}

export const rolePermissionsApi = {
  /**
   * GET /inmobiliaria/agency/role-permissions
   * Returns the agency's per-role permission matrices (admin only; 403 otherwise).
   */
  async getRolePermissions(): Promise<RoleMatrices> {
    return apiClient.get<RoleMatrices>(`${BASE}/agency/role-permissions`);
  },

  /**
   * PUT /inmobiliaria/agency/role-permissions
   * Persists the edited role templates (admin only). Side effect: the backend
   * clears per-member permission overrides for ACTIVE members of the edited
   * roles so the template applies immediately.
   */
  async updateRolePermissions(body: UpdateRolePermissionsBody): Promise<RoleMatrices> {
    return apiClient.put<RoleMatrices>(`${BASE}/agency/role-permissions`, body);
  },

  /**
   * DELETE /inmobiliaria/agency/role-permissions
   * Resets every role to the system defaults (admin only). Also clears
   * per-member overrides for AGENTE/CONTADOR/VIEWER.
   */
  async resetRolePermissions(): Promise<RoleMatrices> {
    return apiClient.delete<RoleMatrices>(`${BASE}/agency/role-permissions`);
  },
};
