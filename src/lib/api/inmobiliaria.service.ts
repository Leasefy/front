/**
 * Inmobiliaria API service
 * Connects to backend /api/v1/inmobiliaria endpoints
 */

import { apiClient, getAccessToken, ApiError } from '@/lib/api/client';
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

const BASE = '/inmobiliaria';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

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
    const res = await apiClient.get<{ data: Propietario[] }>(`${BASE}/propietarios${qs ? `?${qs}` : ''}`);
    return res.data;
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
    const res = await apiClient.get<{ data: Consignacion[] }>(`${BASE}/propietarios/${id}/consignaciones`);
    return res.data;
  },

  async getCobros(id: string): Promise<Cobro[]> {
    const res = await apiClient.get<{ data: Cobro[] }>(`${BASE}/propietarios/${id}/cobros`);
    return res.data;
  },

  async getDispersiones(id: string): Promise<Dispersion[]> {
    const res = await apiClient.get<{ data: Dispersion[] }>(`${BASE}/propietarios/${id}/dispersiones`);
    return res.data;
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
    const res = await apiClient.get<{ data: Agente[] }>(`${BASE}/agentes`);
    return res.data;
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
    const res = await apiClient.get<{ data: Consignacion[] }>(`${BASE}/agentes/${id}/consignaciones`);
    return res.data;
  },

  async getPipeline(id: string): Promise<PipelineItem[]> {
    const res = await apiClient.get<{ data: PipelineItem[] }>(`${BASE}/agentes/${id}/pipeline`);
    return res.data;
  },

  async getMetrics(id: string): Promise<Agente['metrics']> {
    return apiClient.get<Agente['metrics']>(`${BASE}/agentes/${id}/metrics`);
  },

  async getLeaderboard(): Promise<Agente[]> {
    const res = await apiClient.get<{ data: Agente[] }>(`${BASE}/agentes/leaderboard`);
    return res.data;
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
  }): Promise<Consignacion[]> {
    const query = new URLSearchParams();
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

  async create(data: ConsignacionFormData & { contractDate: string }): Promise<Consignacion> {
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

export const cobrosApi = {
  async getAll(params?: { month?: string; status?: string; propietarioId?: string }): Promise<Cobro[]> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month);
    if (params?.status) query.set('status', params.status);
    if (params?.propietarioId) query.set('propietarioId', params.propietarioId);
    const qs = query.toString();
    const res = await apiClient.get<{ data: Cobro[] }>(`${BASE}/cobros${qs ? `?${qs}` : ''}`);
    return res.data;
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
    const res = await apiClient.get<{ data: CobroSummary }>(`${BASE}/cobros/summary?month=${month}`);
    return res.data;
  },

  async generate(month: string): Promise<void> {
    await apiClient.post(`${BASE}/cobros/generate`, { month });
  },

  async sendReminder(id: string): Promise<void> {
    await apiClient.post(`${BASE}/cobros/${id}/reminder`, {});
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
    const res = await apiClient.get<{ data: Dispersion[] }>(`${BASE}/dispersiones${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getById(id: string): Promise<Dispersion> {
    return apiClient.get<Dispersion>(`${BASE}/dispersiones/${id}`);
  },

  async create(data: Partial<Dispersion>): Promise<Dispersion> {
    return apiClient.post<Dispersion>(`${BASE}/dispersiones`, data);
  },

  async process(id: string): Promise<Dispersion> {
    return apiClient.patch<Dispersion>(`${BASE}/dispersiones/${id}/process`, {});
  },

  async preview(propietarioId: string, period: string): Promise<Dispersion> {
    return apiClient.get<Dispersion>(`${BASE}/dispersiones/preview?propietarioId=${propietarioId}&period=${period}`);
  },

  async getSummary(month: string): Promise<DispersionSummary> {
    const res = await apiClient.get<{ data: DispersionSummary }>(`${BASE}/dispersiones/summary?month=${month}`);
    return res.data;
  },

  async getExtracto(propietarioId: string, month?: string): Promise<ExtractoPropietario> {
    const qs = month ? `?month=${month}` : '';
    return apiClient.get<ExtractoPropietario>(`${BASE}/dispersiones/${propietarioId}/extracto${qs}`);
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
    const res = await apiClient.get<{ data: SolicitudMantenimiento[] }>(`${BASE}/mantenimiento${qs ? `?${qs}` : ''}`);
    return res.data;
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

export const renovacionesApi = {
  async getAll(): Promise<Renovacion[]> {
    const res = await apiClient.get<{ data: Renovacion[] }>(`${BASE}/renovaciones`);
    return res.data;
  },

  async getById(id: string): Promise<Renovacion> {
    return apiClient.get<Renovacion>(`${BASE}/renovaciones/${id}`);
  },

  async create(data: Partial<Renovacion>): Promise<Renovacion> {
    return apiClient.post<Renovacion>(`${BASE}/renovaciones`, data);
  },

  async notify(id: string): Promise<void> {
    await apiClient.patch(`${BASE}/renovaciones/${id}/notify`, {});
  },

  async accept(id: string): Promise<void> {
    await apiClient.patch(`${BASE}/renovaciones/${id}/accept`, {});
  },

  async reject(id: string): Promise<void> {
    await apiClient.patch(`${BASE}/renovaciones/${id}/reject`, {});
  },

  async getUpcoming(): Promise<Renovacion[]> {
    const res = await apiClient.get<{ data: Renovacion[] }>(`${BASE}/renovaciones/upcoming`);
    return res.data;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await apiClient.patch(`${BASE}/renovaciones/${id}/status`, { status });
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
    const res = await apiClient.get<{ data: ReportDefinition[] }>(`${BASE}/reports/definitions`);
    return res.data;
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
    const res = await apiClient.get<{ data: DocumentTemplate[] }>(`${BASE}/templates`);
    return res.data;
  },

  async getDocuments(params?: { consignacionId?: string; category?: string }): Promise<PropertyDocument[]> {
    const query = new URLSearchParams();
    if (params?.consignacionId) query.set('consignacionId', params.consignacionId);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    const res = await apiClient.get<{ data: PropertyDocument[] }>(`${BASE}/documents${qs ? `?${qs}` : ''}`);
    return res.data;
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
    const res = await apiClient.get<{ data: ActaEntrega[] }>(`${BASE}/actas`);
    return res.data;
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
    const res = await apiClient.get<{ data: BillingInvoice[] }>(`${BASE}/config/billing/invoices`);
    return res.data;
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
