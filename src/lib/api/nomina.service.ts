/**
 * `/inmobiliaria/nomina` — el cliente del back de nómina.
 *
 * Una función por endpoint, con el mismo nombre que la pieza del back y nada
 * más: acá no se calcula, no se reordena y no se rellena. Lo que el back
 * devuelve es lo que la pantalla pinta — es la misma regla de
 * `finanzas.service.ts`, y en nómina pesa más: un peso inventado del lado del
 * navegador es un desprendible mal pagado.
 */

import { apiClient, ApiError } from '@/lib/api/client';
import {
  CODIGOS_DE_NOMINA,
  type BorradorArmado,
  type CatalogoDeNovedades,
  type CatalogoDePersonas,
  type CodigoDeNomina,
  type Conceptos,
  type ConceptoDeNomina,
  type CruceDeProvision,
  type Definitiva,
  type Desprendible,
  type DocumentoDeNomina,
  type EstadoDeNomina,
  type FactoresDeNomina,
  type NominaElectronica,
  type Novedades,
  type NovedadDeNomina,
  type ParametrosDelAnio,
  type ParametrosGuardados,
  type PeriodoConLiquidaciones,
  type PeriodoDeNomina,
  type Periodos,
  type PersonaDeNomina,
  type Personas,
  type Provisiones,
  type ResumenDelMes,
} from './nomina.types';

const BASE = '/inmobiliaria/nomina';

/** `?a=1&b=2`, saltándose lo vacío. `''` cuando no queda nada. */
function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === null || valor === undefined || valor === '') continue;
    q.set(clave, String(valor));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * ¿Qué clase de «no se puede» es este fallo? Devuelve el `code` o `null`.
 *
 * 🔴 Se mira el `code` y NO el número: un 402 de un balanceador no se explica
 * con «contrata el módulo», y un 503 genérico no se explica con «la aplica
 * Víctor». Las tres causas se ven igual desde afuera y son problemas de tres
 * personas distintas.
 */
export function codigoDeNomina(error: unknown): CodigoDeNomina | null {
  if (!(error instanceof ApiError)) return null;
  const codigo = error.code as CodigoDeNomina | undefined;
  if (codigo && (CODIGOS_DE_NOMINA as readonly string[]).includes(codigo)) {
    return codigo;
  }
  return null;
}

/** ¿El módulo no está comprado? Es la pregunta que decide la pantalla entera. */
export function noEstaHabilitada(error: unknown): boolean {
  return codigoDeNomina(error) === 'NOMINA_NO_HABILITADA';
}

/** ¿Faltan migraciones? Las aplica Víctor. */
export function faltaLaMigracion(error: unknown): boolean {
  return codigoDeNomina(error) === 'NOMINA_SIN_MIGRAR';
}

/** ¿Faltan las cifras del año? Las carga la inmobiliaria. */
export function faltanLosParametros(error: unknown): boolean {
  const c = codigoDeNomina(error);
  return c === 'NOMINA_SIN_PARAMETROS' || c === 'NOMINA_PARAMETROS_INCOMPLETOS';
}

/** Lo que el back manda en el cuerpo del 422 de parámetros o de mapeo. */
export function detalleDelFallo(error: unknown): {
  queFalta?: string[];
  conceptos?: string[];
  cuentas?: string[];
  migraciones?: string[];
} {
  if (!(error instanceof ApiError)) return {};
  // `detalle` es el cuerpo del error entero y sin tocar (ver `client.ts`): el
  // back manda ahí la parte que importa —cuáles cifras faltan, cuáles conceptos
  // están sin cuenta— y `message` sola no alcanza.
  const cuerpo = error.detalle;
  if (!cuerpo || typeof cuerpo !== 'object') return {};
  const lista = (k: string) =>
    Array.isArray(cuerpo[k]) ? (cuerpo[k] as string[]) : undefined;
  return {
    queFalta: lista('queFalta'),
    conceptos: lista('conceptos'),
    cuentas: lista('cuentas'),
    migraciones: lista('migraciones'),
  };
}

