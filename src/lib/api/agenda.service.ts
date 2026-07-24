import { apiClient } from './client';
import type { AgendaListResponse } from './agenda.types';
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

  /** GET visit availability windows for one of the agency's properties. */
  async getDisponibilidad(propertyId: string): Promise<AvailabilityWindow[]> {
    return apiClient.get<AvailabilityWindow[]>(
      `/inmobiliaria/agenda/propiedades/${propertyId}/disponibilidad`,
    );
  },

  /** PUT — replace the full weekly availability for a property. */
  async setDisponibilidad(
    propertyId: string,
    windows: AvailabilityWindow[],
  ): Promise<AvailabilityWindow[]> {
    return apiClient.put<AvailabilityWindow[]>(
      `/inmobiliaria/agenda/propiedades/${propertyId}/disponibilidad`,
      { windows },
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
