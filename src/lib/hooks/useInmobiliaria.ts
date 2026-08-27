'use client';

/**
 * ⚠️ `SIN_DATOS`, y no `?? (SIN_DATOS as never[])`.
 *
 * `data ?? (SIN_DATOS as never[])` crea un array NUEVO en cada render. Cualquier consumidor que
 * ponga el resultado en las dependencias de un `useEffect` o un `useMemo`
 * entra en bucle: efecto → setState → render → array nuevo → efecto.
 *
 * No es teórico: pasó en DOS pantallas. En el panel de dispersiones fueron
 * ~2,5 peticiones por segundo contra el back, indefinidamente; en el wizard,
 * un «Maximum update depth exceeded» que tumbaba la página con 507 errores.
 *
 * Una sola referencia congelada para los 18 hooks mata la clase entera.
 */
const SIN_DATOS: readonly never[] = Object.freeze([]);

import { useState, useEffect, useCallback } from 'react';
import { alCambiar } from '@/lib/api/refresco-de-datos';
import {
  propietariosApi,
  agentesApi,
  consignacionesApi,
  inmueblesApi,
  pipelineApi,
  cobrosApi,
  avaluosApi,
  dispersionesApi,
  mantenimientoApi,
  renovacionesApi,
  reportesApi,
  analyticsApi,
  aiApi,
  documentosApi,
  actasApi,
  inmobiliariaConfigApi,
  inmobiliariaDashboardApi,
} from '@/lib/api/inmobiliaria.service';
import type {
  AiMetricsResponse,
  AiActivityResponse,
} from '@/lib/api/inmobiliaria.service';
import { esSinPermiso } from '@/lib/errores/clasificar';
import type {
  Propietario,
  Agente,
  Consignacion,
  InmuebleSinConsignacion,
  PipelineItem,
  Cobro,
  CobroSummary,
  Dispersion,
  SolicitudMantenimiento,
  Renovacion,
  InmobiliariaDashboardKPIs,
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

/*
 * `errorCrudo` guarda el error TAL CUAL, además del mensaje.
 *
 * `error` se aplasta a string con `err.message`, y ahí se pierde el status
 * HTTP. Sin status, `clasificarFallo` no puede distinguir un 404 —«esto no
 * existe», sin reintentar— de un 500 o un fallo de red —«probá de nuevo»—, así
 * que las cuatro estados colapsan a uno. Medido: un 404 salía como «problema
 * nuestro, probá de nuevo», mandando a reintentar algo que nunca va a existir.
 *
 * Se agrega en vez de cambiar el tipo de `error`: 77 consumidores lo pintan
 * como string y seguirían funcionando igual.
 */

// ============================================================================
// Generic fetch hook helper
// ============================================================================

function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  skip = false,
  pollMs = 0,
  /**
   * Qué recursos lee este hook.
   *
   * Con esto, cuando una acción los modifica —desde ESTA pantalla o desde
   * cualquier otra— la tabla se refresca sola. La acción no tiene que conocer
   * a quién avisar, y nadie tiene que recargar la página.
   *
   * Vacío = no escucha. Es el valor por defecto a propósito: un hook que
   * todavía no declaró sus recursos se comporta igual que antes.
   */
  recursos: readonly string[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  // Returns the fetched data on success and null on failure (the error is
  // captured in hook state, NOT rethrown) — callers that must react to a
  // failed refetch (e.g. warn the user the view is stale) check for null.
  const refetch = useCallback(async (): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorCrudo(null);
      const result = await fetcher();
      setData(result);
      return result;
    } catch (e) {
      setErrorCrudo(e);
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
      return null;
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Background refresh that updates data/error WITHOUT flipping the loading
  // flag — used for live polling so the view never flashes its skeleton.
  const silentRefetch = useCallback(async (): Promise<void> => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
      setErrorCrudo(null);
    } catch (e) {
      setErrorCrudo(e);
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (skip) {
      setIsLoading(false);
      return;
    }
    refetch();
  }, [refetch, skip]);

  useEffect(() => {
    if (skip || !pollMs) return;
    const id = setInterval(silentRefetch, pollMs);
    return () => clearInterval(id);
  }, [silentRefetch, skip, pollMs]);

  /*
   * Alguien modificó un recurso que esta pantalla lee → se vuelve a pedir.
   *
   * Va por `silentRefetch` y no por `refetch`: el dato ya está en pantalla, y
   * hacerlo parpadear a esqueleto después de cada acción se ve peor que el
   * problema que arregla.
   *
   * `recursos.join()` en las dependencias, no el array: un literal `['x']` es
   * nuevo en cada render, y ponerlo directo re-suscribe sin parar.
   */
  const clave = recursos.join(',');
  useEffect(() => {
    if (skip || !clave) return;
    return alCambiar(clave.split(','), () => {
      void silentRefetch();
    });
  }, [silentRefetch, skip, clave]);

  return { data, isLoading, error, errorCrudo, refetch, setData };
}

// ============================================================================
// Propietarios
// ============================================================================

export function usePropietarios(params?: Parameters<typeof propietariosApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => propietariosApi.getAll(params),
    [params?.search, params?.city, params?.page],
    false,
    0,
    ['propietarios'],
  );
  return { propietarios: data ?? (SIN_DATOS as never[]), ...rest };
}

