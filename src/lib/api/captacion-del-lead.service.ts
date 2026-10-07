/**
 * La captación de un lead del Pipeline (FALTANTES, 05-10-2026, #2).
 *
 * La casilla «Es propietario: quiere arrendar su inmueble», el «Borrador de
 * captación» que el Piloto prepara (propietario e inmueble, SÓLO en el lead:
 * no cuentan en ninguna otra parte hasta que el asesor los convierte) y la
 * respuesta al propietario. Rutas del back en
 * `inmobiliaria/captacion/piloto/captacion-del-piloto.controller.ts`.
 */
import { apiClient } from '@/lib/api/client';

export type EstadoDeLaCaptacion = 'DETECTADA' | 'BORRADOR' | 'CONVERTIDA' | 'DESCARTADA';

export interface CaptacionDelLead {
  id: string;
  origen: 'CASILLA' | 'IMANA' | 'FRASE' | string;
  estado: EstadoDeLaCaptacion | string;
  frase: string | null;
  propietario: { nombre?: string; correo?: string | null; telefono?: string | null };
  inmueble: { tipo?: string | null; loQueDijo?: string | null };
  tareaId: string | null;
  propietarioId: string | null;
  respuesta: { estado: 'sin_enviar' | 'programada' | 'enviada'; cuando: string | null; resultado: string | null };
  creadaEl: string;
}

export interface CaptacionDelLeadRespuesta {
  disponible: boolean;
  motivo: string | null;
  captacion: CaptacionDelLead | null;
}

export interface CaptacionConvertida {
  propietarioId: string;
  yaExistia: boolean;
  crearInmueble: string;
}

const base = '/inmobiliaria/captacion/pipeline';

export const captacionDelLeadApi = {
  delLead(pipelineItemId: string): Promise<CaptacionDelLeadRespuesta> {
    return apiClient.get<CaptacionDelLeadRespuesta>(`${base}/leads/${pipelineItemId}`);
  },
  marcar(pipelineItemId: string, marcado: boolean): Promise<CaptacionDelLeadRespuesta> {
    return apiClient.put<CaptacionDelLeadRespuesta>(`${base}/leads/${pipelineItemId}/es-propietario`, { marcado });
  },
  descartar(captacionId: string): Promise<CaptacionDelLeadRespuesta> {
    return apiClient.post<CaptacionDelLeadRespuesta>(`${base}/borradores/${captacionId}/descartar`, {});
  },
  convertir(captacionId: string): Promise<CaptacionConvertida> {
    return apiClient.post<CaptacionConvertida>(`${base}/borradores/${captacionId}/convertir`, {});
  },
};

/** ¿La casilla está puesta? Lo descartado no cuenta. Puro. */
export function estaMarcado(c: CaptacionDelLead | null | undefined): boolean {
  return Boolean(c && c.estado !== 'DESCARTADA');
}
