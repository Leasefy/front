import { apiClient } from './client';

/**
 * 🔴 El registro de proveedores de mantenimiento (H-04, Nico 18-09-2026).
 *
 * «Registro de proveedores por inmobiliaria (RUT, seguridad social,
 * calificación)». El back quedó construido el 18-09 y estuvo sin pantalla:
 * existía el controlador entero y ninguna forma de usarlo.
 *
 * 🔴 Los AVISOS los calcula el back, no esta pantalla. Que falte el RUT o esté
 * vencida la seguridad social no es una regla de presentación: es la misma
 * regla que decide si a ese proveedor se le puede pagar. Vive en un solo lado
 * (`proveedores.service.ts`) y acá sólo se muestra.
 */

/** Un papel del proveedor, con su vigencia ya resuelta contra hoy por el back. */
export interface DocumentoDelProveedor {
  ruta: string | null;
  nombre: string | null;
  vigenteHasta: string | null;
  vencido: boolean;
}

export interface ProveedorDeMantenimiento {
  id: string;
  nombre: string;
  /** NIT o cédula: con eso se le paga y se le retiene. */
  documento: string;
  telefono: string | null;
  correo: string | null;
  especialidades: string[];
  rut: DocumentoDelProveedor | null;
  seguridadSocial: DocumentoDelProveedor | null;
  /** Promedio de estrellas. `null` = todavía no lo han calificado. */
  calificacion: number | null;
  trabajosCalificados: number;
  /** Trabajos que hubo que rehacer dentro de los 90 días de garantía. */
  reaperturasPorGarantia: number;
  activo: boolean;
  notas: string | null;
  /** Lo que la pantalla tiene que decir en rojo o en amarillo. Lo arma el back. */
  avisos: string[];
}

export interface CalificacionDelProveedor {
  id: string;
  solicitudId: string;
  estrellas: number;
  comentario: string | null;
  porGarantia: boolean;
  fecha: string;
}

export interface GuardarProveedor {
  nombre: string;
  documento: string;
  telefono?: string;
  correo?: string;
  especialidades?: string[];
  rutRuta?: string;
  rutNombre?: string;
  rutVigenteHasta?: string;
  seguridadSocialRuta?: string;
  seguridadSocialNombre?: string;
  seguridadSocialVigenteHasta?: string;
  activo?: boolean;
  notas?: string;
}

const BASE = '/inmobiliaria/mantenimiento/proveedores';

export const proveedoresDeMantenimientoApi = {
  /**
   * 🔴 Sin la migración el back devuelve `[]`, no un 503: sin ella la
   * inmobiliaria no tenía proveedores, así que una lista vacía ES el estado de
   * hoy. El 503 (`PROVEEDORES_NO_DISPONIBLES`) llega al intentar ESCRIBIR, y
   * ahí sí la pantalla tiene que decir por qué.
   */
  listar(
    filtros: { activos?: boolean; especialidad?: string } = {},
  ): Promise<ProveedorDeMantenimiento[]> {
    const q = new URLSearchParams();
    if (filtros.activos !== undefined) q.set('activos', String(filtros.activos));
    if (filtros.especialidad) q.set('especialidad', filtros.especialidad);
    const cola = q.toString();
    return apiClient.get<ProveedorDeMantenimiento[]>(cola ? `${BASE}?${cola}` : BASE);
  },

  ver(id: string): Promise<ProveedorDeMantenimiento> {
    return apiClient.get<ProveedorDeMantenimiento>(`${BASE}/${id}`);
  },

  calificaciones(id: string): Promise<CalificacionDelProveedor[]> {
    return apiClient.get<CalificacionDelProveedor[]>(`${BASE}/${id}/calificaciones`);
  },

  crear(datos: GuardarProveedor): Promise<ProveedorDeMantenimiento> {
    return apiClient.post<ProveedorDeMantenimiento>(BASE, datos);
  },

  actualizar(
    id: string,
    datos: Partial<GuardarProveedor>,
  ): Promise<ProveedorDeMantenimiento> {
    return apiClient.patch<ProveedorDeMantenimiento>(`${BASE}/${id}`, datos);
  },

  /**
   * Se DESACTIVA, no se borra: sus calificaciones y sus trabajos son historia
   * de la inmobiliaria y no desaparecen porque alguien deje de llamarlo.
   */
  desactivar(id: string): Promise<ProveedorDeMantenimiento> {
    return apiClient.delete<ProveedorDeMantenimiento>(`${BASE}/${id}`);
  },

  calificar(
    id: string,
    datos: { solicitudId: string; estrellas: number; comentario?: string; porGarantia?: boolean },
  ): Promise<ProveedorDeMantenimiento> {
    return apiClient.post<ProveedorDeMantenimiento>(`${BASE}/${id}/calificar`, datos);
  },
};