export function usePropietario(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? propietariosApi.getById(id) : Promise.reject('No ID')),
    [id],
    false,
    0,
    ['propietarios'],
  );
  return { propietario: data, ...rest };
}

// ============================================================================
// Agentes
// ============================================================================

export function useAgentes(options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData(() => agentesApi.getAll(), [], options?.skip, 0, ['agentes']);
  return { agentes: data ?? (SIN_DATOS as never[]), ...rest };
}

/*
 * El equipo = agentes activos + los que invitaste y todavía no aceptaron.
 *
 * `GET /inmobiliaria/agentes` devuelve SÓLO miembros `ACTIVE` y con usuario
 * vinculado (agentes.service `findAll`: `where status: ACTIVE` y después
 * `members.filter(m => m.userId !== null)`). Un agente recién invitado es
 * `INVITED` con `userId` null, así que no puede salir ahí —ni recargando, ni
 * mañana, nunca— hasta que la persona se registre y acepte.
 *
 * Por eso la pantalla decía «0 agentes · No hay agentes registrados» justo
 * después de crear uno, y recargar no cambiaba nada: no era un problema de
 * refresco, era que la tabla lee una colección más chica que la que escribe el
 * formulario. Verificado en base: 2 filas AGENTE/INVITED con `user_id` NULL
 * mientras `GET /agentes` devuelve [].
 *
 * Las invitaciones viven en `GET /inmobiliaria/agency/members`, que pide
 * permiso de `configuracion` (admin). Un 403 ahí NO es un fallo: es que a esa
 * persona no le corresponde verlas, y el equipo activo se muestra igual.
 * Cualquier OTRO fallo sí esconde gente, y eso se avisa (`invitacionesCaidas`)
 * en vez de mostrar un roster incompleto como si estuviera completo.
 */
function invitacionComoAgente(m: AgencyUser): Agente {
  return {
    id: m.id, // id del AgencyMember — es el que usan las rutas /members/:id
    // El backend no guarda el nombre del invitado (no hay columna `name` en
    // `agency_members`), así que `name` vuelve como el email. Mostrar el email
    // es la verdad disponible.
    name: m.name || m.email,
    email: m.email,
    phone: m.phone ?? '',
    avatar: m.avatar,
    role: 'agent',
    status: 'invited',
    commissionSplit: 0,
    assignedPropertyIds: [],
    hireDate: m.invitedAt ?? m.createdAt,
    metrics: {
      assignedProperties: 0,
      activeLeases: 0,
      closedThisMonth: 0,
      closedThisYear: 0,
      totalCommissions: 0,
      commissionsThisMonth: 0,
      avgDaysToClose: 0,
      conversionRate: 0,
    },
    createdAt: m.createdAt,
    updatedAt: m.createdAt,
  };
}

export function useEquipo(options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData(
    async () => {
      const [activos, invitaciones] = await Promise.all([
        agentesApi.getAll(),
        inmobiliariaConfigApi.getUsers().then(
          (miembros) => ({ ok: true as const, miembros }),
          (err: unknown) => ({ ok: false as const, err }),
        ),
      ]);

      const pendientes = invitaciones.ok
        ? invitaciones.miembros
            .filter((m) => m.role === 'agente' && m.status === 'invited')
            .map(invitacionComoAgente)
        : [];

      return {
        agentes: [...activos, ...pendientes],
        // Sólo cuando el fallo NO es «no te corresponde»: ahí sí falta gente.
        invitacionesCaidas: !invitaciones.ok && !esSinPermiso(invitaciones.err),
      };
    },
    [],
    options?.skip,
  );

  return {
    agentes: data?.agentes ?? [],
    invitacionesCaidas: data?.invitacionesCaidas ?? false,
    ...rest,
  };
}

