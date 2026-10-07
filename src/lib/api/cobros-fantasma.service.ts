/**
 * Los cobros FANTASMA — `/inmobiliaria/cobros-fantasma` (PG-07 / ARREGLOS-9,
 * QA de Pagos, 03-10-2026).
 *
 * Un cobro fantasma es un cobro SIN cuota, de un contrato que sí tiene tabla de
 * cuotas, en un mes que la tabla no cobra (los de junio y julio de Iván, antes
 * del inicio de su cartera). La plata que se llevó no está en la deuda real
 * del contrato: re-aplicarla anula esos recibos y la vuelve a recibir contra
 * la deuda más vieja, con rastro. Re-aplicar ANULA recibos, así que es sólo
 * del administrador (403 `SOLO_UN_ADMINISTRADOR_ANULA`).
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

export interface CobroFantasma {
  cobroId: string;
  contractId: string;
  contratoNumero: number | null;
  tenantName: string | null;
  /** `YYYY-MM`. */
  month: string;
  totalCop: number;
  pagadoCop: number;
  pendienteCop: number;
  /** Los recibos vivos que se llevaron plata. Vacío = se puede anular. */
  recibos: { id: string; numero: number; valorCop: number; fecha: string; medio: string }[];
  /** Sin plata se ANULA; con plata, primero se RE-APLICA. */
  accion: 'ANULAR' | 'REAPLICAR';
}

export interface ResultadoDeLaReaplicacion {
  cobroId: string;
  month: string;
  recibos: {
    anulado: { id: string; numero: number; valorCop: number };
    nuevos: { id: string; numero: number; mes: string | null; valorCop: number }[];
    linea: { movimientoId: string; estado: 'CONCILIADA' | 'PENDIENTE'; motivo: string | null } | null;
  }[];
}

const BASE = '/inmobiliaria/cobros-fantasma';

export const cobrosFantasmaApi = {
  async listar(): Promise<CobroFantasma[]> {
    const r = await apiClient.get<CobroFantasma[] | null>(BASE);
    return Array.isArray(r) ? r : [];
  },

  async reaplicar(cobroId: string): Promise<ResultadoDeLaReaplicacion> {
    const r = await apiClient.post<ResultadoDeLaReaplicacion>(
      `${BASE}/${encodeURIComponent(cobroId)}/reaplicar`,
      {},
    );
    // La plata cambió de cobro y de cuota: la cartera y los cobros se releen.
    invalidar('cobros');
    return r;
  },
};
