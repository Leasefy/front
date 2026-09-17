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
  CuentaDeCobroDelPropietario,
  DeduccionDelListado,
  DeudaDelPropietario,
  DeudasDePropietarios,
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

  /**
   * Lo que el propietario le DEBE a la inmobiliaria: deducciones o saldo en
   * contra que ya no tienen liquidación de la cual descontarse. 200 con
   * `disponible: false` si la base no tiene la tabla.
   */
  async deuda(propietarioId: string): Promise<DeudaDelPropietario> {
    return apiClient.get<DeudaDelPropietario>(`${BASE}/${propietarioId}/deuda`);
  },

  /** Los propietarios de la agencia que le deben, para la cartera. */
  async deudasDeLaAgencia(): Promise<DeudasDePropietarios> {
    return apiClient.get<DeudasDePropietarios>('/inmobiliaria/deudas-de-propietarios');
  },

  /**
   * Emite la cuenta de cobro con lo que debe y no está en ninguna. 409 si no
   * debe nada o ya está todo cobrado; 503 si la base no tiene la migración.
   */
  async generarCuentaDeCobro(propietarioId: string): Promise<CuentaDeCobroDelPropietario> {
    return apiClient.post<CuentaDeCobroDelPropietario>(
      `${BASE}/${propietarioId}/cuenta-de-cobro`,
      {},
    );
  },

  /** El documento de una cuenta de cobro ya emitida. */
  async cuentaDeCobro(
    propietarioId: string,
    cuentaId: string,
  ): Promise<CuentaDeCobroDelPropietario> {
    return apiClient.get<CuentaDeCobroDelPropietario>(
      `${BASE}/${propietarioId}/cuenta-de-cobro/${cuentaId}`,
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
