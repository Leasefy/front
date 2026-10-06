/**
 * B-13 (QA-PAGOS-95 ronda 2): condonar intereses — `/inmobiliaria/cartera`.
 *
 * Sólo el ADMINISTRADOR condona, anula o cambia el ajuste (el back responde 403
 * `SOLO_UN_ADMINISTRADOR_CONDONA` si no). Los cuerpos se arman clave por clave:
 * el back valida con `forbidNonWhitelisted`.
 */
import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

export type AlcanceDelTotal = 'LO_DE_HOY' | 'DESDE_HOY_SIN_INTERES';

export interface CondonacionEnPantalla {
  id: string;
  interesDeMoraCop: number;
  gastoDeCobranzaCop: number;
  totalCop: number;
  alcance: AlcanceDelTotal;
  liquidadoAl: string;
  motivo: string;
  condonadaPor: string | null;
  fecha: string;
  anulada: { fecha: string; por: string | null; motivo: string | null } | null;
}

export interface CondonacionDeLaCuota {
  disponible: boolean;
  motivoNoDisponible: string | null;
  cuotaId: string;
  mes: string;
  periodo: string;
  interes: {
    liquidadoCop: number;
    abonadoCop: number;
    pendienteCop: number;
    condonadoCop: number;
  };
  pendientePorConcepto: { interesDeMoraCop: number; gastoDeCobranzaCop: number };
  alcanceDelTotal: AlcanceDelTotal;
  alcanceEnPalabras: string;
  sinInteresDesde: string | null;
  puedeCondonar: boolean;
  porQueNo: string | null;
  condonaciones: CondonacionEnPantalla[];
}

export interface AjusteDeLaCondonacion {
  disponible: boolean;
  alcanceDelTotal: AlcanceDelTotal;
  alcanceEnPalabras: string;
  elegidoPorLaInmobiliaria: boolean;
}

export interface PedidoDeCondonacion {
  total: boolean;
  interesDeMoraCop?: number | null;
  gastoDeCobranzaCop?: number | null;
  motivo: string;
}

const BASE = '/inmobiliaria/cartera';

export const condonacionesApi = {
  deLaCuota(cuotaId: string): Promise<CondonacionDeLaCuota> {
    return apiClient.get<CondonacionDeLaCuota>(`${BASE}/cuotas/${cuotaId}/condonacion`);
  },
  async condonar(cuotaId: string, pedido: PedidoDeCondonacion): Promise<CondonacionDeLaCuota> {
    const cuerpo: PedidoDeCondonacion = pedido.total
      ? { total: true, motivo: pedido.motivo }
      : {
          total: false,
          interesDeMoraCop: pedido.interesDeMoraCop ?? 0,
          gastoDeCobranzaCop: pedido.gastoDeCobranzaCop ?? 0,
          motivo: pedido.motivo,
        };
    const r = await apiClient.post<CondonacionDeLaCuota>(`${BASE}/cuotas/${cuotaId}/condonar`, cuerpo);
    invalidar('cobros');
    return r;
  },
  async anular(condonacionId: string, motivo: string): Promise<CondonacionDeLaCuota> {
    const r = await apiClient.post<CondonacionDeLaCuota>(
      `${BASE}/condonaciones/${condonacionId}/anular`,
      { motivo },
    );
    invalidar('cobros');
    return r;
  },
  ajuste(): Promise<AjusteDeLaCondonacion> {
    return apiClient.get<AjusteDeLaCondonacion>(`${BASE}/condonaciones/ajuste`);
  },
  guardarAjuste(alcanceDelTotal: AlcanceDelTotal): Promise<AjusteDeLaCondonacion> {
    return apiClient.put<AjusteDeLaCondonacion>(`${BASE}/condonaciones/ajuste`, { alcanceDelTotal });
  },
};
