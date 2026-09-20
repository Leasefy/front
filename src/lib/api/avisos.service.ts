import { apiClient } from './client';

/**
 * Los avisos automáticos de la inmobiliaria: qué sale solo y con qué texto.
 *
 * 🔴 «Cada aviso con su plantilla por inmobiliaria, APAGADO hasta que cada una
 * lo prenda, respetando `EMAIL_DELIVERY_ENABLED`: nada sale desde local»
 * (Nico, 18-09-2026). El back tiene DOS candados en serie —esta pantalla es el
 * primero— y la ausencia de fila es «apagado».
 */
export interface AvisoAutomatico {
  codigo: string;
  titulo: string;
  cuando: string;
  destinatario: 'INQUILINO' | 'PROPIETARIO' | 'CODEUDOR';
  /** `true` = puede salir SOLO. Los otros esperan a que alguien los mande. */
  automatico: boolean;
  grupo: 'PLATA' | 'CONTRATO' | 'COBRANZA';
  prendido: boolean;
  tienePlantillaPropia: boolean;
  prendidoAt: string | null;
  /** Lo que la pantalla advierte al apagarlo. `null` si no hay nada que decir. */
  advertenciaAlApagar: string | null;
}

export interface EstadoDeLosAvisos {
  /** `false` = falta la migración: NINGUNO sale solo y se dice por qué. */
  disponible: boolean;
  motivo: string | null;
  avisos: AvisoAutomatico[];
}

export interface VistaPreviaDelAviso {
  aviso: string;
  asunto: string;
  html: string;
  /** Datos que la plantilla pide y nadie entregó. Vacío es lo correcto. */
  faltantes: string[];
  prendido: boolean;
  conPlantillaPropia: boolean;
}

const BASE = '/inmobiliaria/avisos';

export const avisosApi = {
  estado(): Promise<EstadoDeLosAvisos> {
    return apiClient.get<EstadoDeLosAvisos>(BASE);
  },

  fijar(
    aviso: string,
    datos: { prendido: boolean; asunto?: string | null; cuerpo?: string | null },
  ): Promise<{
    aviso: string;
    prendido: boolean;
    tienePlantillaPropia: boolean;
    prendidoAt: string | null;
    advertencia: string | null;
  }> {
    return apiClient.put(`${BASE}/${aviso}`, datos);
  },

  /**
   * 🔴 M-03: la vista previa. Renderiza con la MISMA función que el envío real,
   * así que lo que se ve acá es lo que le llega al cliente. NO manda nada.
   */
  vistaPrevia(
    aviso: string,
    variables: Record<string, string> = {},
  ): Promise<VistaPreviaDelAviso> {
    return apiClient.put<VistaPreviaDelAviso>(`${BASE}/${aviso}/vista-previa`, {
      variables,
    });
  },
};
