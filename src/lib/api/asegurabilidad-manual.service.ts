import { apiClient, ApiError, getAccessToken } from '@/lib/api/client';
import { cabecerasDeLaCuenta } from '@/lib/auth/cuenta-activa';

/**
 * LA ASEGURABILIDAD MANUAL (Nico, 28-10-2026: «mientras tenemos lo de automático de asegurabilidad deberíamos de tener
 * esto»). Back: `src/inmobiliaria/asegurabilidad-manual/`.
 *   · La inmobiliaria: `/inmobiliaria/asegurabilidad-manual/configuracion` y `…/postulaciones/:applicationId`.
 *   · Quien se postuló: `/applications/:applicationId/aprobacion-de-la-inmobiliaria` (al inquilino se le dice
 *     «aprobación», nunca «estudio»: docs/VOCABULARIO.md).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export type FormaDePagoDelEstudio = 'COMPROBANTE' | 'WOMPI';
export type EstadoDelComprobante = 'POR_REVISAR' | 'ACEPTADO' | 'RECHAZADO';
export type ResultadoDeLaAseguradora = 'APROBADO' | 'NO_APROBADO';

export interface ConfiguracionDeLaAsegurabilidadManual {
  disponible: boolean;
  activa: boolean;
  precioCop: number | null;
  cuentaId: string | null;
  formas: FormaDePagoDelEstudio[];
  aseguradoraIds: string[];
  formasDisponibles: FormaDePagoDelEstudio[];
  cuentas: Array<{
    id: string;
    nombre: string;
    tipoLegible: string;
    banco: string | null;
    tipoDeCuenta: string | null;
    numeroEnmascarado: string | null;
  }>;
  aseguradoras: Array<{ id: string; nombre: string; nit: string; activa: boolean }>;
}

export interface AsegurabilidadDeLaPostulacion {
  disponible: boolean;
  activa: boolean;
  precioCop: number | null;
  estudioVigente: { vigente: boolean; numeroRecibo: number | null; pagadoEl: string | null; vigenteHasta: string | null } | null;
  comprobante: {
    estado: EstadoDelComprobante;
    subidoAt: string | null;
    tipo: string | null;
    url: string | null;
    motivo: string | null;
    revisadoAt: string | null;
  } | null;
  aseguradoras: Array<{
    id: string;
    nombre: string;
    resultado: {
      estado: ResultadoDeLaAseguradora;
      maximoAfianzableCop: number | null;
      nota: string | null;
      marcadoAt: string;
    } | null;
  }>;
  maximoAfianzableCop: number | null;
}

export interface AprobacionDeLaInmobiliaria {
  pide: boolean;
  inmobiliaria: string | null;
  precioCop: number | null;
  formas: FormaDePagoDelEstudio[];
  cuenta: {
    tipoLegible: string;
    nombre: string;
    banco: string | null;
    tipoDeCuenta: string | null;
    numero: string | null;
    titular: string | null;
    instrucciones: string | null;
    enlace: string | null;
  } | null;
  pagadaHasta: string | null;
  comprobante: { estado: EstadoDelComprobante; subidoAt: string | null; motivo: string | null } | null;
  aprobacion: 'APROBADA' | 'NO_APROBADA' | 'EN_REVISION' | null;
  aprobadaPor: string[];
  topeAprobadoCop: number | null;
}

const RAIZ = '/inmobiliaria/asegurabilidad-manual';

export const asegurabilidadManualApi = {
  configuracion: () => apiClient.get<ConfiguracionDeLaAsegurabilidadManual>(`${RAIZ}/configuracion`),
  guardarConfiguracion: (datos: {
    activa: boolean;
    precioCop?: number;
    cuentaId?: string | null;
    formas?: FormaDePagoDelEstudio[];
    aseguradoraIds?: string[];
  }) => apiClient.put<ConfiguracionDeLaAsegurabilidadManual>(`${RAIZ}/configuracion`, datos),
  deLaPostulacion: (applicationId: string) =>
    apiClient.get<AsegurabilidadDeLaPostulacion>(`${RAIZ}/postulaciones/${encodeURIComponent(applicationId)}`),
  aceptar: (applicationId: string, datos: { fecha?: string; referencia?: string } = {}) =>
    apiClient.post<AsegurabilidadDeLaPostulacion>(
      `${RAIZ}/postulaciones/${encodeURIComponent(applicationId)}/comprobante/aceptar`,
      datos,
    ),
  rechazar: (applicationId: string, motivo: string) =>
    apiClient.post<AsegurabilidadDeLaPostulacion>(
      `${RAIZ}/postulaciones/${encodeURIComponent(applicationId)}/comprobante/rechazar`,
      { motivo },
    ),
  marcar: (
    applicationId: string,
    aseguradoraId: string,
    datos: { estado: ResultadoDeLaAseguradora | null; maximoAfianzableCop?: number | null; nota?: string | null },
  ) =>
    apiClient.put<AsegurabilidadDeLaPostulacion>(
      `${RAIZ}/postulaciones/${encodeURIComponent(applicationId)}/resultados/${encodeURIComponent(aseguradoraId)}`,
      datos,
    ),
};

export const aprobacionDeLaInmobiliariaApi = {
  ver: (applicationId: string) =>
    apiClient.get<AprobacionDeLaInmobiliaria>(`/applications/${encodeURIComponent(applicationId)}/aprobacion-de-la-inmobiliaria`),
  async subirComprobante(applicationId: string, archivo: File): Promise<AprobacionDeLaInmobiliaria> {
    const formulario = new FormData();
    formulario.append('file', archivo);
    const token = getAccessToken();
    let respuesta: Response;
    try {
      respuesta = await fetch(
        `${BACKEND_URL}/applications/${encodeURIComponent(applicationId)}/aprobacion-de-la-inmobiliaria/comprobante`,
        {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...cabecerasDeLaCuenta() },
          body: formulario,
        },
      );
    } catch (error) {
      throw new ApiError(0, `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`);
    }
    const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
    if (!respuesta.ok) {
      throw new ApiError(
        respuesta.status,
        typeof cuerpo.message === 'string' ? cuerpo.message : 'No pudimos subir el comprobante.',
        typeof cuerpo.code === 'string' ? cuerpo.code : undefined,
        cuerpo,
      );
    }
    return cuerpo as unknown as AprobacionDeLaInmobiliaria;
  },
};
