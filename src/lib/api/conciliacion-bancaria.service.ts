/**
 * Conciliación bancaria — `/inmobiliaria/conciliacion-bancaria`.
 *
 * Mismo patrón que `recibos-de-caja.service.ts`: `apiClient` y cuerpos armados
 * clave por clave (el back corre con `forbidNonWhitelisted`, una clave de más
 * es un 400). Conciliar EMITE un recibo de caja: por eso cada mutación
 * despierta a `cobros`, que es lo que de verdad cambió.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import type {
  FilaDeExtracto,
  FiltrosDeMovimientos,
  MovimientoBancario,
  PaginaDeMovimientos,
  ResultadoDeCarga,
  ResultadoDeConciliar,
  ResultadoDeSeguros,
  ResumenDeConciliacion,
} from './conciliacion-bancaria.types';

const BASE = '/inmobiliaria/conciliacion-bancaria';

function conQuery(path: string, params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Sólo las claves del DTO, sin `undefined`: `referencia` vacía no viaja. */
export function filaParaElBack(fila: FilaDeExtracto): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    fecha: fila.fecha,
    valorCop: fila.valorCop,
    descripcion: fila.descripcion,
  };
  if (fila.referencia) cuerpo.referencia = fila.referencia;
  return cuerpo;
}

export const conciliacionBancariaApi = {
  async cargarExtracto(nombreArchivo: string, filas: FilaDeExtracto[]): Promise<ResultadoDeCarga> {
    const res = await apiClient.post<ResultadoDeCarga>(`${BASE}/extracto`, {
      nombreArchivo,
      filas: filas.map(filaParaElBack),
    });
    invalidar('cobros');
    return res;
  },

  async listar(filtros: FiltrosDeMovimientos = {}): Promise<PaginaDeMovimientos> {
    return apiClient.get<PaginaDeMovimientos>(
      conQuery(`${BASE}/movimientos`, {
        estado: filtros.estado,
        desde: filtros.desde,
        hasta: filtros.hasta,
        limite: filtros.limite,
        desplazamiento: filtros.desplazamiento,
      }),
    );
  },

  async resumen(): Promise<ResumenDeConciliacion> {
    return apiClient.get<ResumenDeConciliacion>(`${BASE}/resumen`);
  },

  async conciliar(movimientoId: string, cobroId: string): Promise<ResultadoDeConciliar> {
    const res = await apiClient.post<ResultadoDeConciliar>(
      `${BASE}/movimientos/${movimientoId}/conciliar`,
      { cobroId },
    );
    invalidar('cobros');
    return res;
  },

  async ignorar(movimientoId: string, motivo: string): Promise<MovimientoBancario> {
    return apiClient.post<MovimientoBancario>(`${BASE}/movimientos/${movimientoId}/ignorar`, {
      motivo,
    });
  },

  async reabrir(movimientoId: string): Promise<MovimientoBancario> {
    return apiClient.post<MovimientoBancario>(`${BASE}/movimientos/${movimientoId}/reabrir`, {});
  },

  async conciliarSeguros(): Promise<ResultadoDeSeguros> {
    const res = await apiClient.post<ResultadoDeSeguros>(`${BASE}/conciliar-seguros`, {});
    invalidar('cobros');
    return res;
  },
};
