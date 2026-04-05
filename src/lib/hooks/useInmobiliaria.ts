'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  propietariosApi,
  agentesApi,
  consignacionesApi,
  pipelineApi,
  cobrosApi,
  dispersionesApi,
  mantenimientoApi,
  renovacionesApi,
  reportesApi,
  analyticsApi,
  documentosApi,
  actasApi,
  inmobiliariaConfigApi,
  inmobiliariaDashboardApi,
} from '@/lib/api/inmobiliaria.service';
import type {
  Propietario,
  Agente,
  Consignacion,
  PipelineItem,
  Cobro,
  CobroSummary,
  Dispersion,
  SolicitudMantenimiento,
  Renovacion,
  InmobiliariaDashboardKPIs,
  InmobiliariaConfigExtended,
  DocumentTemplate,
  PropertyDocument,
  ActaEntrega,
  AgencyUser,
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
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Generic fetch hook helper
// ============================================================================

function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData };
}

// ============================================================================
// Propietarios
// ============================================================================

export function usePropietarios(params?: Parameters<typeof propietariosApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => propietariosApi.getAll(params),
    [params?.search, params?.city, params?.page]
  );
  return { propietarios: data ?? [], ...rest };
}

export function usePropietario(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? propietariosApi.getById(id) : Promise.reject('No ID')),
    [id]
  );
  return { propietario: data, ...rest };
}

// ============================================================================
// Agentes
// ============================================================================

export function useAgentes() {
  const { data, ...rest } = useApiData(() => agentesApi.getAll(), []);
  return { agentes: data ?? [], ...rest };
}

export function useAgente(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? agentesApi.getById(id) : Promise.reject('No ID')),
    [id]
  );
  return { agente: data, ...rest };
}

export function useAgenteConsignaciones(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? agentesApi.getConsignaciones(id) : Promise.reject('No ID')),
    [id]
  );
  return { consignaciones: data ?? [], ...rest };
}

export function useAgentePipeline(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? agentesApi.getPipeline(id) : Promise.reject('No ID')),
    [id]
  );
  return { pipelineItems: data ?? [], ...rest };
}

// ============================================================================
// Consignaciones (Portafolio)
// ============================================================================

export function useConsignaciones(params?: Parameters<typeof consignacionesApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => consignacionesApi.getAll(params),
    [params?.status, params?.agenteId, params?.propietarioId]
  );
  return { consignaciones: data ?? [], ...rest };
}

export function useConsignacion(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? consignacionesApi.getById(id) : Promise.reject('No ID')),
    [id]
  );
  return { consignacion: data, ...rest };
}

// ============================================================================
// Pipeline
// ============================================================================

export function usePipelineItems() {
  const { data, ...rest } = useApiData(() => pipelineApi.getAll(), []);
  return { pipelineItems: data ?? [], ...rest };
}

// ============================================================================
// Cobros
// ============================================================================

export function useCobros(params?: Parameters<typeof cobrosApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => cobrosApi.getAll(params),
    [params?.month, params?.status, params?.propietarioId]
  );
  return { cobros: data ?? [], ...rest };
}

export function useCobroSummary(month: string) {
  const { data, ...rest } = useApiData(
    () => cobrosApi.getSummary(month),
    [month]
  );
  return { summary: data, ...rest };
}

// ============================================================================
// Dispersiones
// ============================================================================

export function useDispersiones(params?: Parameters<typeof dispersionesApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => dispersionesApi.getAll(params),
    [params?.month, params?.status, params?.propietarioId]
  );
  return { dispersiones: data ?? [], ...rest };
}

// ============================================================================
// Mantenimiento
// ============================================================================

export function useMantenimientos(params?: Parameters<typeof mantenimientoApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => mantenimientoApi.getAll(params),
    [params?.status, params?.consignacionId]
  );
  return { mantenimientos: data ?? [], ...rest };
}

// ============================================================================
// Renovaciones
// ============================================================================

export function useRenovaciones() {
  const { data, ...rest } = useApiData(() => renovacionesApi.getAll(), []);
  return { renovaciones: data ?? [], ...rest };
}

// ============================================================================
// Dashboard KPIs
// ============================================================================

