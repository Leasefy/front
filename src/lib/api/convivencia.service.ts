/**
 * Los llamados de atención por convivencia de un contrato (Nico, 29-10-2026).
 * Back: `contracts/convivencia/convivencia.controller.ts`. Leer pide
 * `contratos:view`; anotar y anular, `contratos:edit`. Sin la actualización del
 * back, la lista llega con `disponible: false` y anotar responde
 * `FALTA_UNA_MIGRACION`.
 */
import { apiClient } from './client';

export type MotivoDeConvivencia =
  | 'ruido'
  | 'mascotas'
  | 'basuras'
  | 'areas_comunes'
  | 'parqueadero'
  | 'visitas'
  | 'danos'
  | 'otro';

export type QuienLoReporto = 'vecino' | 'administracion' | 'propietario' | 'inmobiliaria' | 'otro';

export interface LlamadoDeAtencion {
  id: string;
  motivo: string;
  /** `AAAA-MM-DD` */
  fecha: string;
  quePaso: string;
  loReporto: string | null;
  registradoPor: string | null;
  creadoEn: string;
}

export interface LlamadosDelContrato {
  disponible: boolean;
  llamados: LlamadoDeAtencion[];
  porMotivo: Array<{ motivo: string; cuantos: number }>;
}

export const convivenciaApi = {
  listar: (contractId: string) => apiClient.get<LlamadosDelContrato>(`/contracts/${contractId}/llamados-de-atencion`),

  registrar: (
    contractId: string,
    datos: { motivo: MotivoDeConvivencia; fecha: string; quePaso: string; loReporto: QuienLoReporto | null },
  ) => apiClient.post<{ llamado: LlamadoDeAtencion }>(`/contracts/${contractId}/llamados-de-atencion`, datos),

  anular: (contractId: string, llamadoId: string, motivo: string) =>
    apiClient.post<{ anulado: true }>(`/contracts/${contractId}/llamados-de-atencion/${llamadoId}/anular`, { motivo }),
};