export function useAgente(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? agentesApi.getById(id) : Promise.reject('No ID')),
    [id],
    false,
    0,
    ['agentes'],
  );
  return { agente: data, ...rest };
}

export function useAgenteConsignaciones(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? agentesApi.getConsignaciones(id) : Promise.reject('No ID')),
    [id],
    false,
    0,
    ['consignaciones'],
  );
  return { consignaciones: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useAgentePipeline(id: string | undefined) {
  const { data, ...rest } = useApiData(
    () => (id ? agentesApi.getPipeline(id) : Promise.reject('No ID')),
    [id],
    false,
    0,
    ['pipeline'],
  );
  return { pipelineItems: data ?? (SIN_DATOS as never[]), ...rest };
}

// ============================================================================
// Consignaciones (Portafolio)
// ============================================================================

export function useConsignaciones(params?: Parameters<typeof consignacionesApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => consignacionesApi.getAll(params),
    [params?.status, params?.agenteId, params?.propietarioId],
    false,
    0,
    ['consignaciones'],
  );
  return { consignaciones: data ?? (SIN_DATOS as never[]), ...rest };
}

/**
 * Segunda fuente del portafolio (T-0030): propiedades sin mandato — nunca
 * salen en `GET /inmobiliaria/consignaciones` porque ese endpoint sólo lee
 * `Consignacion`. Se arma con `useApiData`, así que un fallo acá queda
 * capturado en `errorCrudo`/`error` de ESTE hook — nunca se relanza — y
 * `data ?? []` deja `inmuebles: []` mientras tanto. Es a propósito
 * (contract.md T-0030 §3.3: "Degrade, do not blank" — el fallo de esta fuente
 * NO puede tumbar el portafolio que ya andaba).
 *
 * Recurso `'consignaciones'`: crear un mandato invalida ese recurso (y, por
 * `TAMBIEN_TOCA`, también `properties`/`propiedades`), así que esta lista se
 * refresca sola en cuanto la fila deja de estar acá y pasa a la otra.
 */
export function useInmueblesSinConsignacion() {
  const { data, ...rest } = useApiData(
    () => inmueblesApi.getSinConsignacion(),
    [],
    false,
    0,
    ['consignaciones'],
  );
  return { inmuebles: data ?? (SIN_DATOS as never[] as InmuebleSinConsignacion[]), ...rest };
}

/**
 * El mandato de `/inmuebles/:id`.
 *
 * `id` es un id de CONSIGNACIÓN. Pero al unificar «Consignaciones» e
 * «Inmuebles · catálogo» quedaron entrando por acá enlaces que sólo tienen el
 * id del INMUEBLE —la paleta de comandos y el matching de candidatos del
 * `CandidateDrawer`—, y los dos apuntaban a rutas que no resolvían: el de la
 * paleta iba a `/panel/inmobiliaria/inmuebles/<id>`, una página que **nunca
 * existió**.
 *
 * La resolución vive en `consignacionesApi.getByIdOrPropertyId`, porque la
 * pantalla de candidatos —que no usa este hook— necesitaba exactamente la
 * misma y con una copia aparte se quedó sin ella: cada fila de Postulaciones
 * moría en «No encontramos esa propiedad».
 */
export function useConsignacion(id: string | undefined) {
  const { data, ...rest } = useApiData(
    async () => {
      if (!id) throw new Error('No ID');
      return consignacionesApi.getByIdOrPropertyId(id);
    },
    [id],
    false,
    0,
    ['consignaciones'],
  );
  return { consignacion: data, ...rest };
}

// ============================================================================
// Pipeline
// ============================================================================

export function usePipelineItems(options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData(() => pipelineApi.getAll(), [], options?.skip, 0, ['pipeline']);
  return { pipelineItems: data ?? (SIN_DATOS as never[]), ...rest };
}

// ============================================================================
// Cobros
// ============================================================================