export const nominaApi = {
  // ── El estado del módulo ─────────────────────────────────────────────────
  estado: (anio?: number) =>
    apiClient.get<EstadoDeNomina>(`${BASE}/estado${query({ anio })}`),

  resumen: (mes: string) =>
    apiClient.get<ResumenDelMes>(`${BASE}/resumen${query({ mes })}`),

  // ── Parámetros ───────────────────────────────────────────────────────────
  parametros: (anio?: number) =>
    apiClient.get<ParametrosDelAnio>(`${BASE}/parametros${query({ anio })}`),

  guardarParametros: (
    anio: number,
    dto: Partial<FactoresDeNomina> & {
      salarioMinimoCop?: number | null;
      auxilioTransporteCop?: number | null;
      uvtCop?: number | null;
      notas?: string | null;
      confirmado?: boolean;
    },
  ) =>
    apiClient.put<ParametrosGuardados & { queFalta: string[] }>(
      `${BASE}/parametros/${anio}`,
      dto,
    ),

  // ── Personas ─────────────────────────────────────────────────────────────
  catalogoDePersonas: () =>
    apiClient.get<CatalogoDePersonas>(`${BASE}/personas/catalogo`),

  personas: (filtros: {
    tipo?: string;
    activo?: boolean;
    sedeId?: string;
    busqueda?: string;
  } = {}) => apiClient.get<Personas>(`${BASE}/personas${query(filtros)}`),

  persona: (id: string) =>
    apiClient.get<PersonaDeNomina>(`${BASE}/personas/${id}`),

  crearPersona: (dto: Record<string, unknown>) =>
    apiClient.post<PersonaDeNomina>(`${BASE}/personas`, dto),

  actualizarPersona: (id: string, dto: Record<string, unknown>) =>
    apiClient.patch<PersonaDeNomina>(`${BASE}/personas/${id}`, dto),

  retirarPersona: (
    id: string,
    dto: { fechaRetiro: string; causalRetiro: string },
  ) => apiClient.post<PersonaDeNomina>(`${BASE}/personas/${id}/retirar`, dto),

  reactivarPersona: (id: string) =>
    apiClient.post<PersonaDeNomina>(`${BASE}/personas/${id}/reactivar`, {}),

  // ── Conceptos ────────────────────────────────────────────────────────────
  conceptos: () => apiClient.get<Conceptos>(`${BASE}/conceptos`),

  sembrarConceptos: () =>
    apiClient.post<{ creados: number; reparados: number; total: number; aviso: string }>(
      `${BASE}/conceptos/sembrar`,
      {},
    ),

  crearConcepto: (dto: Record<string, unknown>) =>
    apiClient.post<ConceptoDeNomina>(`${BASE}/conceptos`, dto),

  actualizarConcepto: (id: string, dto: Record<string, unknown>) =>
    apiClient.patch<ConceptoDeNomina>(`${BASE}/conceptos/${id}`, dto),

  borrarConcepto: (id: string) =>
    apiClient.delete<void>(`${BASE}/conceptos/${id}`),

  // ── Novedades ────────────────────────────────────────────────────────────
  catalogoDeNovedades: () =>
    apiClient.get<CatalogoDeNovedades>(`${BASE}/novedades/catalogo`),

  novedades: (filtros: {
    personaId?: string;
    desde?: string;
    hasta?: string;
    soloLibres?: boolean;
  } = {}) => apiClient.get<Novedades>(`${BASE}/novedades${query(filtros)}`),

  crearNovedad: (dto: Record<string, unknown>) =>
    apiClient.post<NovedadDeNomina>(`${BASE}/novedades`, dto),

  actualizarNovedad: (id: string, dto: Record<string, unknown>) =>
    apiClient.patch<NovedadDeNomina>(`${BASE}/novedades/${id}`, dto),

  borrarNovedad: (id: string) =>
    apiClient.delete<void>(`${BASE}/novedades/${id}`),

  // ── Períodos ─────────────────────────────────────────────────────────────
  periodos: (filtros: { mes?: string; estado?: string } = {}) =>
    apiClient.get<Periodos>(`${BASE}/periodos${query(filtros)}`),

  periodo: (id: string) =>
    apiClient.get<PeriodoConLiquidaciones>(`${BASE}/periodos/${id}`),

  armarBorrador: (dto: {
    mes: string;
    quincena?: number | null;
    personaIds?: string[];
  }) => apiClient.post<BorradorArmado>(`${BASE}/periodos/borrador`, dto),

  aprobar: (id: string) =>
    apiClient.post<PeriodoConLiquidaciones>(`${BASE}/periodos/${id}/aprobar`, {}),

  anular: (id: string, motivo: string) =>
    apiClient.post<{ anulado: boolean; asientoPorReversar: string | null; aviso: string | null }>(
      `${BASE}/periodos/${id}/anular`,
      { motivo },
    ),

  asentar: (id: string) =>
    apiClient.post<{
      yaEstaba: boolean;
      asientoId: string;
      numero?: number;
      totalCop?: number;
      mensaje: string;
    }>(`${BASE}/periodos/${id}/asentar`, {}),

  marcarPagado: (
    id: string,
    dto: { loteDeEgresosId?: string | null; fecha?: string } = {},
  ) =>
    apiClient.post<{ periodo: PeriodoDeNomina; aviso: string | null }>(
      `${BASE}/periodos/${id}/pagado`,
      dto,
    ),

  desprendible: (id: string) =>
    apiClient.get<Desprendible>(`${BASE}/liquidaciones/${id}`),

  // ── Liquidación definitiva ───────────────────────────────────────────────
  causales: () =>
    apiClient.get<{
      causales: readonly string[];
      conIndemnizacion: readonly string[];
      aviso: string;
    }>(`${BASE}/definitiva/causales`),

  definitiva: (personaId: string, dto: Record<string, unknown>) =>
    apiClient.post<Definitiva>(`${BASE}/personas/${personaId}/definitiva`, dto),

  // ── Provisiones ──────────────────────────────────────────────────────────
  catalogoDeProvisiones: () =>
    apiClient.get<{
      tipos: {
        tipo: string;
        nombre: string;
        codigo: string;
        incluyeAuxilio: boolean;
        incluyeHorasExtras: boolean;
        seCausaConSalarioIntegral: boolean;
        fuente: string;
      }[];
    }>(`${BASE}/provisiones/catalogo`),

  provisiones: (personaId?: string) =>
    apiClient.get<Provisiones>(`${BASE}/provisiones${query({ personaId })}`),

  registrarPagoDePrestacion: (dto: {
    personaId: string;
    tipo: string;
    desde: string;
    hasta: string;
    valorCop: number;
    fechaPago: string;
    notas?: string | null;
    loteDeEgresosId?: string | null;
  }) =>
    apiClient.post<{
      pago: Record<string, unknown>;
      cruce: CruceDeProvision;
      aviso: string | null;
    }>(`${BASE}/provisiones/pagos`, dto),

  // ── Nómina electrónica ───────────────────────────────────────────────────
  electronica: (filtros: { periodo?: string; estado?: string } = {}) =>
    apiClient.get<NominaElectronica>(`${BASE}/electronica${query(filtros)}`),

  generarElectronica: (periodoId: string) =>
    apiClient.post<{
      generados: number;
      yaTenian: number;
      mensaje: string;
    }>(`${BASE}/periodos/${periodoId}/electronica/generar`, {}),

  transmitir: (documentoId: string) =>
    apiClient.post<{
      estado: string;
      yaEstaba: boolean;
      cune?: string | null;
      errores?: string[];
      esDePrueba?: boolean;
      mensaje: string;
    }>(`${BASE}/electronica/${documentoId}/transmitir`, {}),

  ajustar: (
    documentoId: string,
    dto: { tipo: 'AJUSTE_REEMPLAZAR' | 'AJUSTE_ELIMINAR'; motivo: string },
  ) =>
    apiClient.post<{ documento: DocumentoDeNomina; mensaje: string }>(
      `${BASE}/electronica/${documentoId}/ajustar`,
      dto,
    ),
};
