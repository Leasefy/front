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
  BandejaConElPropietario,
  CargoDeLaReparacion,
  ConfiguracionDeReparaciones,
  GrupoConElPropietario,
  PrioridadDelBack,
  ReparacionQueHagoYo,
  DetalleDeLaReparacionEnElPortal,
  EstadoDeLaAprobacion,
  PaginaDelHistorialDeAprobaciones,
} from '@/lib/types/deducciones';
import type { LaHaceElPropietario, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import { cabecerasDeLaCuenta } from '@/lib/auth/cuenta-activa';

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
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...cabecerasDeLaCuenta() },
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

  /** Lo ya decidido, por páginas (Nico, 12-10-2026). */
  async historialDelPortal(pagina: number, porPagina: number): Promise<PaginaDelHistorialDeAprobaciones> {
    return apiClient.get(`/portal/aprobaciones-de-reparacion/historial?pagina=${pagina}&porPagina=${porPagina}`);
  },

  /** Todo lo de una reparación: fotos, la cotización aprobada, lo que se hizo y lo descontado. */
  async detalleDelPortal(id: string): Promise<DetalleDeLaReparacionEnElPortal> {
    return apiClient.get(`/portal/aprobaciones-de-reparacion/${encodeURIComponent(id)}/detalle`);
  },

  async soporte(id: string): Promise<{ url: string }> {
    return apiClient.get(`/portal/aprobaciones-de-reparacion/${encodeURIComponent(id)}/soporte`);
  },

  // ── Portofino 22-10-2026: la reparación que hace el propietario ───────────

  /**
   * Lo que está en manos del propietario (Nico: «pueden llegar a ser muchos»):
   * tres grupos con su cuenta, buscable y por páginas en el back.
   */
  async conElPropietario(opciones: {
    grupo?: GrupoConElPropietario;
    q?: string;
    pagina?: number;
    porPagina?: number;
  }): Promise<BandejaConElPropietario> {
    const p = new URLSearchParams();
    if (opciones.grupo) p.set('grupo', opciones.grupo);
    if (opciones.q?.trim()) p.set('q', opciones.q.trim());
    if (opciones.pagina) p.set('pagina', String(opciones.pagina));
    if (opciones.porPagina) p.set('porPagina', String(opciones.porPagina));
    const q = p.toString();
    return apiClient.get(`/inmobiliaria/mantenimiento/con-el-propietario${q ? `?${q}` : ''}`);
  },

  /** La inmobiliaria se la deja al propietario («la puede hacer usted»). */
  async laHaceElPropietario(solicitudId: string, nota?: string): Promise<LaHaceElPropietario> {
    return apiClient.post(
      `/inmobiliaria/mantenimiento/${encodeURIComponent(solicitudId)}/la-hace-el-propietario`,
      nota?.trim() ? { nota: nota.trim() } : {},
    );
  },

  /** La inmobiliaria la vuelve a tomar. */
  async laRetomaLaInmobiliaria(solicitudId: string, motivo?: string): Promise<{ retomada: true }> {
    return apiClient.post(
      `/inmobiliaria/mantenimiento/${encodeURIComponent(solicitudId)}/la-retoma-la-inmobiliaria`,
      motivo?.trim() ? { motivo: motivo.trim() } : {},
    );
  },

  /** El propietario responde «La hago yo» a una aprobación pendiente. */
  async laHagoYo(aprobacionId: string, nota?: string): Promise<LaHaceElPropietario> {
    return apiClient.post(
      `/portal/aprobaciones-de-reparacion/${encodeURIComponent(aprobacionId)}/la-hago-yo`,
      nota?.trim() ? { nota: nota.trim() } : {},
    );
  },

  /** Las reparaciones que el propietario hace por su cuenta. */
  async lasQueHagoYo(): Promise<ReparacionQueHagoYo[]> {
    return apiClient.get(`/portal/aprobaciones-de-reparacion/las-que-hago-yo`);
  },

  /** «Ya quedó»: la reparación que hizo el propietario quedó lista. */
  async yaQuedo(solicitudId: string, nota?: string): Promise<LaHaceElPropietario> {
    return apiClient.post(
      `/portal/aprobaciones-de-reparacion/reparaciones/${encodeURIComponent(solicitudId)}/ya-quedo`,
      nota?.trim() ? { nota: nota.trim() } : {},
    );
  },

  /** Configuración → Reparaciones. */
  async configuracion(): Promise<ConfiguracionDeReparaciones> {
    return apiClient.get(`/inmobiliaria/mantenimiento/configuracion`);
  },

  async guardarConfiguracion(cambios: {
    prioridadesSoloDeLaInmobiliaria?: PrioridadDelBack[];
    slaHoras?: Partial<Record<PrioridadDelBack, number>>;
  }): Promise<ConfiguracionDeReparaciones> {
    return apiClient.put(`/inmobiliaria/mantenimiento/configuracion`, cambios);
  },
};
