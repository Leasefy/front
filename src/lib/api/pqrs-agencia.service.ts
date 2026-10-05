import { apiClient } from './client';
import { subirAdjuntoDePqrs } from './pqrs-adjuntos';
import type {
  AdjuntoDePqrs,
  PqrsConHistorial,
  ResponsableDePqrs,
  ActualizarPqrsInput,
  CrearPqrsInput,
  MantenimientoDeLaPqrs,
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

  /** El cajón: historial, respuesta, adjuntos (PQRS-FIX, 04-10-2026). */
  async detalle(id: string): Promise<PqrsConHistorial> {
    return apiClient.get<PqrsConHistorial>(`${BASE}/${id}`);
  },

  /** SO-22: quién puede quedar de responsable. */
  async responsables(): Promise<ResponsableDePqrs[]> {
    return apiClient.get<ResponsableDePqrs[]>(`${BASE}/responsables`);
  },

  /** SO-18: una foto o un PDF (el back valida tipo real y 10 MB). */
  async subirAdjunto(id: string, archivo: File): Promise<AdjuntoDePqrs> {
    return (await subirAdjuntoDePqrs(`${BASE}/${id}/adjuntos`, archivo)) as AdjuntoDePqrs;
  },

  /**
   * PI-28 · POST /inmobiliaria/pqrs/:id/mantenimiento — la solicitud de
   * Mantenimiento de una reparación (una sola por PQRS: si ya está, la misma).
   */
  async aMantenimiento(id: string): Promise<{ solicitud: MantenimientoDeLaPqrs; creada: boolean }> {
    return apiClient.post(`${BASE}/${id}/mantenimiento`, {});
  },

  async abrirAdjunto(id: string, adjuntoId: string): Promise<{ url: string; nombre: string; tipo: string }> {
    return apiClient.get(`${BASE}/${id}/adjuntos/${adjuntoId}`);
  },
};
