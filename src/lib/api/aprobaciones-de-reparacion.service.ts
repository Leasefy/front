/**
 * 🔴 D12 — las reparaciones a cargo del propietario las aprueba el propietario
 * (Nico y Juan Camilo, 17-09-2026), con excepción de EMERGENCIA.
 *
 *   · La inmobiliaria: `POST /inmobiliaria/mantenimiento/:id/emergencia`
 *     (multipart `soporte`) y la bandeja
 *     `GET /inmobiliaria/mantenimiento/aprobaciones?estado=`.
 *   · El propietario, desde su portal (la sesión dice quién es):
 *     `GET /portal/aprobaciones-de-reparacion`, `POST …/:id/aprobar`,
 *     `POST …/:id/rechazar`, `GET …/:id/soporte`.
 */

import { apiClient, ApiError, getAccessToken } from '@/lib/api/client';
import { mantenimientoDelBack } from '@/lib/api/mantenimiento-enums';
import type {
  AprobacionDeReparacion,
  AprobacionEnElPortal,
  AprobacionEnLaBandeja,
  CargoDeLaReparacion,
  EstadoDeLaAprobacion,
} from '@/lib/types/deducciones';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const aprobacionesDeReparacionApi = {
  /**
   * Aprobar por EMERGENCIA: se descuenta de una y el aviso queda generado. El
   * back responde 400 sin motivo o sin soporte, y 503 sin la migración, los dos
   * con el motivo en palabras.
   */
  async registrarEmergencia(
    solicitudId: string,
    quoteId: string,
    motivo: string,
    soporte: File,
  ): Promise<SolicitudMantenimiento & { cargo?: CargoDeLaReparacion }> {
    const formulario = new FormData();
    formulario.append('quoteId', quoteId);
    formulario.append('motivo', motivo);
    formulario.append('soporte', soporte);
    const token = getAccessToken();
    let respuesta: Response;
    try {
      respuesta = await fetch(
        `${BACKEND_URL}/inmobiliaria/mantenimiento/${solicitudId}/emergencia`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formulario,
        },
      );
    } catch (error) {
      throw new ApiError(
        0,
        `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
    if (!respuesta.ok) {
      const mensaje = Array.isArray(cuerpo.message)
        ? (cuerpo.message as string[])
        : typeof cuerpo.message === 'string'
          ? cuerpo.message
          : 'No se pudo registrar la emergencia';
      throw new ApiError(
        respuesta.status,
        mensaje,
        typeof cuerpo.code === 'string' ? cuerpo.code : undefined,
      );
    }
    const solicitud = cuerpo as unknown as SolicitudMantenimiento & { cargo?: CargoDeLaReparacion };
    return { ...mantenimientoDelBack(solicitud), cargo: solicitud.cargo };
  },

  /** La bandeja: por defecto, las pendientes y las rechazadas. */
  async bandeja(estado?: EstadoDeLaAprobacion): Promise<AprobacionEnLaBandeja[]> {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
    return apiClient.get<AprobacionEnLaBandeja[]>(`/inmobiliaria/mantenimiento/aprobaciones${q}`);
  },

  /** Las del propietario que mira, resueltas por su sesión. */
  async delPortal(): Promise<{ pendientes: AprobacionEnElPortal[]; historial: AprobacionEnElPortal[] }> {
    return apiClient.get(`/portal/aprobaciones-de-reparacion`);
  },

  async aprobar(id: string): Promise<AprobacionDeReparacion & { deduccionIds: string[] }> {
    return apiClient.post(`/portal/aprobaciones-de-reparacion/${encodeURIComponent(id)}/aprobar`, {});
  },

  async rechazar(id: string, motivo?: string): Promise<AprobacionDeReparacion> {
    return apiClient.post(
      `/portal/aprobaciones-de-reparacion/${encodeURIComponent(id)}/rechazar`,
      motivo?.trim() ? { motivo: motivo.trim() } : {},
    );
  },

  async soporte(id: string): Promise<{ url: string }> {
    return apiClient.get(`/portal/aprobaciones-de-reparacion/${encodeURIComponent(id)}/soporte`);
  },
};
