/**
 * Estado de cuenta — espejo de `back-erp/src/inmobiliaria/estado-de-cuenta/`.
 *
 * Detrás de `AgencyMemberGuard` (la agencia sale del JWT, no se manda):
 *
 *   GET  /inmobiliaria/estado-de-cuenta/inquilino/:tenantRef
 *   GET  /inmobiliaria/estado-de-cuenta/propietario/:propietarioId
 *   GET  /inmobiliaria/estado-de-cuenta/:tipo/:id/resumen
 *   GET  /inmobiliaria/estado-de-cuenta/prefacturas?hasta=YYYY-MM-DD
 *   POST /inmobiliaria/estado-de-cuenta/:tipo/:id/compartir
 *   POST /inmobiliaria/estado-de-cuenta/:tipo/:id/compartir/correo|whatsapp
 *
 * Y dos que NO piden sesión de inmobiliaria:
 *
 *   GET /portal/estado-de-cuenta          — el del inquilino o propietario que mira
 *   GET /publico/estado-de-cuenta/:token  — el del enlace compartido, sin sesión
 *
 * 🔴 `tenantRef` y no `tenantId` a propósito: el inquilino puede no tener
 * cuenta del portal, y entonces lo que la lista trae es el id de su ficha de
 * tercero. Es un uuid en los dos casos y el back resuelve cuál es — igual que
 * `GET /inmobiliaria/inquilinos/:tenantId`.
 */

