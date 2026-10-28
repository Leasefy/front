/** Valoración en un minuto (back `src/inmobiliaria/valoracion/`, 28-10-2026): gratis; deja al propietario como contacto. */
import { apiClient } from './client';

export type TipoParaValorar = 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'COMMERCIAL' | 'OFFICE' | 'WAREHOUSE';
export interface PedidoDeValoracion {
  ciudad: string;
  barrio?: string;
  tipo: TipoParaValorar;
  area: number;
  habitaciones?: number;
  nombre: string;
  celular: string;
}
export interface RespuestaDeValoracion {
  rango: { minimo: number; maximo: number; muestras: number; alcance: 'barrio' | 'ciudad' } | null;
  minimoDeComparables: number;
  inmobiliaria: string;
  aviso: string;
}
export const valoracionApi = {
  valorar: (agencyId: string, p: PedidoDeValoracion) =>
    apiClient.post<RespuestaDeValoracion>(`/inmobiliarias/${encodeURIComponent(agencyId)}/valoracion`, p),
};