export function useCobros(params?: Parameters<typeof cobrosApi.getAll>[0], options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData(
    () => cobrosApi.getAll(params),
    [params?.month, params?.status, params?.propietarioId],
    options?.skip,
    0,
    ['cobros'],
  );
  return { cobros: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useCobroSummary(month: string) {
  const { data, ...rest } = useApiData(
    () => cobrosApi.getSummary(month),
    [month],
    false,
    0,
    ['cobros'],
  );
  return { summary: data, ...rest };
}

// ============================================================================
// Avalúos (agency records-by-state)
// ============================================================================

/**
 * The agency's own avalúos, optionally filtered by lifecycle state and paginated.
 * Mirrors useCobros: `data` (the paginated envelope) plus convenience `avaluos`
 * (its items), `total`, and `pageSize`. Empty until Phase 2 #3 wires the request
 * flow that tags new avalúos with the agency email.
 */
export function useAgencyAvaluos(
  params?: { state?: string; page?: number },
  options?: { skip?: boolean },
) {
  const { data, ...rest } = useApiData(
    () => avaluosApi.list(params),
    [params?.state, params?.page],
    options?.skip,
    0,
    ['avaluos'],
  );
  return {
    data,
    avaluos: data?.items ?? (SIN_DATOS as never[]),
    total: data?.total ?? 0,
    pageSize: data?.pageSize ?? 100,
    ...rest,
  };
}

// ============================================================================
// Dispersiones
// ============================================================================

export function useDispersiones(params?: Parameters<typeof dispersionesApi.getAll>[0]) {
  const { data, ...rest } = useApiData(
    () => dispersionesApi.getAll(params),
    [params?.month, params?.status, params?.propietarioId],
    false,
    0,
    ['dispersiones'],
  );
  return { dispersiones: data ?? (SIN_DATOS as never[]), ...rest };
}

// ============================================================================
// Mantenimiento
// ============================================================================

export function useMantenimientos(params?: Parameters<typeof mantenimientoApi.getAll>[0], options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData(
    () => mantenimientoApi.getAll(params),
    [params?.status, params?.consignacionId],
    options?.skip,
    0,
    ['mantenimiento'],
  );
  return { mantenimientos: data ?? (SIN_DATOS as never[]), ...rest };
}

// ============================================================================
// Renovaciones
// ============================================================================

export function useRenovaciones() {
  const { data, ...rest } = useApiData(() => renovacionesApi.getAll(), [], false, 0, ['renovaciones']);
  return { renovaciones: data ?? (SIN_DATOS as never[]), ...rest };
}

// ============================================================================
// Dashboard KPIs
// ============================================================================

export function useInmobiliariaDashboard(options?: { skip?: boolean; pollMs?: number }) {
  const { data, ...rest } = useApiData(
    () => inmobiliariaDashboardApi.getKPIs(),
    [],
    options?.skip,
    options?.pollMs,
    ['cobros', 'dispersiones', 'consignaciones'],
  );
  return { kpis: data, ...rest };
}

// ============================================================================
// Reportes
// ============================================================================

export function useCarteraReport() {
  const { data, ...rest } = useApiData(() => reportesApi.getCartera(), [], false, 0, ['cobros']);
  return { report: data, ...rest };
}

export function useOcupacionReport() {
  const { data, ...rest } = useApiData(() => reportesApi.getOcupacion(), [], false, 0, ['consignaciones']);
  return { report: data, ...rest };
}

export function useComisionesReport(month: string) {
  const { data, ...rest } = useApiData(
    () => reportesApi.getComisiones(month),
    [month],
    false,
    0,
    ['dispersiones', 'cobros'],
  );
  return { report: data, ...rest };
}

export function useVencimientosReport() {
  const { data, ...rest } = useApiData(() => reportesApi.getVencimientos(), [], false, 0, ['contratos', 'renovaciones']);
  return { report: data, ...rest };
}

export function useFlujoCajaReport(period?: number | string) {
  // Accept string periods like 'semester', 'quarter', 'year' for backwards compat.
  // Map them to month counts; numeric values pass through as-is.
  const months: number | undefined =
    typeof period === 'number' ? period :
    period === 'semester' ? 6 :
    period === 'quarter' ? 3 :
    period === 'year' ? 12 :
    typeof period === 'string' ? undefined : period;

  const { data, ...rest } = useApiData(
    () => reportesApi.getFlujoCaja(months),
    [months],
    false,
    0,
    ['cobros', 'dispersiones'],
  );
  return { report: data, ...rest };
}

export function useRendimientoAgentesReport(month?: string) {
  const { data, ...rest } = useApiData(
    () => reportesApi.getRendimientoAgentes(month),
    [month],
    false,
    0,
    ['agentes', 'consignaciones'],
  );
  return { report: data, ...rest };
}

export function useExtractoPropietario(propietarioId: string | undefined, month?: string) {
  const { data, ...rest } = useApiData(
    () => (propietarioId ? propietariosApi.getExtracto(propietarioId, month) : Promise.reject('No ID')),
    [propietarioId, month],
    false,
    0,
    ['dispersiones', 'cobros'],
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
  return { trends: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useForecastData() {
  const { data, ...rest } = useApiData(() => analyticsApi.getForecasts(), []);
  return { forecasts: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useAiMetrics(options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData<AiMetricsResponse>(
    () => aiApi.getMetrics(),
    [],
    options?.skip
  );
  return { metrics: data, ...rest };
}

export function useAiActivity(limit?: number, options?: { skip?: boolean }) {
  const { data, ...rest } = useApiData<AiActivityResponse>(
    () => aiApi.getActivity(limit),
    [limit],
    options?.skip
  );
  return { activity: data, ...rest };
}

// ============================================================================
// Documentos
// ============================================================================

export function useDocumentTemplates() {
  const { data, ...rest } = useApiData(() => documentosApi.getTemplates(), [], false, 0, ['templates']);
  return { templates: data ?? (SIN_DATOS as never[]), ...rest };
}

export function usePropertyDocuments(params?: Parameters<typeof documentosApi.getDocuments>[0]) {
  const { data, ...rest } = useApiData(
    () => documentosApi.getDocuments(params),
    [params?.consignacionId, params?.category],
    false,
    0,
    ['documents'],
  );
  return { documents: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useActasEntrega() {
  const { data, ...rest } = useApiData(() => actasApi.getAll(), [], false, 0, ['actas']);
  return { actas: data ?? (SIN_DATOS as never[]), ...rest };
}

// ============================================================================
// Configuracion
// ============================================================================

/**
 * Config overview from GET /inmobiliaria/config.
 * `config.agency` carries the real agency profile (name, nit, phone, logoUrl,
 * financial defaults, memberRole...). There are no top-level `name`/`branding`
 * fields — that shape never existed in the backend.
 */
export function useInmobiliariaConfig() {
  const { data, ...rest } = useApiData(
    () => inmobiliariaConfigApi.getConfigOverview(),
    [],
    false,
    0,
    ['config', 'agency'],
  );
  return { config: data, ...rest };
}

export function useAgencyUsers(enabled = true) {
  const { data, ...rest } = useApiData(
    () => inmobiliariaConfigApi.getUsers(),
    [enabled],
    !enabled,
    0,
    ['agency', 'agentes'],
  );
  return { users: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useAgencyIntegrations() {
  const { data, ...rest } = useApiData(
    () => inmobiliariaConfigApi.getIntegrations(),
    [],
    false,
    0,
    ['agency'],
  );
  return { integrations: data ?? (SIN_DATOS as never[]), ...rest };
}

export function useAgencyBilling() {
  const [billing, setBilling] = useState<AgencyBilling | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorCrudo(null);
      const [b, i] = await Promise.all([
        inmobiliariaConfigApi.getBilling(),
        inmobiliariaConfigApi.getInvoices(),
      ]);
      setBilling(b);
      setInvoices(i);
    } catch (e) {
      setErrorCrudo(e);
      setError(e instanceof Error ? e.message : 'Error al cargar facturacion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Este hook no pasa por `useApiData` (pide dos cosas a la vez), así que se
  // suscribe a mano — si no, sería el único que se queda mostrando lo viejo.
  useEffect(() => alCambiar(['agency', 'billing'], () => void refetch()), [refetch]);

  return { billing, invoices, isLoading, error, errorCrudo, refetch };
}

// Re-export API services for direct use in event handlers
export {
  propietariosApi,
  agentesApi,
  consignacionesApi,
  pipelineApi,
  cobrosApi,
  avaluosApi,
  dispersionesApi,
  mantenimientoApi,
  renovacionesApi,
  reportesApi,
  analyticsApi,
  documentosApi,
  actasApi,
  inmobiliariaConfigApi,
};
