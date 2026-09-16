/**
 * Cartera — `/inmobiliaria/cartera`. Sólo lectura.
 */

import { apiClient } from '@/lib/api/client';
import type {
  CarteraConPropietarios,
  CarteraDeInquilinos,
  CarteraDelMes,
} from './cartera.types';

const BASE = '/inmobiliaria/cartera';

export const carteraApi = {
  /** Lo que deben los inquilinos: por inquilino, mes y concepto. */
  inquilinos(): Promise<CarteraDeInquilinos> {
    return apiClient.get<CarteraDeInquilinos>(`${BASE}/inquilinos`);
  },

  /**
   * La deuda de UN mes: lo pactado, lo pagado, lo que falta y en qué cajón
   * está. Otro corte de la misma fuente que `inquilinos` —las cuotas del
   * contrato—, que además trae las cuotas ya saldadas: sin ellas, «Pagado»
   * de un mes cerrado daría cero.
   */
  delMes(mes: string): Promise<CarteraDelMes> {
    return apiClient.get<CarteraDelMes>(`${BASE}/mes?mes=${encodeURIComponent(mes)}`);
  },

  /** Lo que la inmobiliaria le debe a cada propietario, por mes. */
  propietarios(): Promise<CarteraConPropietarios> {
    return apiClient.get<CarteraConPropietarios>(`${BASE}/propietarios`);
  },
};
