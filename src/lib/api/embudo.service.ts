import { apiClient } from './client';

/**
 * Lo nuevo del embudo (QA de Pipeline del 04-10-2026): las notas del
 * interesado (PL-13), agendar su visita al pasarlo a «Visita programada»
 * (PL-16), reasignarlo (PL-12) y el «te llamamos» del aviso público (PL-21).
 */
export interface NotaDelLead {
  id: string;
  texto: string;
  autorUserId: string | null;
  autorNombre: string;
  creadaEl: string;
}

export interface AgendarVisitaInput {
  propertyId?: string;
  fecha: string; // AAAA-MM-DD
  horaInicio: string; // HH:mm
  horaFin?: string;
  modalidad?: 'IN_PERSON' | 'VIRTUAL';
  asesorUserId?: string;
  nota?: string;
}

export const embudoApi = {
  async notas(pipelineItemId: string): Promise<{ disponible: boolean; notas: NotaDelLead[] }> {
    return apiClient.get(`/inmobiliaria/pipeline/${pipelineItemId}/notas`);
  },

  async agregarNota(pipelineItemId: string, texto: string): Promise<NotaDelLead> {
    return apiClient.post(`/inmobiliaria/pipeline/${pipelineItemId}/notas`, { texto });
  },

  async agendarVisita(
    pipelineItemId: string,
    input: AgendarVisitaInput,
  ): Promise<{ id: string; stage: string; asesorUserId: string }> {
    return apiClient.post(`/inmobiliaria/pipeline/${pipelineItemId}/visita`, input);
  },

  async reasignar(pipelineItemId: string, aUserId: string, nota?: string): Promise<void> {
    await apiClient.post(`/inmobiliaria/leads/${pipelineItemId}/reasignar`, {
      aUserId,
      ...(nota ? { nota } : {}),
    });
  },

  /** PL-21: público, sin cuenta. */
  async teLlamamos(
    propertyId: string,
    datos: { nombre: string; telefono: string; correo?: string; mensaje?: string },
  ): Promise<{ recibido: true }> {
    return apiClient.post(`/visits/properties/${propertyId}/te-llamamos`, datos);
  },
};

/** PL-13: las marcas de la sincronización (`application:<id>`, `visit:<id>`) no son notas. */
export function notasSinMarcas(notas: string | null | undefined): string {
  return (notas ?? '')
    .split('\n')
    .filter((l) => !/^\s*(application|visit|source):[\w:-]+\s*$/i.test(l))
    .join('\n')
    .trim();
}
