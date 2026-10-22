/**
 * El marketplace de las inmobiliarias (Nico, 09-10-2026): su página pública
 * (`/i/<nombre>`), seguir, «Inmobiliarias que sigues» y «¿la recomendarías
 * para arrendar?». Back: `src/marketplace/` (`MarketplaceController`).
 */

import { apiClient } from './client';
import { mapBackendProperty } from './properties.mapper';
import type { BackendProperty } from './properties.types';
import type { Property } from '@/lib/types/property';

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
  /** 21-10-2026: no ha pagado ningún plan → al final, la zona de publicidad. Un back anterior no lo manda. */
  muestraVitrina?: boolean;
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

/** Un turno anterior del chat del perfil (lo guarda la pestaña, no el back). */
export interface TurnoDelChat {
  rol: 'persona' | 'asistente';
  texto: string;
  /** Los inmuebles que mostró el asistente en ese turno. */
  inmuebles?: string[];
}

/** «Pregúntale a la inmobiliaria» con IA (21-10-2026). */
export interface RespuestaDelChat {
  respuesta: string;
  inmuebles: Property[];
  sugerencias: string[];
  /** Lo que sigue es hablar con la inmobiliaria (falta un dato, visitar, negociar…). */
  contactar: boolean;
  /** Cuántas preguntas con IA le quedan hoy (un back anterior no lo manda). */
  quedan?: number;
}

/** El 503 del chat sin IA: el front vuelve al buscador de siempre. */
export const CODIGO_CHAT_SIN_IA = 'CHAT_SIN_IA';
/** El 429 del cupo con IA agotado (Nico, 21-10-2026): el chat sigue como buscador. */
export const CODIGO_CHAT_SIN_PREGUNTAS = 'CHAT_SIN_PREGUNTAS';

const CLAVE_DEL_NAVEGADOR = 'leasefy-marketplace-navegador';

/**
 * El id de este navegador para el cupo del chat con IA (con la IP, es la
 * «persona»). Sin almacenamiento disponible, `undefined`: cuenta sólo la IP.
 */
export function idDelNavegador(): string | undefined {
  try {
    const guardado = window.localStorage.getItem(CLAVE_DEL_NAVEGADOR);
    if (guardado) return guardado;
    const nuevo = window.crypto.randomUUID();
    window.localStorage.setItem(CLAVE_DEL_NAVEGADOR, nuevo);
    return nuevo;
  } catch {
    return undefined;
  }
}

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
  /** Le pregunta al chat del perfil (IA con sus inmuebles publicados y su perfil). */
  async preguntarAlChat(
    nombre: string,
    dto: { pregunta: string; historial?: TurnoDelChat[] },
  ): Promise<RespuestaDelChat> {
    const r = await apiClient.post<Omit<RespuestaDelChat, 'inmuebles'> & { inmuebles: BackendProperty[] }>(
      `${BASE}/inmobiliarias/${encodeURIComponent(nombre)}/chat`,
      { ...dto, navegador: idDelNavegador() },
    );
    return { ...r, inmuebles: (r.inmuebles ?? []).map(mapBackendProperty) };
  },
  /** Le pregunta al chat de la portada sobre lo que el buscador ya le muestra. */
  async preguntarALaPortada(dto: {
    pregunta: string;
    historial?: TurnoDelChat[];
    inmuebles: string[];
    encontrados: number;
    entendido: string[];
  }): Promise<RespuestaDelChat> {
    const r = await apiClient.post<Omit<RespuestaDelChat, 'inmuebles'> & { inmuebles: BackendProperty[] }>(
      `${BASE}/chat`,
      { ...dto, navegador: idDelNavegador() },
    );
    return { ...r, inmuebles: (r.inmuebles ?? []).map(mapBackendProperty) };
  },
};
