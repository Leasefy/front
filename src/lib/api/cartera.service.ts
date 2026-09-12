/**
 * Cartera — `/inmobiliaria/cartera`. Sólo lectura.
 */

import { apiClient } from '@/lib/api/client';
import type { CarteraConPropietarios, CarteraDeInquilinos } from './cartera.types';

const BASE = '/inmobiliaria/cartera';

export const carteraApi = {
  /** Lo que deben los inquilinos: por inquilino, mes y concepto. */
  inquilinos(): Promise<CarteraDeInquilinos> {
    return apiClient.get<CarteraDeInquilinos>(`${BASE}/inquilinos`);
  },

  /** Lo que la inmobiliaria le debe a cada propietario, por mes. */
  propietarios(): Promise<CarteraConPropietarios> {
    return apiClient.get<CarteraConPropietarios>(`${BASE}/propietarios`);
  },
};
