/**
 * Recaudo — `/inmobiliaria/recaudo`. Sólo lectura.
 */

import { apiClient } from '@/lib/api/client';
import type { PuntoDeLaSerie, ResumenDeRecaudo } from './recaudo.types';

const BASE = '/inmobiliaria/recaudo';

export const recaudoApi = {
  /** Las cifras de un mes `YYYY-MM`. */
  resumen(month: string): Promise<ResumenDeRecaudo> {
    return apiClient.get<ResumenDeRecaudo>(`${BASE}/resumen?month=${encodeURIComponent(month)}`);
  },

  /** Los últimos `meses` meses (máx. 24) hasta `hasta` inclusive. */
  serie(meses: number, hasta: string): Promise<PuntoDeLaSerie[]> {
    return apiClient.get<PuntoDeLaSerie[]>(
      `${BASE}/serie?meses=${encodeURIComponent(String(meses))}&hasta=${encodeURIComponent(hasta)}`,
    );
  },
};
