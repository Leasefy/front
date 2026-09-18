import { apiClient } from './client';

/**
 * 🔴 LO QUE EL AGENTE PROPONE RADICAR (I-02, Nico 17/18-09-2026).
 *
 * «Una queja por WhatsApp o llamada: el agente la DETECTA y PROPONE radicarla,
 * una persona CONFIRMA y queda con la fecha del mensaje original».
 *
 * El rail por donde el agente las deja (`POST /internal/pqrs/propuestas`) y la
 * bandeja para confirmarlas quedaron construidos el 18-09 en el back. Sin
 * pantalla, las propuestas se acumulaban donde nadie las veía: el agente
 * detectaba quejas y ninguna llegaba a radicarse.
 *
 * 🔴 NADA SE RADICA SOLO. El agente propone, una persona confirma. Es la regla
 * de los tres niveles (sombra / copilot / automático) aplicada acá: una PQRS
 * mal radicada arranca un reloj legal contra la inmobiliaria.
 *
 * 🔴 La PQRS conserva la FECHA DEL MENSAJE ORIGINAL (`recibidaAt`), no la de
 * confirmar. Si alguien escribe el lunes y se confirma el jueves, el plazo
 * corrió desde el lunes — es el derecho de quien se quejó, no una comodidad.
 */

export interface PropuestaDePqrs {
  id: string;
  tipo: string;
  solicitanteTipo: string;
  solicitanteNombre: string;
  solicitanteContacto: string | null;
  asunto: string;
  descripcion: string | null;
  consignacionId: string | null;
  /** La fecha del mensaje original. Es la que hereda la PQRS al confirmar. */
  recibidaAt: string;
  origen: string;
  /** La conversación o la llamada de donde salió. */
  referenciaExterna: string | null;
  /** El trozo literal de lo que dijo la persona. */
  extracto: string | null;
  propuestaPor: string;
  confirmadaAt: string | null;
  pqrsId: string | null;
  descartadaAt: string | null;
  motivoDelDescarte: string | null;
  createdAt: string;
}

export interface CambiosAlConfirmar {
  tipo?: string;
  asunto?: string;
  descripcion?: string;
  asignadoAUserId?: string;
}

const BASE = '/inmobiliaria/pqrs/propuestas';

export const propuestasDePqrsApi = {
  /**
   * Sin la migración el back devuelve `[]`, no un 503: sin ella el agente no
   * podía dejar ninguna propuesta, así que una bandeja vacía ES el estado de
   * hoy. El 503 llega al confirmar o descartar.
   */
  listar(): Promise<PropuestaDePqrs[]> {
    return apiClient.get<PropuestaDePqrs[]>(BASE);
  },

  /** Crea la PQRS de verdad. Los cambios son correcciones de la persona. */
  confirmar(id: string, cambios: CambiosAlConfirmar = {}): Promise<PropuestaDePqrs> {
    return apiClient.post<PropuestaDePqrs>(`${BASE}/${id}/confirmar`, cambios);
  },

  /** El motivo es obligatorio: «no era una PQRS» sin decir por qué no enseña nada. */
  descartar(id: string, motivo: string): Promise<PropuestaDePqrs> {
    return apiClient.post<PropuestaDePqrs>(`${BASE}/${id}/descartar`, { motivo });
  },
};
