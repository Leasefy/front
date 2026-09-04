import { apiClient } from './client';
import type {
  ActualizarPqrsInput,
  CrearPqrsInput,
  Pqrs,
  PqrsListResponse,
} from './pqrs-agencia.types';

const BASE = '/inmobiliaria/pqrs';

export const pqrsApi = {
  /** GET /inmobiliaria/pqrs — resumen por estado + todas las solicitudes de la agencia. */
  async listar(): Promise<PqrsListResponse> {
    return apiClient.get<PqrsListResponse>(BASE);
  },

  /** POST /inmobiliaria/pqrs — radicar. */
  async crear(input: CrearPqrsInput): Promise<Pqrs> {
    return apiClient.post<Pqrs>(BASE, input);
  },

  /** PATCH /inmobiliaria/pqrs/:id — mover de estado o reasignar. */
  async actualizar(id: string, input: ActualizarPqrsInput): Promise<Pqrs> {
    return apiClient.patch<Pqrs>(`${BASE}/${id}`, input);
  },
};
