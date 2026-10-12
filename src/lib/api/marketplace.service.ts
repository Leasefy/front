/**
 * El marketplace de las inmobiliarias (Nico, 09-10-2026): su página pública
 * (`/i/<nombre>`), seguir, «Inmobiliarias que sigues» y «¿la recomendarías
 * para arrendar?». Back: `src/marketplace/` (`MarketplaceController`).
 */

import { apiClient } from './client';

export interface ResumenDeLaRecomendacion {
  votos: number;
  si: number;
  /** `null` mientras haya menos de 5 votos: «Aún sin calificaciones». */
  porcentaje: number | null;
  inquilinos: { si: number; no: number };
  propietarios: { si: number; no: number };
}

export interface TarjetaDeInmobiliaria {
  id: string;
  slug: string | null;
  nombre: string;
  logoUrl: string | null;
  /** El color de su marca, para sus iniciales cuando no tiene logo. */
  color: string | null;
  portadaUrl: string | null;
  lema: string | null;
  ciudad: string | null;
  zonas: string[];
  /** Tiene NIT y terminó su registro en Leasefy (no es una revisión contra la DIAN). */
  verificada: boolean;
  inmuebles: number;
  seguidores: number;
  recomendacion: ResumenDeLaRecomendacion;
}

export type RedDeLaInmobiliaria = 'instagram' | 'tiktok' | 'youtube' | 'facebook';
export type RedDelVideoPublico = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

export interface OpinionPublica {
  id: string;
  nombre: string;
  rol: 'INQUILINO' | 'PROPIETARIO';
  recomienda: boolean;
  comentario: string;
  fecha: string;
}

export interface VideoPublico {
  inmuebleId: string;
  titulo: string;
  lugar: string;
  enlace: string;
  red: RedDelVideoPublico;
  foto: string | null;
  canon: number | null;
}

export interface PaginaDeInmobiliaria extends TarjetaDeInmobiliaria {
  redes: Record<RedDeLaInmobiliaria, string | null>;
  whatsapp: string | null;
  opiniones: OpinionPublica[];
  videos: VideoPublico[];
}

export interface InmobiliariaQueSigues {
  id: string;
  slug: string | null;
  nombre: string;
  logoUrl: string | null;
  nuevos: number;
  desde: string;
}

export interface PreguntaPendiente {
  contractId: string;
  rol: 'INQUILINO' | 'PROPIETARIO';
  momento: 'TRES_MESES' | 'FIN';
  inmobiliaria: { id: string; nombre: string; logoUrl: string | null; slug: string | null };
  inmueble: string | null;
}

const BASE = '/marketplace';

/** La dirección de su página: por el nombre corto, o por el id si no tiene. */
export function paginaDe(i: { slug: string | null; id: string }): string {
  return `/i/${i.slug ?? i.id}`;
}

export const marketplaceApi = {
  inmobiliarias(opciones: { ids?: string[]; limite?: number } = {}): Promise<TarjetaDeInmobiliaria[]> {
    const q = new URLSearchParams();
    if (opciones.ids?.length) q.set('ids', opciones.ids.join(','));
    if (opciones.limite) q.set('limite', String(opciones.limite));
    const qs = q.toString();
    return apiClient.get<TarjetaDeInmobiliaria[]>(`${BASE}/inmobiliarias${qs ? `?${qs}` : ''}`);
  },
  pagina(nombre: string): Promise<PaginaDeInmobiliaria> {
    return apiClient.get<PaginaDeInmobiliaria>(`${BASE}/inmobiliarias/${encodeURIComponent(nombre)}`);
  },
  laSigo(agencyId: string): Promise<{ siguiendo: boolean }> {
    return apiClient.get<{ siguiendo: boolean }>(`${BASE}/inmobiliarias/${agencyId}/seguir`);
  },
  seguir(agencyId: string): Promise<{ siguiendo: boolean; seguidores: number }> {
    return apiClient.post(`${BASE}/inmobiliarias/${agencyId}/seguir`);
  },
  dejarDeSeguir(agencyId: string): Promise<{ siguiendo: boolean; seguidores: number }> {
    return apiClient.delete(`${BASE}/inmobiliarias/${agencyId}/seguir`);
  },
  visto(agencyId: string): Promise<{ ok: true }> {
    return apiClient.post(`${BASE}/inmobiliarias/${agencyId}/visto`);
  },
  siguiendo(): Promise<InmobiliariaQueSigues[]> {
    return apiClient.get<InmobiliariaQueSigues[]>(`${BASE}/siguiendo`);
  },
  pendientes(): Promise<PreguntaPendiente[]> {
    return apiClient.get<PreguntaPendiente[]>(`${BASE}/recomendaciones/pendientes`);
  },
  votar(dto: { contractId: string; recomienda: boolean; comentario?: string | null }): Promise<{ ok: true }> {
    return apiClient.post(`${BASE}/recomendaciones`, dto);
  },
};
