/**
 * El ciclo de vida del contrato después de firmado: terminarlo antes de
 * tiempo, ver cuántos están vencidos y registrar la cesión cuando el
 * propietario vende.
 *
 * Espeja `CicloDeVidaDelContratoController` del back.
 */

import { apiClient } from './client';

export interface MotivoDeTerminacion {
  codigo: string;
  nombre: string;
  /** `OTRO` — el back rechaza la terminación sin nota. */
  exigeNota: boolean;
}

export interface ProrrateoDelUltimoMes {
  mes: string;
  diasOcupados: number;
  diasDelMes: number;
  valorCop: number;
  canonMensualCop: number;
}

export interface VistaPreviaDeTerminacion {
  puedeTerminarse: boolean;
  /** Por qué no se puede, en castellano. `null` cuando sí se puede. */
  razon: string | null;
  prorrateoDelUltimoMes: ProrrateoDelUltimoMes | null;
  finPactado: string | null;
  /** `false` = falta aplicar la migración en esta base. */
  disponible: boolean;
}

export interface ResultadoDeTerminacion {
  contractId: string;
  terminadoEn: string;
  motivo: string;
  motivoLegible: string;
  finPactadoOriginal: string | null;
  inmuebleLiberado: boolean;
  prorrateoDelUltimoMes: ProrrateoDelUltimoMes | null;
}

export interface ContratoVencido {
  id: string;
  code: number;
  externalId: string | null;
  tenantName: string | null;
  propertyAddress: string | null;
  propertyId: string | null;
  monthlyRent: number | null;
  endDate: string;
  diasVencido: number;
  leyenda: string;
  tieneRenovacionAbierta: boolean;
}

export interface ResumenDeVencidos {
  cuantos: number;
  cuantosSinRenovacion: number;
  aviso: string | null;
  contratos: ContratoVencido[];
}

export interface ResultadoDeLaCesion {
  contractId: string;
  desde: string;
  propietarioAnterior: string | null;
  propietarioNuevo: string;
  cuotasReapuntadas: number;
  parteId: string;
}

export const cicloDeVidaApi = {
  motivosDeTerminacion: () =>
    apiClient.get<{ motivos: MotivoDeTerminacion[] }>(
      '/contracts/motivos-de-terminacion',
    ),

  /** Qué pasa si termino en esa fecha. No escribe nada. */
  vistaPreviaDeTerminacion: (contractId: string, terminadoEn: string) =>
    apiClient.get<VistaPreviaDeTerminacion>(
      `/contracts/${contractId}/terminacion/vista-previa?terminadoEn=${encodeURIComponent(terminadoEn)}`,
    ),

  terminar: (
    contractId: string,
    body: { terminadoEn: string; motivo: string; nota?: string },
  ) =>
    apiClient.post<ResultadoDeTerminacion>(
      `/contracts/${contractId}/terminar`,
      body,
    ),

  vencidos: () => apiClient.get<ResumenDeVencidos>('/contracts/vencidos'),

  registrarCesion: (
    contractId: string,
    body: {
      desde: string;
      nuevosPropietarios: { propietarioId: string; participacionBps: number }[];
      nota?: string;
    },
  ) =>
    apiClient.post<ResultadoDeLaCesion>(`/contracts/${contractId}/cesion`, body),
};
