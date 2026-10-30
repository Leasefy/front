/**
 * Comisión compartida (back `src/inmobiliaria/comisiones-compartidas/`, 28-10-2026). Nico: «el que capta propone el
 * reparto (50/50 de entrada) y el otro lo acepta antes de mostrar el inmueble; Leasefy no cobra, sólo deja constancia».
 */
import { apiClient } from './client';

export type EstadoDeLaComision = 'propuesta' | 'aceptada' | 'rechazada' | 'retirada';
export type LadoDeLaComision = 'capta' | 'trae';
export type AccionDeLaComision = 'editar' | 'retirar' | 'aceptar' | 'rechazar';

export interface ComisionCompartida {
  id: string;
  /** `capta` = tú captaste el inmueble y propusiste; `trae` = te lo propusieron y traes al cliente. */
  lado: LadoDeLaComision;
  estado: EstadoDeLaComision;
  porcentajeCapta: number;
  tuParte: number;
  suParte: number;
  nota: string | null;
  motivo: string | null;
  acciones: AccionDeLaComision[];
  creadaEn: string;
  editadaEn: string | null;
  respondidaEn: string | null;
  retiradaEn: string | null;
  quienPropone: string | null;
  quienResponde: string | null;
  inmueble: {
    id: string;
    titulo: string;
    barrio: string | null;
    ciudad: string | null;
    canon: number | null;
    venta: number | null;
    foto: string | null;
    disponible: boolean;
    codigo: number | null;
  };
  otra: { id: string; nombre: string; logo: string | null; ciudad: string | null };
}

export interface Colega {
  id: string;
  nombre: string;
  logo: string | null;
  ciudad: string | null;
}

const base = '/inmobiliaria/comisiones-compartidas';

export const comisionesCompartidasApi = {
  listar: () => apiClient.get<{ disponible: boolean; migracion: string | null; comisiones: ComisionCompartida[] }>(base),
  colegas: (q: string) => apiClient.get<{ colegas: Colega[] }>(`${base}/colegas?q=${encodeURIComponent(q)}`),
  proponer: (cuerpo: { propertyId: string; agencyId: string; porcentajeTuyo: number; nota?: string }) =>
    apiClient.post<{ id: string; estado: EstadoDeLaComision; porcentajeCapta: number }>(base, cuerpo),
  editar: (id: string, cuerpo: { porcentajeTuyo: number; nota?: string }) =>
    apiClient.put<{ id: string; porcentajeCapta: number }>(`${base}/${encodeURIComponent(id)}`, cuerpo),
  responder: (id: string, cuerpo: { acepta: boolean; motivo?: string }) =>
    apiClient.put<{ id: string; estado: EstadoDeLaComision }>(`${base}/${encodeURIComponent(id)}/respuesta`, cuerpo),
  retirar: (id: string) => apiClient.delete<{ id: string; estado: EstadoDeLaComision }>(`${base}/${encodeURIComponent(id)}`),
};
