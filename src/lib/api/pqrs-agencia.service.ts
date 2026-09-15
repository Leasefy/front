import { apiClient } from './client';
import type {
  ActualizarPqrsInput,
  CrearPqrsInput,
  Pqrs,
  PqrsDelContratoResponse,
  PqrsListResponse,
} from './pqrs-agencia.types';

const BASE = '/inmobiliaria/pqrs';

export const pqrsApi = {
  /** GET /inmobiliaria/pqrs — resumen por estado + todas las solicitudes de la agencia. */
  async listar(): Promise<PqrsListResponse> {
    return apiClient.get<PqrsListResponse>(BASE);
  },

  /**
   * GET /inmobiliaria/pqrs/contrato/:id — el seguimiento de PQRS DENTRO del
   * contrato (Nico, 2026-09-12). El back ata por el inmueble del contrato y
   * por la ventana en que el contrato estuvo vivo; devuelve esa regla en
   * `relacion` para que la sección pueda decirla.
   */
  async deContrato(contractId: string): Promise<PqrsDelContratoResponse> {
    return apiClient.get<PqrsDelContratoResponse>(`${BASE}/contrato/${contractId}`);
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
