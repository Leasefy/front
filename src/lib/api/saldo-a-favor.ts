/**
 * 🔴 Ola E (03-10-2026, Juan Camilo): el saldo a favor del inquilino al
 * terminar el contrato — «se le devuelve (cuenta por pagar al inquilino +
 * comprobante de egreso), descontando lo que deba».
 *
 *   · `GET  /inmobiliaria/recibos-de-caja/saldo-a-favor/contratos/:contractId`
 *     — lo que tiene a favor, lo que debe, lo que se le devolvería y la
 *     devolución ya registrada (permiso `cobros:view`);
 *   · `POST …/saldo-a-favor/contratos/:contractId/devolver` — lo aplica a lo que
 *     debe y deja lo que sobra como egreso PENDIENTE a su nombre (permiso
 *     `cobros:create`). 409 `CONTRATO_NO_TERMINADO`,
 *     `EL_INQUILINO_TIENE_OTRO_CONTRATO_VIGENTE`, `SALDO_A_FAVOR_YA_DEVUELTO`,
 *     `SIN_SALDO_A_FAVOR`, `INQUILINO_NO_IDENTIFICADO`; 503 `FALTA_UNA_MIGRACION`.
 *
 * ⚠ Rutas nuevas del back de esta ola: `rutas-del-back.json` se regenera con
 * el back de la ola (lo hace el principal).
 */

import { apiClient } from '@/lib/api/client';

export interface DevolucionDelSaldoAFavor {
  egresoId: string;
  numero: number | null;
  /** `PENDIENTE` (cuenta por pagar) | `EN_LOTE` | `PAGADO` | `ANULADO`. */
  estado: string;
  valorCop: number;
  registradaEl: string;
  pagadaEl: string | null;
}

export interface LiquidacionDelSaldoAFavor {
  disponible: boolean;
  motivo: string | null;
  contrato: { id: string; numero: string; estado: string; terminado: boolean };
  inquilino: { tenantId: string; nombre: string; documento: string | null } | null;
  aFavor: {
    anticipoDelContratoCop: number;
    saldoSueltoCop: number;
    sueltoIncluido: boolean;
    totalCop: number;
  };
  debeCop: number;
  aDevolverCop: number;
  devolucion: DevolucionDelSaldoAFavor | null;
  sePuedeDevolver: boolean;
  porQueNo: string | null;
}

export interface DatosDeLaDevolucion {
  banco?: string;
  tipoDeCuenta?: 'AHORROS' | 'CORRIENTE';
  numeroDeCuenta?: string;
  notas?: string;
}

export interface DevolucionRegistrada {
  aplicadoCop: number;
  recibos: number;
  aDevolverCop: number;
  egreso: { id: string; estado: string; valorCop: number } | null;
}

const BASE = '/inmobiliaria/recibos-de-caja/saldo-a-favor/contratos';

export const saldoAFavorApi = {
  liquidacion: (contractId: string) =>
    apiClient.get<LiquidacionDelSaldoAFavor>(`${BASE}/${encodeURIComponent(contractId)}`),

  devolver: (contractId: string, datos: DatosDeLaDevolucion) =>
    apiClient.post<DevolucionRegistrada>(
      `${BASE}/${encodeURIComponent(contractId)}/devolver`,
      datos,
    ),
};

/** El número de cuenta: sólo dígitos, entre 4 y 30 (el mismo tope del back). */
export function numeroDeCuentaValido(numero: string): boolean {
  return /^\d{4,30}$/.test(numero.trim());
}
