/**
 * Las listas cortas que armó matching (MANOS-2, 04-10-2026).
 *
 * Cuando un inmueble tiene dos o más postulaciones, el Piloto (matching) las
 * ordena y deja las tres que mejor calzan. Postulaciones las marca y el
 * propietario las ve primero al escoger. `GET /inmobiliaria/matching/listas-cortas`
 * → `{ porInmueble: { [propertyId]: { lista, hechaEl, quien } } }`.
 */
import { apiClient } from '@/lib/api/client';

export interface PuestoEnLaListaCorta {
  applicationId: string;
  nombre: string;
  /** 1, 2, 3; `null` si quedó fuera. */
  puesto: number | null;
  razones: string[];
  fuera: string | null;
}

export interface ListaCorta {
  lista: PuestoEnLaListaCorta[];
  hechaEl: string;
  quien: string | null;
}

export const listasCortasApi = {
  async deLaInmobiliaria(): Promise<Record<string, ListaCorta>> {
    const r = await apiClient.get<{ porInmueble?: Record<string, ListaCorta> }>('/inmobiliaria/matching/listas-cortas');
    return r?.porInmueble ?? {};
  },
};

/** applicationId → su puesto y por qué, de todas las listas. Puro. */
export function puestosPorPostulacion(porInmueble: Record<string, ListaCorta>): Map<string, PuestoEnLaListaCorta> {
  const m = new Map<string, PuestoEnLaListaCorta>();
  for (const l of Object.values(porInmueble)) for (const p of l.lista) if (p.puesto !== null) m.set(p.applicationId, p);
  return m;
}
