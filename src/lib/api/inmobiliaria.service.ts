/**
 * Inmobiliaria API service
 * Connects to backend /api/v1/inmobiliaria endpoints
 */

import { apiClient } from '@/lib/api/client';
import type {
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
  InmobiliariaConfig,
  InmobiliariaConfigExtended,
  DocumentTemplate,
  PropertyDocument,
  ActaEntrega,
  AgencyUser,
  UserInvite,
  AgencyIntegration,
  AgencyBilling,
  BillingInvoice,
  CarteraReport,
  OcupacionReport,
  ComisionesAgenteReport,
  VencimientosReport,
  FlujoCajaReport,
  ExtractoPropietario,
  AnalyticsData,
  TrendAnalysis,
  ForecastData,
  ReportDefinition,
} from '@/lib/types/inmobiliaria';

const BASE = '/inmobiliaria';

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
    const res = await apiClient.get<{ data: Consignacion[] }>(`${BASE}/consignaciones${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getById(id: string): Promise<Consignacion> {
    return apiClient.get<Consignacion>(`${BASE}/consignaciones/${id}`);
  },

  async create(data: ConsignacionFormData): Promise<Consignacion> {
    return apiClient.post<Consignacion>(`${BASE}/consignaciones`, data);
  },

  async update(id: string, data: Partial<ConsignacionFormData>): Promise<Consignacion> {
    return apiClient.patch<Consignacion>(`${BASE}/consignaciones/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/consignaciones/${id}`);
  },
};

// ============================================================================
// Pipeline
// ============================================================================

export const pipelineApi = {
  async getAll(): Promise<PipelineItem[]> {
    const res = await apiClient.get<{ data: PipelineItem[] }>(`${BASE}/pipeline`);
    return res.data;
  },

  async getById(id: string): Promise<PipelineItem> {
    return apiClient.get<PipelineItem>(`${BASE}/pipeline/${id}`);
  },

  async create(data: Partial<PipelineItem>): Promise<PipelineItem> {
    return apiClient.post<PipelineItem>(`${BASE}/pipeline`, data);
  },

  async update(id: string, data: Partial<PipelineItem>): Promise<PipelineItem> {
    return apiClient.patch<PipelineItem>(`${BASE}/pipeline/${id}`, data);
  },

  async moveStage(id: string, newStage: PipelineStage, notes?: string): Promise<PipelineItem> {
    return apiClient.patch<PipelineItem>(`${BASE}/pipeline/${id}/stage`, { newStage, notes });
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/pipeline/${id}`);
  },

  async convertToLease(id: string): Promise<void> {
    await apiClient.post(`${BASE}/pipeline/${id}/convert`, {});
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
    return apiClient.get<CobroSummary>(`${BASE}/cobros/summary?month=${month}`);
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
    return apiClient.get<DispersionSummary>(`${BASE}/dispersiones/summary?month=${month}`);
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
    const res = await apiClient.get<{ data: ReportDefinition[] }>(`${BASE}/reportes/definitions`);
    return res.data;
  },

  async getCartera(params?: { startDate?: string; endDate?: string }): Promise<CarteraReport> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return apiClient.get<CarteraReport>(`${BASE}/reportes/cartera${qs ? `?${qs}` : ''}`);
  },

  async getOcupacion(): Promise<OcupacionReport> {
    return apiClient.get<OcupacionReport>(`${BASE}/reportes/ocupacion`);
  },

  async getComisiones(period: string): Promise<ComisionesAgenteReport> {
    return apiClient.get<ComisionesAgenteReport>(`${BASE}/reportes/comisiones?period=${period}`);
  },

  async getVencimientos(): Promise<VencimientosReport> {
    return apiClient.get<VencimientosReport>(`${BASE}/reportes/vencimientos`);
  },

  async getFlujoCaja(periodType?: 'quarter' | 'semester' | 'year'): Promise<FlujoCajaReport> {
    const qs = periodType ? `?period=${periodType}` : '';
    return apiClient.get<FlujoCajaReport>(`${BASE}/reportes/flujo-caja${qs}`);
  },

  async export(reportId: string, format: 'pdf' | 'xlsx', params?: Record<string, string>): Promise<Blob> {
    const query = new URLSearchParams({ reportId, format, ...params });
    return apiClient.get<Blob>(`${BASE}/reportes/export?${query.toString()}`);
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
  async get(): Promise<InmobiliariaConfig> {
    return apiClient.get<InmobiliariaConfig>(`${BASE}/config`);
  },

  async getExtended(): Promise<InmobiliariaConfigExtended> {
    return apiClient.get<InmobiliariaConfigExtended>(`${BASE}/config`);
  },

  async update(data: Partial<InmobiliariaConfigExtended>): Promise<InmobiliariaConfigExtended> {
    return apiClient.patch<InmobiliariaConfigExtended>(`${BASE}/config`, data);
  },

  async updateBranding(data: Partial<InmobiliariaConfigExtended['branding']>): Promise<void> {
    await apiClient.patch(`${BASE}/config/branding`, data);
  },

  async updateDefaults(data: Partial<InmobiliariaConfigExtended['defaults']>): Promise<void> {
    await apiClient.patch(`${BASE}/config/defaults`, data);
  },

  // Users
  async getUsers(): Promise<AgencyUser[]> {
    const res = await apiClient.get<{ data: AgencyUser[] }>(`${BASE}/config/users`);
    return res.data;
  },

  async inviteUser(invite: UserInvite): Promise<AgencyUser> {
    return apiClient.post<AgencyUser>(`${BASE}/config/users/invite`, invite);
  },

  async updateUser(id: string, data: Partial<AgencyUser>): Promise<AgencyUser> {
    return apiClient.patch<AgencyUser>(`${BASE}/config/users/${id}`, data);
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/config/users/${id}`);
  },

  // Billing
  async getBilling(): Promise<AgencyBilling> {
    return apiClient.get<AgencyBilling>(`${BASE}/config/billing`);
  },

  async getInvoices(): Promise<BillingInvoice[]> {
    const res = await apiClient.get<{ data: BillingInvoice[] }>(`${BASE}/config/billing/invoices`);
    return res.data;
  },

  // Integrations
  async getIntegrations(): Promise<AgencyIntegration[]> {
    const res = await apiClient.get<{ data: AgencyIntegration[] }>(`${BASE}/config/integrations`);
    return res.data;
  },

  async toggleIntegration(id: string, enabled: boolean): Promise<AgencyIntegration> {
    return apiClient.patch<AgencyIntegration>(`${BASE}/config/integrations/${id}`, { isEnabled: enabled });
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