export function useInmobiliariaDashboard() {
  const { data, ...rest } = useApiData(
    () => inmobiliariaDashboardApi.getKPIs(),
    []
  );
  return { kpis: data, ...rest };
}

// ============================================================================
// Reportes
// ============================================================================

export function useCarteraReport() {
  const { data, ...rest } = useApiData(() => reportesApi.getCartera(), []);
  return { report: data, ...rest };
}

export function useOcupacionReport() {
  const { data, ...rest } = useApiData(() => reportesApi.getOcupacion(), []);
  return { report: data, ...rest };
}

export function useComisionesReport(month: string) {
  const { data, ...rest } = useApiData(
    () => reportesApi.getComisiones(month),
    [month]
  );
  return { report: data, ...rest };
}

export function useVencimientosReport() {
  const { data, ...rest } = useApiData(() => reportesApi.getVencimientos(), []);
  return { report: data, ...rest };
}

export function useFlujoCajaReport(months?: number) {
  const { data, ...rest } = useApiData(
    () => reportesApi.getFlujoCaja(months),
    [months]
  );
  return { report: data, ...rest };
}

export function useRendimientoAgentesReport(month?: string) {
  const { data, ...rest } = useApiData(
    () => reportesApi.getRendimientoAgentes(month),
    [month]
  );
  return { report: data, ...rest };
}

export function useExtractoPropietario(propietarioId: string | undefined, month?: string) {
  const { data, ...rest } = useApiData(
    () => (propietarioId ? propietariosApi.getExtracto(propietarioId, month) : Promise.reject('No ID')),
    [propietarioId, month]
  );
  return { extracto: data, ...rest };
}

// ============================================================================
// Analytics
// ============================================================================

export function useAnalyticsData(period?: string) {
  const { data, ...rest } = useApiData(
    () => analyticsApi.getData(period),
    [period]
  );
  return { analyticsData: data, ...rest };
}

export function useTrendAnalysis() {
  const { data, ...rest } = useApiData(() => analyticsApi.getTrends(), []);
  return { trends: data ?? [], ...rest };
}

export function useForecastData() {
  const { data, ...rest } = useApiData(() => analyticsApi.getForecasts(), []);
  return { forecasts: data ?? [], ...rest };
}

// ============================================================================
// Documentos
// ============================================================================

export function useDocumentTemplates() {
  const { data, ...rest } = useApiData(() => documentosApi.getTemplates(), []);
  return { templates: data ?? [], ...rest };
}

export function usePropertyDocuments(params?: Parameters<typeof documentosApi.getDocuments>[0]) {
  const { data, ...rest } = useApiData(
    () => documentosApi.getDocuments(params),
    [params?.consignacionId, params?.category]
  );
  return { documents: data ?? [], ...rest };
}

export function useActasEntrega() {
  const { data, ...rest } = useApiData(() => actasApi.getAll(), []);
  return { actas: data ?? [], ...rest };
}

// ============================================================================
// Configuracion
// ============================================================================

export function useInmobiliariaConfig() {
  const { data, ...rest } = useApiData(
    () => inmobiliariaConfigApi.getExtended(),
    []
  );
  return { config: data, ...rest };
}

export function useAgencyUsers() {
  const { data, ...rest } = useApiData(
    () => inmobiliariaConfigApi.getUsers(),
    []
  );
  return { users: data ?? [], ...rest };
}

export function useAgencyIntegrations() {
  const { data, ...rest } = useApiData(
    () => inmobiliariaConfigApi.getIntegrations(),
    []
  );
  return { integrations: data ?? [], ...rest };
}

export function useAgencyBilling() {
  const [billing, setBilling] = useState<AgencyBilling | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [b, i] = await Promise.all([
        inmobiliariaConfigApi.getBilling(),
        inmobiliariaConfigApi.getInvoices(),
      ]);
      setBilling(b);
      setInvoices(i);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar facturacion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { billing, invoices, isLoading, error, refetch };
}

// Re-export API services for direct use in event handlers
export {
  propietariosApi,
  agentesApi,
  consignacionesApi,
  pipelineApi,
  cobrosApi,
  dispersionesApi,
  mantenimientoApi,
  renovacionesApi,
  reportesApi,
  analyticsApi,
  documentosApi,
  actasApi,
  inmobiliariaConfigApi,
};
