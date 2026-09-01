/**
 * El estado de la migración de una inmobiliaria — el dato que levanta el muro.
 *
 * ── Por qué esto existe aparte de `migracion-terceros.service` ─────────────
 *
 * La secuencia de arranque (`SecuenciaDeMigracion`) mide el avance leyendo
 * CUATRO endpoints distintos, uno por paso, cada uno detrás de su permiso.
 * Eso sirve para pintar tarjetas, pero no para decidir si alguien entra o no
 * al producto: cuatro llamadas son cuatro maneras de fallar, y una decisión
 * de acceso no se puede tomar sobre un `allSettled` a medias.
 *
 * Por eso el back resuelve la pregunta entera en UNA respuesta: `bloquea`
 * sí o no, y el detalle de cada paso para poder dibujarlos. El front no
 * infiere el bloqueo — lo lee.
 *
 * ── 🔴 La regla que gobierna todo este archivo ─────────────────────────────
 *
 * **Ante la duda, no se bloquea.** Un error de red, un 500, un 403, una
 * respuesta con otra forma o una que tarda: todos terminan con el panel
 * abierto. Un cliente que paga no puede quedar afuera del producto porque
 * un endpoint se cayó. Eso vive en `normalizarEstado()` (muro-reglas.ts),
 * que es lo único que puede decir «sí, bloqueá».
 */

import { apiClient } from './client';

const BASE = '/inmobiliaria/migracion';

/** Los cinco pasos del arranque, en el orden en que se necesitan. */
export type IdDePasoDeMigracion =
  | 'terceros'
  | 'propiedades'
  | 'contratos'
  | 'puc'
  | 'contables';

/**
 * `no_disponible` NO es un error ni un pendiente: es un paso que el back no
 * puede ofrecer ahora (un módulo apagado o caído). No frena a nadie.
 */
export type EstadoDePasoDeMigracion = 'listo' | 'pendiente' | 'no_disponible';

export interface PasoDeMigracion {
  id: IdDePasoDeMigracion;
  estado: EstadoDePasoDeMigracion;
  /** Texto ya armado por el back: «12 propietarios · 30 inquilinos». */
  detalle: string | null;
  conteo: number;
}

export interface EstadoDeMigracion {
  /** La única llave del muro. */
  bloquea: boolean;
  /** Cómo salió del muro quien ya salió. `null` = todavía no salió. */
  resuelta: 'completada' | 'omitida' | null;
  pasos: PasoDeMigracion[];
}

export const migracionEstadoApi = {
  /** El estado completo. Es la única lectura que el muro necesita. */
  async estado(): Promise<EstadoDeMigracion> {
    return apiClient.get<EstadoDeMigracion>(`${BASE}/estado`);
  },

  /**
   * «Ya terminé». Sólo se ofrece cuando todos los pasos disponibles están
   * listos, pero la decisión final es del back: acá no se afirma nada.
   */
  async terminar(): Promise<EstadoDeMigracion> {
    return apiClient.post<EstadoDeMigracion>(`${BASE}/terminar`);
  },

  /**
   * «No vengo de otro sistema». La salida de la inmobiliaria nueva.
   *
   * 🔴 Sin esto, una inmobiliaria que arranca de cero queda encerrada para
   * siempre: no tiene nada que migrar, así que nunca va a poder marcar los
   * pasos como listos.
   *
   * El cuerpo se arma con una lista explícita de claves porque el back monta
   * el `ValidationPipe` con `forbidNonWhitelisted: true`: una clave de más no
   * se ignora, tira 400.
   */
  async omitir(motivo?: string): Promise<EstadoDeMigracion> {
    const limpio = motivo?.trim();
    return apiClient.post<EstadoDeMigracion>(
      `${BASE}/omitir`,
      limpio ? { motivo: limpio } : {},
    );
  },
};
