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
};

/** One recurring weekly availability window. dayOfWeek: 0=Sun … 6=Sat. */
export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}
