import { apiClient } from './client';
import type { AgendaListResponse,
  CrearTareaInput,
  ActualizarTareaInput,
} from './agenda.types';
import { RESUMEN_AGENDA_VACIO } from './agenda.types';
import { ApiError } from './client';

/** Payload to schedule an agency visit ("pedir cita"). */
export interface CreateCitaInput {
  propertyId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  visitType?: 'IN_PERSON' | 'VIRTUAL';
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

/**
 * Agenda API — reads the aggregated system events for the current agency and
 * schedules agency visits.
 */
/** Presencial o por video. Son los dos que entiende el back. */
export type TipoDeVisita = 'IN_PERSON' | 'VIRTUAL';

export interface DisponibilidadDeVisitas {
  windows: AvailabilityWindow[];
  /** Vacío = no se acepta ninguna, aunque haya horarios cargados. */
  visitTypes: TipoDeVisita[];
}

export const agendaApi = {
  async getAgenda(): Promise<AgendaListResponse> {
    try {
      return await apiClient.get<AgendaListResponse>('/inmobiliaria/agenda');
    } catch (err) {
      // No agency context / not permitted → honest empty agenda, not a crash.
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return { resumen: RESUMEN_AGENDA_VACIO, eventos: [], total: 0 };
      }
      throw err;
    }
  },

  /** POST /inmobiliaria/agenda/citas — schedule a visit for a prospect. */
  async createCita(input: CreateCitaInput): Promise<void> {
    await apiClient.post('/inmobiliaria/agenda/citas', input);
  },

  /** POST /inmobiliaria/agenda/tareas — una tarea propia. */
  async crearTarea(input: CrearTareaInput): Promise<void> {
    await apiClient.post('/inmobiliaria/agenda/tareas', input);
  },

  /** PATCH /inmobiliaria/agenda/tareas/:id — completar, cancelar o editar. */
  async actualizarTarea(id: string, input: ActualizarTareaInput): Promise<void> {
    await apiClient.patch(`/inmobiliaria/agenda/tareas/${id}`, input);
  },

  /**
   * GET cómo se visita este inmueble: sus ventanas y qué modalidades acepta.
   *
   * Antes devolvía el arreglo de ventanas suelto; ahora es un objeto, porque
   * la pantalla que edita esto es una sola y pedir las modalidades aparte era
   * un viaje de más.
   */
  async getDisponibilidad(propertyId: string): Promise<DisponibilidadDeVisitas> {
    return apiClient.get<DisponibilidadDeVisitas>(
      `/inmobiliaria/agenda/propiedades/${propertyId}/disponibilidad`,
    );
  },

  /**
   * PUT — reemplaza la semana entera del inmueble.
   *
   * `visitTypes` ausente = no se tocan las modalidades que ya tenía. La lista
   * VACÍA sí se aplica y significa «ninguna».
   */
  async setDisponibilidad(
    propertyId: string,
    windows: AvailabilityWindow[],
    visitTypes?: TipoDeVisita[],
  ): Promise<DisponibilidadDeVisitas> {
    return apiClient.put<DisponibilidadDeVisitas>(
      `/inmobiliaria/agenda/propiedades/${propertyId}/disponibilidad`,
      { windows, ...(visitTypes ? { visitTypes } : {}) },
    );
  },

  /** PATCH — confirm a visit. */
  async aceptarCita(visitId: string): Promise<void> {
    await apiClient.patch(`/inmobiliaria/agenda/citas/${visitId}/aceptar`, {});
  },

  /** PATCH — reject a visit (optional reason). */
  async rechazarCita(visitId: string, reason?: string): Promise<void> {
    await apiClient.patch(`/inmobiliaria/agenda/citas/${visitId}/rechazar`, { reason });
  },

  /** PATCH — cancel a visit (optional reason). */
  async cancelarCita(visitId: string, reason?: string): Promise<void> {
    await apiClient.patch(`/inmobiliaria/agenda/citas/${visitId}/cancelar`, { reason });
  },

  /** GET the agent's single visit schedule (governs all their properties). */
  async getAgenteDisponibilidad(agentId: string): Promise<AvailabilityWindow[]> {
    return apiClient.get<AvailabilityWindow[]>(
      `/inmobiliaria/agentes/${agentId}/disponibilidad`,
    );
  },

  /** PUT — set the agent's schedule once; fans out to all their properties. */
  async setAgenteDisponibilidad(
    agentId: string,
    windows: AvailabilityWindow[],
  ): Promise<{ applied: number }> {
    return apiClient.put<{ applied: number }>(
      `/inmobiliaria/agentes/${agentId}/disponibilidad`,
      { windows },
    );
  },

  /** GET my own visit schedule (self-service, logged-in agent). */
  async getMiDisponibilidad(): Promise<AvailabilityWindow[]> {
    return apiClient.get<AvailabilityWindow[]>('/inmobiliaria/agentes/mi-disponibilidad');
  },

  /** PUT my own visit schedule (self-service). */
  async setMiDisponibilidad(windows: AvailabilityWindow[]): Promise<{ applied: number }> {
    return apiClient.put<{ applied: number }>('/inmobiliaria/agentes/mi-disponibilidad', {
      windows,
    });
  },
};

/** One recurring weekly availability window. dayOfWeek: 0=Sun … 6=Sat. */
export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}
