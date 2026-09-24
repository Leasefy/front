import { apiClient } from './client';

/**
 * Qué bienvenidas de primera vez del panel ya vio la INMOBILIARIA.
 *
 * 🔴 Nico, 23-09: «El onboarding solo debe aparecer una sola vez por
 * inmobiliaria: si le da omitir no vuelve a aparecer y si lo ve completo no
 * vuelve a aparecer».
 *
 * Esto reemplaza el camino que lo hacía reaparecer: el «ya lo vi» se ESCRIBÍA
 * en el micro (`PATCH /api/agency/:id/members/me/preferences`, por miembro) y
 * se LEÍA de `/users/me` del back (las preferencias de búsqueda del inquilino,
 * que nunca lo traen). Ahora se escribe y se lee en el MISMO recurso del back,
 * por agencia (`GET/PUT /inmobiliaria/onboarding-visto`); la agencia la pone el
 * back con la sesión, nunca el front.
 */

export type EstadoDelOnboarding = 'completo' | 'omitido';

/** El recorrido guiado del panel. */
export const CLAVE_DEL_RECORRIDO_DEL_PANEL = 'recorrido-del-panel';

/** La presentación de un agente de IA, la primera vez que se entra a su espacio. */
export function claveDeLaPresentacionDelAgente(idDelAgente: string): string {
  return `agente:${idDelAgente}`;
}

export interface OnboardingVisto {
  clave: string;
  estado: EstadoDelOnboarding;
  /** ISO. Cuándo la cerró la PRIMERA persona de la inmobiliaria. */
  fecha: string;
  usuarioId: string | null;
  /** Nombre de quien la cerró (puede no haber). */
  quien: string | null;
}

export interface LecturaDelOnboardingVisto {
  /**
   * `false` = el back no tiene dónde guardarlo (falta su migración). No es
   * «no visto»: es «no se sabe», y mientras no se sepa no se muestra nada.
   */
  disponible: boolean;
  motivo: string | null;
  vistas: OnboardingVisto[];
}

const BASE = '/inmobiliaria/onboarding-visto';

export const onboardingVistoApi = {
  leer(): Promise<LecturaDelOnboardingVisto> {
    return apiClient.get<LecturaDelOnboardingVisto>(BASE);
  },

  /**
   * La marca para TODA la inmobiliaria. Idempotente y la primera gana: la
   * respuesta es lo que quedó guardado, que puede ser de otra persona.
   */
  marcar(
    clave: string,
    estado: EstadoDelOnboarding,
  ): Promise<OnboardingVisto & { yaEstaba: boolean }> {
    return apiClient.put<OnboardingVisto & { yaEstaba: boolean }>(
      `${BASE}/${encodeURIComponent(clave)}`,
      { estado },
    );
  },
};
