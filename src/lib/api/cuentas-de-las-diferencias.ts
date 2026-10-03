/**
 * 🔴 Las cuentas de las DIFERENCIAS de la conciliación (Nico, P1, 03-10-2026):
 * «asiento AUTOMÁTICO al aprobar, contra cuentas configurables por
 * inmobiliaria». El 4×1000 y la comisión van a gasto bancario; la retención
 * del inquilino, a nombre del propietario (art. 394 ET).
 *
 * `GET/PUT /inmobiliaria/contabilidad/diferencias/cuentas`,
 * `GET …/por-asentar` y `POST …/reprocesar` (seguimiento 6: también lo de las
 * salidas, y conciliar antes los gastos del banco seguros del extracto, con
 * confirmación).
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

/** Un gasto del banco seguro del extracto que sigue sin conciliar (seguimiento 6). */
export interface GastoDelBancoSinConciliar {
  movimientoId: string;
  fecha: string;
  descripcion: string;
  valorCop: number;
  etiqueta: string;
}

export interface DiferenciasPorAsentar {
  total: number;
  valorCop: number;
  /**
   * 🔴 Seguimiento 6 («"Asentarlas" no reprocesaba las salidas»): de ese total,
   * los gastos del banco (4×1000, comisiones) que se conciliaron como salida
   * antes de tener la cuenta. Un back viejo no lo manda.
   */
  deLasSalidas?: { total: number; valorCop: number };
  /**
   * Los gastos del banco del extracto que las reglas de las salidas reconocen
   * seguros y siguen sin conciliar: «Asentarlas» los puede conciliar y asentar
   * en el mismo clic, CON confirmación. `null` = no se pudo mirar.
   */
  gastosDelExtracto?: {
    cantidad: number;
    totalCop: number;
    salidas: GastoDelBancoSinConciliar[];
    puedeConciliar: boolean;
    porQueNo: string | null;
  } | null;
}

export interface ResultadoDelReproceso {
  asentadas: number;
  sinAsentar: number;
  motivos: string[];
  /** Lo que se concilió del extracto antes de asentar (si se confirmó). */
  gastosDelBanco?: { conciliados: number; totalCop: number; yaNoSonSeguros: number } | null;
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

  /**
   * «Asentarlas». Con `gastos` (lo que la persona VIO y confirmó), antes
   * concilia esos gastos del banco del extracto; sin él, sólo asienta.
   */
  async reprocesar(
    gastos?: { salidas: { movimientoId: string }[]; cantidad: number; totalCop: number } | null,
  ): Promise<ResultadoDelReproceso> {
    const cuerpo =
      gastos && gastos.salidas.length > 0
        ? {
            conciliarGastosDelBanco: gastos.salidas.map((g) => g.movimientoId),
            cantidad: gastos.cantidad,
            totalCop: Math.round(gastos.totalCop),
          }
        : {};
    const res = await apiClient.post<ResultadoDelReproceso>(`${BASE}/reprocesar`, cuerpo);
    invalidar('contabilidad');
    if (gastos && gastos.salidas.length > 0) invalidar('cobros');
    return res;
  },
};