import { apiClient } from './client';
import type {
  EnlaceCompartido,
  EstadoDeCuenta,
  EnvioDelEnlace,
  PrefacturasHasta,
  ResumenDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

const BASE = '/inmobiliaria/estado-de-cuenta';

export const estadoDeCuentaApi = {
  /** Todo lo que un inquilino debe y pagó, contrato por contrato. */
  inquilino(tenantRef: string): Promise<EstadoDeCuenta> {
    return apiClient.get<EstadoDeCuenta>(
      `${BASE}/inquilino/${encodeURIComponent(tenantRef)}`,
    );
  },

  /** Lo mismo del lado del propietario: lo girado y lo que se le debe girar. */
  propietario(propietarioId: string): Promise<EstadoDeCuenta> {
    return apiClient.get<EstadoDeCuenta>(
      `${BASE}/propietario/${encodeURIComponent(propietarioId)}`,
    );
  },

  /**
   * Todas las facturas que saldrían de acá hasta `hasta` (`YYYY-MM-DD`),
   * agrupadas por mes. Es una consulta, no una emisión: generar sigue siendo
   * por mes.
   */
  prefacturas(hasta: string): Promise<PrefacturasHasta> {
    return apiClient.get<PrefacturasHasta>(
      `${BASE}/prefacturas?hasta=${encodeURIComponent(hasta)}`,
    );
  },

  /**
   * El resumen BARATO para las fichas: no arma filas, sólo suma cuotas.
   *
   * La ficha de un contrato, la de un inquilino y la de un propietario sólo
   * necesitan tres números; pedir el documento entero para mostrarlos haría
   * lenta una pantalla que se abre veinte veces al día.
   */
  resumen(
    tipo: 'inquilino' | 'propietario',
    id: string,
  ): Promise<ResumenDelEstadoDeCuenta> {
    return apiClient.get<ResumenDelEstadoDeCuenta>(
      `${BASE}/${tipo}/${encodeURIComponent(id)}/resumen`,
    );
  },

  /**
   * El estado de cuenta de QUIEN ESTÁ MIRANDO — los dos portales.
   *
   * 🔴 En el portal del inquilino y en el del propietario no hay un id en la
   * URL: el cliente es el dueño del token. Pedirlo con `/inquilino/:id` desde
   * ahí significaría que cualquiera puede escribir el id de otro, y además esa
   * ruta está detrás del guard de la inmobiliaria. El back resuelve por la
   * sesión con qué sombrero entra la persona y devuelve el mismo documento.
   */
  mio(): Promise<EstadoDeCuenta> {
    return apiClient.get<EstadoDeCuenta>('/portal/estado-de-cuenta');
  },

  /**
   * Manda el ENLACE al cliente, por correo o por WhatsApp. Nunca un adjunto:
   * un PDF pegado a un correo queda viejo el día que entra un abono y el
   * cliente sigue mirando el saldo de la semana pasada.
   *
   * 🔴 La decisión de si SE PUEDE mandar vive en el back, no acá: él sabe si
   * hay correo, si hay cuenta del portal, si hay teléfono y si la persona
   * aceptó WhatsApp, y responde `{ enviado: false, motivo }` con la razón en
   * palabras. El enlace queda creado igual, para mandarlo a mano.
   *
   * 🔴 Por WhatsApp el back escribe en el HILO DIRECTO del chat, que es lo que
   * el puente relaya. Así queda registrado —lo que se le manda a un cliente
   * tiene que poder auditarse— y el teléfono, que el back devuelve recortado
   * (`+57 310 ••• 0479`), no hace falta.
   */
  enviar(
    tipo: 'inquilino' | 'propietario',
    id: string,
    canal: 'CORREO' | 'WHATSAPP',
  ): Promise<EnvioDelEnlace> {
    const camino = canal === 'CORREO' ? 'correo' : 'whatsapp';
    return apiClient.post<EnvioDelEnlace>(
      `${BASE}/${tipo}/${encodeURIComponent(id)}/compartir/${camino}`,
      {},
    );
  },

  /**
   * Crea (o renueva) el enlace público y firmado para mandárselo al cliente.
   *
   * `POST` y no `GET` a propósito: emite un token nuevo con vencimiento, que es
   * un efecto, no una lectura.
   */
  compartir(
    tipo: 'inquilino' | 'propietario',
    id: string,
  ): Promise<EnlaceCompartido> {
    return apiClient.post<EnlaceCompartido>(
      `${BASE}/${tipo}/${encodeURIComponent(id)}/compartir`,
      {},
    );
  },

  /**
   * Los enlaces públicos que siguen abiertos para ese cliente, del más nuevo
   * al más viejo (`GET :tipo/:id/enlaces`). Auditoría 13-09, E3.
   */
  enlaces(tipo: 'inquilino' | 'propietario', id: string): Promise<EnlaceVivo[]> {
    return apiClient.get<EnlaceVivo[]>(`${BASE}/${tipo}/${encodeURIComponent(id)}/enlaces`);
  },

  /**
   * Revoca un enlace: desde ahí responde 404 a quien lo abra
   * (`DELETE enlaces/:enlaceId`). El permiso lo decide el back según el tipo
   * guardado en el enlace.
   */
  revocarEnlace(enlaceId: string): Promise<{ revocado: boolean }> {
    return apiClient.delete<{ revocado: boolean }>(
      `${BASE}/enlaces/${encodeURIComponent(enlaceId)}`,
    );
  },
};

/** Un enlace abierto, como lo lista `compartir-estado-de-cuenta.service.ts#enlacesDe`. */
export interface EnlaceVivo {
  id: string;
  /** ISO-8601. */
  venceEl: string;
  /** Cuántas veces se abrió. */
  aperturas: number;
  /** ISO-8601. */
  creadoEl: string;
}

/**
 * El estado de cuenta detrás de un enlace público, SIN sesión.
 *
 * No pasa por `apiClient`: ése agrega el `Authorization` de la inmobiliaria y
 * espera sesión viva. Acá no hay sesión —la persona abrió un enlace que le
 * llegó por WhatsApp— y el único permiso es el token de la URL.
 */
export async function estadoDeCuentaPublico(
  token: string,
): Promise<EstadoDeCuenta> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
  const r = await fetch(
    `${base}/publico/estado-de-cuenta/${encodeURIComponent(token)}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  );
  if (!r.ok) {
    // El mensaje del back dice si venció o si el enlace no existe; la pantalla
    // lo muestra tal cual en vez de inventar un motivo.
    const cuerpo = (await r.json().catch(() => null)) as { message?: string } | null;
    throw new Error(cuerpo?.message ?? `ENLACE_${r.status}`);
  }
  return (await r.json()) as EstadoDeCuenta;
}

/** La ruta de la pantalla, para enlazar desde las fichas. */
export function rutaDelEstadoDeCuenta(
  lado: 'inquilino' | 'propietario',
  id: string,
): string {
  return `/panel/inmobiliaria/estado-de-cuenta/${lado}/${encodeURIComponent(id)}`;
}
