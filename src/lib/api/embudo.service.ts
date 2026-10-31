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

/** Lo que toca en la etapa del interesado (reunión con Juan, 31-10-2026; back `etapa-del-interesado.service.ts`). */
export interface LoDeLaEtapa {
  visita: {
    visitId: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    modalidad: 'IN_PERSON' | 'VIRTUAL';
    estado: string;
    asesorUserId: string | null;
    /** Ya terminó y nadie dijo si se hizo. */
    yaPaso: boolean;
  } | null;
  postulacion: { applicationId: string; estado: string; documentos: number; enviadaEl: string | null } | null;
  contratos: {
    arrendamiento: { contractId: string; estado: string; firmado: boolean } | null;
    administracion: { consignacionId: string; estado: 'FIRMADA' | 'PENDIENTE' | 'SIN_FIRMA' } | null;
    ambosFirmados: boolean;
  };
  entrega: {
    tareaId: string;
    fecha: string;
    hora: string | null;
    responsableUserId: string | null;
    estado: string;
    yaPaso: boolean;
  } | null;
}

export const embudoApi = {
  async etapa(pipelineItemId: string): Promise<LoDeLaEtapa> {
    return apiClient.get(`/inmobiliaria/pipeline/${pipelineItemId}/etapa`);
  },

  /** Agendar o reprogramar la entrega del inmueble (pasa a «Entrega»). */
  async agendarEntrega(
    pipelineItemId: string,
    input: { fecha: string; hora?: string; responsableUserId?: string; nota?: string },
  ): Promise<LoDeLaEtapa['entrega']> {
    return apiClient.post(`/inmobiliaria/pipeline/${pipelineItemId}/entrega`, input);
  },

  /** La entrega se hizo: pasa a «Cerrado - Arrendado». */
  async entregaHecha(pipelineItemId: string): Promise<{ stage: string }> {
    return apiClient.post(`/inmobiliaria/pipeline/${pipelineItemId}/entrega/hecha`, {});
  },

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
    datos: {
      nombre: string;
      telefono?: string;
      correo?: string;
      mensaje?: string;
      /** 21-10-2026: cómo quiere que la contacten. El back viejo no lo conoce (400): back primero. */
      canal?: 'whatsapp' | 'llamada' | 'correo';
    },
  ): Promise<{ recibido: true }> {
    return apiClient.post(`/visits/properties/${propertyId}/te-llamamos`, datos);
  },
};

/** PL-13: las marcas de la sincronización (`application:<id>`, `visit:<id>`, `entrega:<id>`) no son notas. */
export function notasSinMarcas(notas: string | null | undefined): string {
  return (notas ?? '')
    .split('\n')
    .filter((l) => !/^\s*(application|visit|source|entrega):[\w:-]+\s*$/i.test(l))
    .join('\n')
    .trim();
}
