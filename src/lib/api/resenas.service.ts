/** Reseñas de clientes (back `src/inmobiliaria/resenas/`, 28-10-2026): sólo clientes de Leasefy; la inmobiliaria responde. */
import { apiClient } from './client';

export interface ResenaPublica {
  id: string;
  autor: string;
  motivo: 'contrato' | 'visita' | 'postulacion';
  calificacion: number;
  texto: string;
  creadaEn: string;
  editada: boolean;
  respuesta: string | null;
  respondidaEn: string | null;
}

export interface ResenasDeLaInmobiliaria {
  promedio: number | null;
  total: number;
  resenas: ResenaPublica[];
}

export const resenasApi = {
  delPerfil: (agencyId: string) => apiClient.get<ResenasDeLaInmobiliaria>(`/inmobiliarias/${encodeURIComponent(agencyId)}/resenas`),
  puedo: (agencyId: string) =>
    apiClient.get<{ puede: boolean; motivo: ResenaPublica['motivo'] | null; mia: ResenaPublica | null }>(`/inmobiliarias/${encodeURIComponent(agencyId)}/resenas/puedo`),
  escribir: (agencyId: string, cuerpo: { calificacion: number; texto: string }) =>
    apiClient.post<{ id: string }>(`/inmobiliarias/${encodeURIComponent(agencyId)}/resenas`, cuerpo),
  delPanel: () => apiClient.get<ResenasDeLaInmobiliaria & { disponible: boolean }>('/inmobiliaria/resenas'),
  responder: (id: string, respuesta: string | null) => apiClient.put<{ id: string }>(`/inmobiliaria/resenas/${encodeURIComponent(id)}/respuesta`, { respuesta }),
};

export const POR_QUE_RESENA: Record<ResenaPublica['motivo'], string> = {
  contrato: 'Arrendó con ellos',
  visita: 'Visitó un inmueble',
  postulacion: 'Se postuló a un inmueble',
};
