/**
 * 🔴 #14 «El propietario escoge» — «Escoger inquilino» en el portal del
 * propietario (MANOS-1, 04-10-2026).
 *
 * Avali (el agente de aprobaciones del Piloto) le pide al propietario que
 * escoja a su inquilino cuando el inmueble tiene candidatos. El propietario los
 * ve aquí (sin documento ni datos de contacto, y el estudio en palabras) y
 * escoge uno, o dice que ninguno le sirve. La sesión dice quién es:
 *   `GET /portal/elecciones-de-inquilino`, `POST …/:id/escoger { applicationId }`,
 *   `POST …/:id/ninguno { motivo }`.
 * La adjudicación la hace la inmobiliaria con un clic (P-4).
 */
import { apiClient } from '@/lib/api/client';

export type EstadoDeLaEleccion = 'PENDIENTE' | 'ESCOGIDA' | 'NINGUNO' | 'ADJUDICADA' | 'ANULADA';

export interface CandidatoParaElPropietario {
  applicationId: string;
  nombre: string;
  deQueVive: string | null;
  ingresosCop: number | null;
  personasACargo: number | null;
  /** En palabras: «Sin estudio de arrendamiento (es opcional).», «Tiene estudio…». */
  estudio: string;
  postuladoEl: string | null;
  /**
   * MANOS-2 (04-10-2026): su puesto en la lista corta que armó matching (1, 2,
   * 3), `null` si quedó fuera; ausente si la inmobiliaria no tiene lista corta.
   */
  enLaListaCorta?: number | null;
}

export interface EleccionEnElPortal {
  id: string;
  estado: EstadoDeLaEleccion;
  inmobiliaria: string;
  inmueble: string;
  canonCop: number | null;
  pedidaAt: string;
  decididaAt: string | null;
  escogido: string | null;
  motivo: string | null;
  candidatos: CandidatoParaElPropietario[];
}

export const eleccionesDeInquilinoApi = {
  async delPortal(): Promise<{ pendientes: EleccionEnElPortal[]; historial: EleccionEnElPortal[] }> {
    return apiClient.get('/portal/elecciones-de-inquilino');
  },

  async escoger(id: string, applicationId: string): Promise<EleccionEnElPortal> {
    return apiClient.post(`/portal/elecciones-de-inquilino/${encodeURIComponent(id)}/escoger`, { applicationId });
  },

  async ninguno(id: string, motivo: string): Promise<EleccionEnElPortal> {
    return apiClient.post(`/portal/elecciones-de-inquilino/${encodeURIComponent(id)}/ninguno`, { motivo: motivo.trim() });
  },
};
