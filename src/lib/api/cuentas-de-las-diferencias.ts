/**
 * 🔴 Las cuentas de las DIFERENCIAS de la conciliación (Nico, P1, 03-10-2026):
 * «asiento AUTOMÁTICO al aprobar, contra cuentas configurables por
 * inmobiliaria». El 4×1000 y la comisión van a gasto bancario; la retención
 * del inquilino, a nombre del propietario (art. 394 ET).
 *
 * `GET/PUT /inmobiliaria/contabilidad/diferencias/cuentas`,
 * `GET …/por-asentar` y `POST …/reprocesar`.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

const BASE = '/inmobiliaria/contabilidad/diferencias';

export type EventoDeDiferencia =
  | 'GASTO_BANCARIO_GMF'
  | 'GASTO_BANCARIO_COMISION'
  | 'RETENCION_DEL_INQUILINO';

export interface CuentaResumida {
  id: string;
  codigo: string;
  nombre: string;
}

export interface CuentasDeLasDiferencias {
  /** `false` = falta la migración del back: se ve, pero no se guarda. */
  disponible: boolean;
  motivo: string | null;
  eventos: {
    evento: EventoDeDiferencia;
    nombre: string;
    explicacion: string;
    codigoPropuesto: string;
    cuenta: CuentaResumida | null;
    propuesta: CuentaResumida | null;
  }[];
  /** De dónde sale lo que no llegó: la cuenta del mapeo «Entró plata al banco». */
  cuentaDelBanco: CuentaResumida | null;
  /** ¿La retención entra como descuento en la liquidación del propietario? */
  retencionEnLaLiquidacion: boolean;
}

export interface DiferenciasPorAsentar {
  total: number;
  valorCop: number;
}

export interface ResultadoDelReproceso {
  asentadas: number;
  sinAsentar: number;
  motivos: string[];
}

export const cuentasDeLasDiferenciasApi = {
  cuentas(): Promise<CuentasDeLasDiferencias> {
    return apiClient.get<CuentasDeLasDiferencias>(`${BASE}/cuentas`);
  },

  async guardar(
    cuentas: { evento: EventoDeDiferencia; cuentaId: string | null }[],
  ): Promise<CuentasDeLasDiferencias> {
    const res = await apiClient.put<CuentasDeLasDiferencias>(`${BASE}/cuentas`, { cuentas });
    invalidar('contabilidad');
    return res;
  },

  porAsentar(): Promise<DiferenciasPorAsentar> {
    return apiClient.get<DiferenciasPorAsentar>(`${BASE}/por-asentar`);
  },

  async reprocesar(): Promise<ResultadoDelReproceso> {
    const res = await apiClient.post<ResultadoDelReproceso>(`${BASE}/reprocesar`, {});
    invalidar('contabilidad');
    return res;
  },
};
