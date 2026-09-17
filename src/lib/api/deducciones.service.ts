/**
 * Deducciones del propietario — `/inmobiliaria/propietarios/:id/deducciones`.
 *
 * Registrar un descuento manual lleva motivo Y soporte (Nico y Juan Camilo,
 * 2026-09-16). El soporte viaja como archivo (multipart `soporte`): el back lo
 * guarda en el mismo bucket privado de los contratos y devuelve la ruta; para
 * abrirlo se pide una URL firmada de una hora.
 */

import { apiClient, ApiError, getAccessToken } from '@/lib/api/client';
import type {
  DeduccionDelListado,
  ListadoDeDeducciones,
  NuevoDescuento,
} from '@/lib/types/deducciones';

const BASE = '/inmobiliaria/propietarios';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const deduccionesApi = {
  /** Todas las del propietario: vivas, aplicadas y anuladas, con sus totales. */
  async listar(propietarioId: string): Promise<ListadoDeDeducciones> {
    return apiClient.get<ListadoDeDeducciones>(`${BASE}/${propietarioId}/deducciones`);
  },

  /**
   * Un descuento manual. El back responde 400 sin soporte o sin motivo, y 503
   * si la base todavía no tiene la tabla — los dos con el motivo en palabras.
   */
  async registrar(
    propietarioId: string,
    descuento: NuevoDescuento,
  ): Promise<{ grupoId: string; deducciones: DeduccionDelListado[] }> {
    const formulario = new FormData();
    formulario.append('motivo', descuento.motivo);
    formulario.append('valorCop', String(descuento.valorCop));
    if (descuento.consignacionId) {
      formulario.append('consignacionId', descuento.consignacionId);
    }
    formulario.append('soporte', descuento.soporte);

    const token = getAccessToken();
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BACKEND_URL}${BASE}/${propietarioId}/deducciones`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formulario,
      });
    } catch (error) {
      throw new ApiError(
        0,
        `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        message?: unknown;
        code?: unknown;
      };
      const mensaje = Array.isArray(cuerpo.message)
        ? (cuerpo.message as string[])
        : typeof cuerpo.message === 'string'
          ? cuerpo.message
          : 'No se pudo registrar el descuento';
      throw new ApiError(
        respuesta.status,
        mensaje,
        typeof cuerpo.code === 'string' ? cuerpo.code : undefined,
      );
    }
    return respuesta.json() as Promise<{
      grupoId: string;
      deducciones: DeduccionDelListado[];
    }>;
  },

  /** Anula la deducción entera (todas las partes de su grupo). Sin borrarla. */
  async anular(
    propietarioId: string,
    grupoId: string,
    motivo: string,
  ): Promise<{ anuladas: number }> {
    return apiClient.post<{ anuladas: number }>(
      `${BASE}/${propietarioId}/deducciones/${grupoId}/anular`,
      { motivo },
    );
  },

  /** Una URL firmada, de una hora, para abrir el soporte. */
  async urlDelSoporte(
    propietarioId: string,
    deduccionId: string,
  ): Promise<{ url: string; nombre: string | null }> {
    return apiClient.get<{ url: string; nombre: string | null }>(
      `${BASE}/${propietarioId}/deducciones/${deduccionId}/soporte`,
    );
  },
};
