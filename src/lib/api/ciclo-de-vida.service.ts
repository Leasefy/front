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
  /** La penalidad por defecto (cánones del contrato o de la inmobiliaria), para prellenar. */
  penalidadSugerida?: { canones: number; valorCop: number } | null;
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
  /** Hasta cuándo quedaría renovado por el término inicial (17-09). */
  renovarPorTerminoInicialHasta?: string | null;
}

export type OrigenDelIncremento = 'IPC' | 'DIGITADO' | 'TASA_PACTADA' | 'RENOVACION';
export type EstadoDeLaCarta = 'PENDIENTE_DE_REVISION' | 'REVISADA' | 'ENVIADA';

export interface AniversarioDelContrato {
  /** `YYYY-MM-DD`: desde este día rige el canon nuevo. */
  desde: string;
  origen: OrigenDelIncremento | null;
  porcentaje: number | null;
  canonAnteriorCop: number;
  canonNuevoCop: number;
  /** Por qué no sube, cuando no sube. */
  motivo: string | null;
  carta: {
    estado: EstadoDeLaCarta;
    contenido: string | null;
    generadaAt: string | null;
    revisadaAt: string | null;
    enviadaAt: string | null;
  } | null;
}

export interface IncrementosDelContrato {
  uso: 'VIVIENDA' | 'COMERCIAL' | null;
  tasaAnualPactadaPct: number | null;
  aniversarios: AniversarioDelContrato[];
  /** `false` = falta la migración: no se puede digitar ni generar cartas. */
  disponible: boolean;
  envioHabilitado: boolean;
}

export interface ResultadoDeLaExtension {
  contractId: string;
  modo: 'DIAS_OCUPADOS' | 'TERMINO_INICIAL';
  finAnterior: string;
  finNuevo: string;
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
    body: {
      terminadoEn: string;
      motivo: string;
      nota?: string;
      /**
       * La penalidad, en pesos enteros. Ausente = la por defecto; `null` = sin
       * penalidad. Entra como cargo de una vez y le llega al propietario menos
       * la comisión (17-09).
       */
      penalidadCop?: number | null;
      /** Reparto negociado: la parte que se queda la inmobiliaria. */
      penalidadParaLaInmobiliariaCop?: number;
    },
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

  /** Contrato vencido con el inquilino adentro: renovar por los días ocupados o por el término inicial. */
  extender: (
    contractId: string,
    body: { modo: 'DIAS_OCUPADOS' | 'TERMINO_INICIAL'; hasta?: string },
  ) => apiClient.post<ResultadoDeLaExtension>(`/contracts/${contractId}/extender`, body),

  incrementos: (contractId: string) =>
    apiClient.get<IncrementosDelContrato>(`/contracts/${contractId}/incrementos`),

  fijarTasaAnual: (contractId: string, porcentaje: number | null) =>
    apiClient.put<IncrementosDelContrato>(`/contracts/${contractId}/incrementos/tasa-anual`, {
      porcentaje,
    }),

  digitarIncremento: (
    contractId: string,
    desde: string,
    body: { porcentaje?: number | null; canonNuevoCop?: number | null },
  ) => apiClient.put<IncrementosDelContrato>(`/contracts/${contractId}/incrementos/${desde}`, body),

  generarCarta: (contractId: string, desde: string) =>
    apiClient.post<IncrementosDelContrato>(`/contracts/${contractId}/incrementos/${desde}/carta`, {}),

  revisarCarta: (contractId: string, desde: string, contenido?: string) =>
    apiClient.post<IncrementosDelContrato>(
      `/contracts/${contractId}/incrementos/${desde}/carta/revisar`,
      contenido ? { contenido } : {},
    ),

  enviarCarta: (contractId: string, desde: string) =>
    apiClient.post<IncrementosDelContrato>(
      `/contracts/${contractId}/incrementos/${desde}/carta/enviar`,
      {},
    ),
};
