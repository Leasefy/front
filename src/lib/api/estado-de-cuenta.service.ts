/**
 * Estado de cuenta — espejo de `back-erp/src/inmobiliaria/estado-de-cuenta/`.
 *
 * Detrás de `AgencyMemberGuard` (la agencia sale del JWT, no se manda):
 *
 *   GET  /inmobiliaria/estado-de-cuenta/inquilino/:tenantRef
 *   GET  /inmobiliaria/estado-de-cuenta/propietario/:propietarioId
 *   GET  /inmobiliaria/estado-de-cuenta/:tipo/:id/resumen
 *   POST /inmobiliaria/estado-de-cuenta/:tipo/:id/compartir
 *   POST /inmobiliaria/estado-de-cuenta/:tipo/:id/compartir/correo|whatsapp
 *
 * 🔴 El FILTRO viaja (auditoría 13-09, E4): por query en las dos lecturas del
 * panel, en el cuerpo en las tres que emiten un enlace —y ahí queda guardado,
 * para que quien abra el enlace vea lo que se le quiso mostrar y no el
 * documento entero—. El recorte lo hace el back; acá sólo se manda y se pinta.
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
  FiltrosDelEstadoDeCuenta,
  ResumenDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

const BASE = '/inmobiliaria/estado-de-cuenta';

/**
 * El filtro como query, y sólo lo que está puesto.
 *
 * 🔴 El RECORTE lo hace el back (auditoría 13-09, E4): el front manda qué se
 * quiere ver y pinta lo que vuelve. Acá no se decide qué fila pasa — mandar un
 * campo vacío sería pedirle al back que filtre por «nada», que no es lo mismo
 * que no filtrar.
 */
export function queryDelFiltro(f?: FiltrosDelEstadoDeCuenta | null): string {
  if (!f) return '';
  const q = new URLSearchParams();
  if (f.soloPendientes) q.set('soloPendientes', 'true');
  if (f.desde) q.set('desde', f.desde);
  if (f.hasta) q.set('hasta', f.hasta);
  if (f.contrato) q.set('contrato', f.contrato);
  const texto = q.toString();
  return texto ? `?${texto}` : '';
}

/** El mismo filtro como cuerpo, para las tres rutas que emiten un enlace. */
export function cuerpoDelFiltro(
  f?: FiltrosDelEstadoDeCuenta | null,
): Record<string, unknown> {
  if (!f) return {};
  return {
    ...(f.soloPendientes ? { soloPendientes: true } : {}),
    ...(f.desde ? { desde: f.desde } : {}),
    ...(f.hasta ? { hasta: f.hasta } : {}),
    ...(f.contrato ? { contrato: f.contrato } : {}),
  };
}

export const estadoDeCuentaApi = {
  /**
   * Todo lo que un inquilino debe y pagó, contrato por contrato.
   *
   * Con `filtro`, el back devuelve el documento YA recortado y con los totales
   * recalculados, y dice en `filtro` con qué recorte lo armó. Sin él, entero.
   */
  inquilino(
    tenantRef: string,
    filtro?: FiltrosDelEstadoDeCuenta | null,
  ): Promise<EstadoDeCuenta> {
    return apiClient.get<EstadoDeCuenta>(
      `${BASE}/inquilino/${encodeURIComponent(tenantRef)}${queryDelFiltro(filtro)}`,
    );
  },

  /** Lo mismo del lado del propietario: lo girado y lo que se le debe girar. */
  propietario(
    propietarioId: string,
    filtro?: FiltrosDelEstadoDeCuenta | null,
  ): Promise<EstadoDeCuenta> {
    return apiClient.get<EstadoDeCuenta>(
      `${BASE}/propietario/${encodeURIComponent(propietarioId)}${queryDelFiltro(filtro)}`,
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
    filtro?: FiltrosDelEstadoDeCuenta | null,
  ): Promise<EnvioDelEnlace> {
    const camino = canal === 'CORREO' ? 'correo' : 'whatsapp';
    return apiClient.post<EnvioDelEnlace>(
      `${BASE}/${tipo}/${encodeURIComponent(id)}/compartir/${camino}`,
      cuerpoDelFiltro(filtro),
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
    filtro?: FiltrosDelEstadoDeCuenta | null,
  ): Promise<EnlaceCompartido> {
    return apiClient.post<EnlaceCompartido>(
      `${BASE}/${tipo}/${encodeURIComponent(id)}/compartir`,
      cuerpoDelFiltro(filtro),
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
  /**
   * Qué muestra ESTE enlace: el recorte con el que se compartió, o `null` si
   * entrega el documento entero. Revocar el que sobra sólo se puede decidir
   * sabiendo cuál entrega qué.
   */
  filtro?: FiltrosDelEstadoDeCuenta | null;
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
