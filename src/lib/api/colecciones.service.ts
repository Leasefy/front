/**
 * Colecciones para el cliente (back `src/inmobiliaria/colecciones/`, 28-10-2026): el agente arma una colección con los
 * inmuebles que le propone a un cliente y le manda UN enlace; el cliente la abre sin cuenta, marca y comenta.
 */
import { apiClient } from './client';

export type ReaccionDelCliente = 'me_gusta' | 'no';

export interface ResumenDeColeccion {
  id: string;
  token: string;
  enlace: string;
  paraQuien: string;
  celular: string | null;
  nota: string | null;
  vistas: number;
  abiertaEn: string | null;
  ultimaVista: string | null;
  creadaEn: string;
  inmuebles: number;
  meGusta: number;
  no: number;
  comentarios: number;
}

export interface InmuebleDeLaColeccion {
  propertyId: string;
  orden: number;
  reaccion: ReaccionDelCliente | null;
  comentario: string | null;
  titulo: string;
  barrio: string | null;
  ciudad: string;
  canon: number | null;
  venta: number | null;
  habitaciones: number | null;
  banos: number | null;
  area: number | null;
  foto: string | null;
  disponible: boolean;
}

export interface ColeccionPublica {
  paraQuien: string;
  nota: string | null;
  creadaEn: string;
  agente: { nombre: string; foto: string | null; inmobiliaria: string | null; logo: string | null; whatsapp: string | null };
  inmuebles: Array<{
    id: string;
    titulo: string;
    barrio: string | null;
    ciudad: string;
    canon: number | null;
    venta: number | null;
    habitaciones: number | null;
    banos: number | null;
    area: number | null;
    foto: string | null;
    disponible: boolean;
    reaccion: ReaccionDelCliente | null;
    comentario: string | null;
  }>;
}

export const coleccionesApi = {
  listar: () =>
    apiClient.get<{ disponible: boolean; migracion: string | null; colecciones: ResumenDeColeccion[] }>('/inmobiliaria/colecciones'),
  crear: (cuerpo: { paraQuien: string; celular?: string; nota?: string; inmuebles: string[] }) =>
    apiClient.post<{ id: string; token: string; enlace: string; inmuebles: number; descartados: number }>('/inmobiliaria/colecciones', cuerpo),
  ver: (id: string) =>
    apiClient.get<ResumenDeColeccion & { inmuebles: InmuebleDeLaColeccion[] }>(`/inmobiliaria/colecciones/${encodeURIComponent(id)}`),
  archivar: (id: string) => apiClient.delete<{ id: string; archivada: boolean }>(`/inmobiliaria/colecciones/${encodeURIComponent(id)}`),
  /** Público: el cliente, sin cuenta. */
  publica: (token: string) => apiClient.get<ColeccionPublica>(`/colecciones/${encodeURIComponent(token)}`),
  marcar: (token: string, propertyId: string, cambio: { reaccion?: ReaccionDelCliente | null; comentario?: string | null }) =>
    apiClient.put<{ id: string }>(`/colecciones/${encodeURIComponent(token)}/inmuebles/${encodeURIComponent(propertyId)}`, cambio),
};

/** El enlace que se abre en ESTE ambiente (en el lab y en dev, no leasefy.co). */
export function enlaceLocalDeLaColeccion(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://leasefy.co';
  return `${base}/coleccion/${token}`;
}
