/**
 * Las invitaciones al portal del inquilino que todavía no salieron.
 *
 * ── Por qué existe esta pantalla ────────────────────────────────────────────
 *
 * La migración crea la cuenta del inquilino y le manda un correo con el enlace
 * para poner su contraseña. Hasta el 2026-09-09 ese correo lo mandaba Supabase,
 * que topa a unas decenas por hora: el 8 de septiembre se crearon 1.470 cuentas
 * de inquilino y salieron 24 correos. Las otras 1.446 quedaron con cuenta,
 * sin poder entrar, y sin que nadie pudiera saber quiénes eran.
 *
 * El envío ya no pasa por ahí. Esto es lo otro que faltaba: **poder ver a
 * quién le falta y volver a mandársela**.
 */

import { apiClient } from './client';

/** Alguien con cuenta creada y sin invitación entregada. */
export interface PersonaPendiente {
  id: string;
  correo: string;
  /** `null` cuando el archivo no traía nombre. */
  nombre: string | null;
  /** ISO — cuándo se creó la cuenta. */
  creada: string;
  /** ISO de la última invitación que sí salió, o `null` si nunca salió una. */
  ultimoEnvio: string | null;
  /**
   * ISO — hasta cuándo sirve la última invitación (M-06: 7 días por defecto).
   * `null` si nunca salió una. Ausente = un back anterior.
   */
  vence?: string | null;
  /** `true` si la última invitación ya venció. Nunca salió = `false`. */
  vencida?: boolean;
  /** Los días de vigencia de la inmobiliaria (`null` en la base = 7). */
  diasDeVigencia?: number;
}

export interface Pendientes {
  /**
   * Cuántas hay en total, no cuántas vinieron en `personas`. Desde E-12
   * (03-10) SUMA las vencidas: las que nunca llegaron son `total - vencidas`.
   */
  total: number;
  /** Cuántas de `total` ya se mandaron y vencieron (se reenvían una por una). Ausente = un back anterior. */
  vencidas?: number;
  personas: PersonaPendiente[];
}

export interface FilaDeTanda {
  userId: string;
  enviada: boolean;
  /**
   * `RECIEN_ENVIADA` · `DOMINIO_NO_ENTREGABLE` · `CORREO_NO_CONFIGURADO` ·
   * `ENVIO_FALLIDO` · `ERROR`. Un CÓDIGO: la pantalla lo dice en palabras con
   * `fraseDelMotivo` (`InvitacionesPendientes`), nunca crudo.
   */
  motivo?: string;
}

export interface ResultadoDeTanda {
  enviadas: number;
  omitidas: number;
  resultados: FilaDeTanda[];
  /**
   * Cuántas siguen pendientes DESPUÉS de esta tanda.
   *
   * 🔴 Mientras sea mayor que cero hay que volver a llamar. Sin este número,
   * una tanda de 100 sobre 1.500 pendientes se lee como «listo».
   */
  restantes: number;
}

export const invitacionesApi = {
  async pendientes(filtros: { buscar?: string; limite?: number } = {}): Promise<Pendientes> {
    const q = new URLSearchParams();
    const buscar = filtros.buscar?.trim();
    if (buscar) q.set('buscar', buscar);
    if (filtros.limite) q.set('limite', String(filtros.limite));
    const cola = q.toString();
    return apiClient.get<Pendientes>(
      `/inmobiliaria/invitaciones/pendientes${cola ? `?${cola}` : ''}`,
    );
  },

  /**
   * Manda una tanda.
   *
   * Sin `userIds` toma las más viejas primero — son las que llevan más tiempo
   * esperando. Con `userIds` es el reenvío de filas concretas, y ése sí pasa
   * por encima de la espera entre envíos.
   */
  async enviar(opciones: { userIds?: string[]; limite?: number } = {}): Promise<ResultadoDeTanda> {
    return apiClient.post<ResultadoDeTanda>('/inmobiliaria/invitaciones/enviar', opciones);
  },
};
