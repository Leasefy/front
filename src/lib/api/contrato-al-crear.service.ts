/**
 * Nico, 29-10-2026 (reunión con Portofino): el contrato que se crea en el
 * panel YA está firmado (las firmas van por el módulo de Firmas), así que
 * nace activo; la fecha real de entrega del inmueble; y el borrador de
 * «Nuevo contrato», que se guarda solo mientras la persona escribe.
 */
import { apiClient } from './client';

export interface BorradorDelContratoNuevoGuardado {
  datos: unknown;
  actualizadoEn: string;
}

export const contratoAlCrearApi = {
  /** Borrador → firmado → activo (o «Por empezar» si arranca después). */
  activarYaFirmado: (contractId: string) =>
    apiClient.post<{ porEmpezar: boolean }>(`/contracts/${contractId}/activar-ya-firmado`),

  entregaReal: (contractId: string) =>
    apiClient.get<{ disponible: boolean; fecha: string | null }>(`/contracts/${contractId}/entrega-real`),

  guardarEntregaReal: (contractId: string, fecha: string | null) =>
    apiClient.put<{ disponible: boolean; fecha: string | null }>(`/contracts/${contractId}/entrega-real`, { fecha }),

  leerBorrador: () =>
    apiClient.get<{ borrador: BorradorDelContratoNuevoGuardado | null }>('/inmobiliaria/contratos/borrador'),

  /** `guardado: false` = al back le falta la actualización; queda en el navegador. */
  guardarBorrador: (datos: Record<string, unknown>) =>
    apiClient.put<{ guardado: boolean }>('/inmobiliaria/contratos/borrador', { datos }),

  borrarBorrador: () => apiClient.delete<void>('/inmobiliaria/contratos/borrador'),
};
