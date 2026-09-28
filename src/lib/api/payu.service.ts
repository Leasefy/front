/**
 * Cobri y el autopago, vistos por la inmobiliaria — sólo lectura, contra las
 * tres rutas del back que fijó el integrador el 26-09-2026
 * (`payu-api-front.md`). Mismos guards que el resto de `/inmobiliaria/*`.
 *
 * No hay acá ningún «mandar el link»: los links los manda un cron del back
 * (decisión de Nico), no un botón del panel.
 */

import { apiClient } from './client';
import type {
  AutopagosDeLaInmobiliaria,
  FiltrosDeLinksDePago,
  PaginaDeLinksDePago,
  ResumenDeLinksDePago,
} from '@/lib/types/payu';

export const payuApi = {
  /** El link de cada cuota del mes, paginado y (opcional) filtrado por estado. */
  links({ mes, estado, page = 1, limit = 20 }: FiltrosDeLinksDePago): Promise<PaginaDeLinksDePago> {
    const q = new URLSearchParams({ mes });
    if (estado) q.set('estado', estado);
    q.set('page', String(page));
    q.set('limit', String(limit));
    return apiClient.get<PaginaDeLinksDePago>(`/inmobiliaria/cobros/links?${q.toString()}`);
  },

  /** El mes de Cobri en cifras, y si el cron está prendido. */
  resumen(mes: string): Promise<ResumenDeLinksDePago> {
    return apiClient.get<ResumenDeLinksDePago>(
      `/inmobiliaria/cobros/links/resumen?mes=${encodeURIComponent(mes)}`,
    );
  },

  /** Los contratos con autopago inscrito y su último intento. */
  autopagos(): Promise<AutopagosDeLaInmobiliaria> {
    return apiClient.get<AutopagosDeLaInmobiliaria>('/inmobiliaria/autopago');
  },
};
