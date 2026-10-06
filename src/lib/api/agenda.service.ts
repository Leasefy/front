import { apiClient } from './client';
import type { AgendaListResponse,
  CrearTareaInput,
  ActualizarTareaInput,
  MiembroDelEquipo,
  VistaDeAgenda,
} from './agenda.types';
import { EVENTOS_POR_PAGINA, RESUMEN_AGENDA_VACIO } from './agenda.types';
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
  /** AG-06: quien atiende la visita (ninguna nace sin asesor). */
  asesorUserId?: string;
  /** PL-25: el interesado del embudo al que se liga. */
  pipelineItemId?: string;
}

/**
 * Agenda API — reads the aggregated system events for the current agency and
 * schedules agency visits.
 */
/** Presencial o por video. Son los dos que entiende el back. */
export type TipoDeVisita = 'IN_PERSON' | 'VIRTUAL';

export interface DisponibilidadDeVisitas {
  /** La agenda PRESENCIAL. Se conserva por compatibilidad. */
  windows: AvailabilityWindow[];
  /**
   * Una agenda por modalidad. Son distintas a propósito: una videollamada se
   * atiende a las 8 de la noche y abrir el inmueble a esa hora no.
   * Ausente = un back anterior a la separación.
   */
  agendas?: Record<TipoDeVisita, AvailabilityWindow[]>;
  /** Vacío = no se acepta ninguna, aunque haya horarios cargados. */
  visitTypes: TipoDeVisita[];
}

/** Qué página del feed se quiere. Sin esto el back devolvía el feed entero. */
export interface PaginaDeAgendaPedida {
  page?: number;
  pageSize?: number;
  /** Sólo los eventos de este inmueble. Lo filtra la BASE, no esta pantalla. */
  propertyId?: string;
  /** AG-02: próximas, vencidas o hechas. */
  vista?: VistaDeAgenda;
  /** AG-04: sólo lo mío. */
  mias?: boolean;
  /** AG-04: la semana que se mira (días AAAA-MM-DD). */
  desde?: string;
  hasta?: string;
}

export const agendaApi = {
  /**
   * GET una PÁGINA de la agenda. La paginación la resuelve la base
   * (caso A8): pedir la página 2 es una consulta más barata, no un corte en
   * memoria sobre un feed que ya vino entero.
   */
  async getAgenda(pedido: PaginaDeAgendaPedida = {}): Promise<AgendaListResponse> {
    const page = pedido.page ?? 1;
    const pageSize = pedido.pageSize ?? EVENTOS_POR_PAGINA;
    try {
      const deUnInmueble = pedido.propertyId
        ? `&propertyId=${encodeURIComponent(pedido.propertyId)}`
        : '';
      const extra = [
        pedido.vista ? `&vista=${pedido.vista}` : '',
        pedido.mias ? '&mias=true' : '',
        pedido.desde ? `&desde=${pedido.desde}` : '',
        pedido.hasta ? `&hasta=${pedido.hasta}` : '',
      ].join('');
      return await apiClient.get<AgendaListResponse>(
        `/inmobiliaria/agenda?page=${page}&pageSize=${pageSize}${deUnInmueble}${extra}`,
      );
    } catch (err) {
      // Sin contexto de agencia (404) la agenda vacía ES la verdad.
      //
      // 🔴 El 403 NO se traga. «No tienes acceso» y «no hay nada agendado» son
      // hechos distintos, y `FalloDeCarga` ya sabe decir el primero sin ofrecer
      // un "Reintentar" que no arregla nada. Devolver un feed vacío ahí hacía
      // que la pantalla afirmara que la agencia no tiene nada agendado —
      // pudiendo estar llena.
      if (err instanceof ApiError && err.status === 404) {
        return { resumen: RESUMEN_AGENDA_VACIO, eventos: [], total: 0, page, pageSize };
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
    visitType: TipoDeVisita = 'IN_PERSON',
  ): Promise<DisponibilidadDeVisitas> {
    return apiClient.put<DisponibilidadDeVisitas>(
      `/inmobiliaria/agenda/propiedades/${propertyId}/disponibilidad`,
      { windows, visitType, ...(visitTypes ? { visitTypes } : {}) },
    );
  },

  /** PATCH — confirmar una visita; AG-06: con el asesor que la atiende. */
  async aceptarCita(visitId: string, asesorUserId?: string): Promise<void> {
    await apiClient.patch(
      `/inmobiliaria/agenda/citas/${visitId}/aceptar`,
      asesorUserId ? { asesorUserId } : {},
    );
  },

  /** AG-06: la visita se hizo (su interesado pasa a «Visita hecha»). */
  async marcarHecha(visitId: string): Promise<void> {
    await apiClient.patch(`/inmobiliaria/agenda/citas/${visitId}/hecha`, {});
  },

  /** AG-06: otra fecha y hora (misma persona, asesor e interesado). */
  async reprogramar(
    visitId: string,
    input: { fecha: string; horaInicio: string; horaFin?: string; motivo?: string },
  ): Promise<void> {
    await apiClient.patch(`/inmobiliaria/agenda/citas/${visitId}/reprogramar`, input);
  },

  /** AG-06: asignar el asesor que atiende la visita. */
  async asignarAsesor(visitId: string, asesorUserId: string): Promise<void> {
    await apiClient.post(`/inmobiliaria/visitas/${visitId}/asesor`, { asesorUserId });
  },

  /** AG-09/AG-04: el equipo activo, con nombre y rol. */
  async equipo(): Promise<MiembroDelEquipo[]> {
    return apiClient.get<MiembroDelEquipo[]>('/inmobiliaria/agenda/equipo');
  },

  /** PL-21: los avisos publicados que no reciben visitas (sin horario). */
  async avisosSinHorario(): Promise<{
    publicados: number;
    sinHorario: number;
    inmuebles: { id: string; titulo: string; codigo: number | null }[];
  }> {
    return apiClient.get('/inmobiliaria/agenda/avisos-sin-horario');
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
