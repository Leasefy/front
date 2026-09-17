/**
 * `/inmobiliaria/finanzas` — el cliente del contrato congelado del 17-09.
 *
 * Una función por endpoint, con el mismo nombre que la pieza del contrato y
 * nada más: acá no se calcula, no se reordena y no se rellena. Lo que el back
 * devuelve es lo que la pantalla pinta.
 *
 * Ver `finanzas.types.ts` para el porqué de `disponible: false` (lecturas) y
 * del 503 con `code` (escrituras).
 */

import { apiClient, ApiError } from '@/lib/api/client';
import {
  CODIGOS_SIN_MIGRAR,
  type CambiosDeCostos,
  type CambiosDeLaSede,
  type CertificadoDeRetenciones,
  type CodigoSinMigrar,
  type CostosDeLaPlata,
  type CriterioDeRetencion,
  type DeterioroDelMes,
  type DevolucionRegistrada,
  type Emision,
  type GirosDevueltos,
  type MediosDeRecibo,
  type NuevaDevolucion,
  type NuevaSede,
  type NuevaTasaDeUsura,
  type PropuestaDeDeterioro,
  type ProvisionAprobada,
  type ProvisionDeCartera,
  type Regiro,
  type Sede,
  type Sedes,
  type TableroFinanciero,
  type TasaDeUsura,
  type TasasDeUsura,
} from './finanzas.types';

const BASE = '/inmobiliaria/finanzas';

/** `?a=1&b=2`, saltándose lo vacío. `''` cuando no queda nada. */
function query(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === null || valor === undefined || valor === '') continue;
    q.set(clave, String(valor));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * ¿Este fallo es «falta una migración»? Devuelve el `code` o `null`.
 *
 * Se mira el `code` y no el 503 a secas: un 503 del balanceador no se explica
 * con «la aplica Víctor».
 */
export function codigoSinMigrar(error: unknown): CodigoSinMigrar | null {
  if (!(error instanceof ApiError)) return null;
  const codigo = error.code as CodigoSinMigrar | undefined;
  if (codigo && (CODIGOS_SIN_MIGRAR as readonly string[]).includes(codigo)) return codigo;
  return null;
}

export const finanzasApi = {
  // ── 1. Tablero ──────────────────────────────────────────────────────────
  /** Permiso `dashboard:view`. `sedeId` vacío = consolidado. */
  tablero: (mes: string, sedeId?: string | null) =>
    apiClient.get<TableroFinanciero>(`${BASE}/tablero${query({ mes, sedeId })}`),

  // ── 2. Tasas de usura ───────────────────────────────────────────────────
  /** Permiso `cobros:view`. */
  usura: (desde?: string, hasta?: string) =>
    apiClient.get<TasasDeUsura>(`${BASE}/usura${query({ desde, hasta })}`),

  /** Permiso `cobros:edit`. 503 `USURA_SIN_MIGRAR`. */
  guardarUsura: (tasa: NuevaTasaDeUsura) => apiClient.put<TasaDeUsura>(`${BASE}/usura`, tasa),

  /** Permiso `cobros:edit`. Sólo borra la tasa PROPIA de la agencia. */
  borrarUsura: (id: string) => apiClient.delete<void>(`${BASE}/usura/${encodeURIComponent(id)}`),

  // ── 3. Deterioro ────────────────────────────────────────────────────────
  /** Permiso `reportes:view`. */
  deterioro: (mes: string, sedeId?: string | null) =>
    apiClient.get<DeterioroDelMes>(`${BASE}/deterioro${query({ mes, sedeId })}`),

  /** Permiso `reportes:edit`. Deja la provisión en PROPUESTA. */
  proponerDeterioro: (propuesta: PropuestaDeDeterioro) =>
    apiClient.post<ProvisionDeCartera>(`${BASE}/deterioro`, propuesta),

  /**
   * Permiso `reportes:edit`. Deja la provisión en APROBADA (y la asienta).
   * Devuelve además `mismoAprobador`: la propuso y la aprobó la misma persona.
   */
  aprobarDeterioro: (id: string) =>
    apiClient.post<ProvisionAprobada>(`${BASE}/deterioro/${encodeURIComponent(id)}/aprobar`),

  /** Permiso `reportes:edit`. Deja la provisión en ANULADA. */
  anularDeterioro: (id: string, motivo: string) =>
    apiClient.post<ProvisionDeCartera>(`${BASE}/deterioro/${encodeURIComponent(id)}/anular`, { motivo }),

  // ── 4. Sedes ────────────────────────────────────────────────────────────
  /** Permiso `configuracion:view`. */
  sedes: () => apiClient.get<Sedes>(`${BASE}/sedes`),

  /** Permiso `configuracion:edit`. 503 `SEDES_SIN_MIGRAR`. */
  crearSede: (sede: NuevaSede) => apiClient.post<Sede>(`${BASE}/sedes`, sede),

  /** Permiso `configuracion:edit`. */
  editarSede: (id: string, cambios: CambiosDeLaSede) =>
    apiClient.patch<Sede>(`${BASE}/sedes/${encodeURIComponent(id)}`, cambios),

  /** Permiso `configuracion:edit`. Cuántos inmuebles y contratos quedaron. */
  asignarASede: (id: string, que: { propertyIds?: string[]; contractIds?: string[] }) =>
    apiClient.post<{ inmuebles: number; contratos: number }>(
      `${BASE}/sedes/${encodeURIComponent(id)}/asignar`,
      que,
    ),

  // ── 5. Medios de recibo ─────────────────────────────────────────────────
  /** Permiso `configuracion:view`. */
  medios: () => apiClient.get<MediosDeRecibo>(`${BASE}/medios`),

  /** Permiso `configuracion:edit`. 503 `COSTOS_SIN_MIGRAR`. */
  guardarMedios: (apagados: string[]) => apiClient.put<MediosDeRecibo>(`${BASE}/medios`, { apagados }),

  // ── 6. Costos de la plata ───────────────────────────────────────────────
  /** Permiso `configuracion:view`. */
  costos: () => apiClient.get<CostosDeLaPlata>(`${BASE}/costos`),

  /** Permiso `configuracion:edit`. 503 `COSTOS_SIN_MIGRAR`. */
  guardarCostos: (cambios: CambiosDeCostos) =>
    apiClient.put<CostosDeLaPlata>(`${BASE}/costos`, cambios),

  // ── 7. Certificado anual de retenciones ─────────────────────────────────
  /** Permiso `reportes:view`. */
  certificado: (anio: number, criterio: CriterioDeRetencion) =>
    apiClient.get<CertificadoDeRetenciones>(
      `${BASE}/retenciones/certificado${query({ anio, criterio })}`,
    ),

  /** Permiso `reportes:edit`. Fija número y fecha: es el ACTO de emitir. */
  emitirCertificado: (anio: number, propietarioId: string, criterio?: CriterioDeRetencion) =>
    apiClient.post<Emision>(`${BASE}/retenciones/certificado/emitir`, {
      anio,
      propietarioId,
      ...(criterio ? { criterio } : {}),
    }),

  // ── 8. Giros devueltos ──────────────────────────────────────────────────
  /** Permiso `dispersiones:view`. */
  girosDevueltos: (estado: 'VIVOS' | 'TODOS' = 'VIVOS') =>
    apiClient.get<GirosDevueltos>(`${BASE}/giros-devueltos${query({ estado })}`),

  /** Permiso `dispersiones:edit`. 503 `GIROS_DEVUELTOS_SIN_MIGRAR`. */
  marcarDevuelto: (devolucion: NuevaDevolucion) =>
    apiClient.post<DevolucionRegistrada>(`${BASE}/giros-devueltos`, devolucion),

  /** Permiso `dispersiones:edit`. `fecha` = el día del giro que sí salió. */
  regirar: (id: string, dispersionNuevaId: string, fecha: string) =>
    apiClient.post<Regiro>(`${BASE}/giros-devueltos/${encodeURIComponent(id)}/regirar`, {
      dispersionNuevaId,
      fecha,
    }),
};
