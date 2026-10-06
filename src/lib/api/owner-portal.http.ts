/**
 * Portal del Propietario — capa HTTP de bajo nivel compartida por los servicios owner-facing
 * (v8-02). Centraliza el transporte **browser → agent DIRECTO** (`NEXT_PUBLIC_AGENT_URL`) con
 * `agentFetch` y el **degrade honesto**: cualquier fallo (agent URL/agencyId ausente,
 * !res.ok incl. 401/403/404 por flag-OFF, red/CORS/parse) → `null` = no-disponible → "Próximamente".
 *
 * ⚠️ El bearer de hoy es el token de Supabase; el portal exige el owner-JWT HS256 del monolito
 * (con `agencyId`). Hasta que Victor lo cablee, `agencyId` es null para un landlord → todo degrada.
 * (Ver `useOwnerAgencyId` y HANDOFF-VICTOR.)
 *
 * Errores (02-10-2026, «arréglalos con el traductor»): un fallo viaja como un `ApiError` con su
 * status y el cuerpo entero en `detalle` (`falloDelMicro`), para que el traductor
 * (`mensajeParaLaPersona`, `<FalloDeCarga>`) diga qué pasó con la regla de oro:
 *  · «conexión» SÓLO cuando el `fetch` no salió (status 0);
 *  · un 4xx dice qué está mal (el `message` del sobre, sus `campos`);
 *  · un 5xx —y un 2xx cuyo cuerpo no se puede leer— dice «de nuestro lado», con la referencia.
 * Antes el cuerpo del error se tiraba («El portal respondió 500.») y, en `ownerPost`, un cuerpo
 * que no era JSON (un HTML de un proxy, también en un 2xx) se reportaba como red caída.
 */
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { agentFetch } from './agent-fetch';
import { ApiError } from './client';
import { falloDelMicro } from './fallo-del-micro';

function ownerBase(agencyId: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base || !agencyId) return null;
  return `${base}/api/portal/${agencyId}/propietario`;
}

/**
 * El `code` de una respuesta 2xx cuyo cuerpo no se pudo leer (un HTML, un JSON cortado). Hubo
 * respuesta, así que no es la conexión: es un fallo nuestro (va como un 500) y el `code` le sirve
 * a soporte de referencia. El status que llegó de verdad queda en `detalle.statusRecibido`.
 */
export const CODIGO_RESPUESTA_ILEGIBLE = 'RESPUESTA_ILEGIBLE';

/** El `fetch` no salió (sin red, CORS, DNS): el ÚNICO caso que habla de la conexión. */
function falloSinRespuesta(): ApiError {
  return new ApiError(0, '');
}

/** Contestó, pero el cuerpo no se pudo leer: «de nuestro lado», nunca status 0. */
function respuestaIlegible(statusRecibido: number): ApiError {
  return new ApiError(500, '', CODIGO_RESPUESTA_ILEGIBLE, {
    statusCode: 500,
    code: CODIGO_RESPUESTA_ILEGIBLE,
    statusRecibido,
  });
}

/** Lo que se le dice a la persona de una lectura del portal que falló (por el traductor). */
const OPCIONES_DEL_MENSAJE = {
  accion: 'traer esta información',
  porDefecto: 'No pudimos traer esta información del portal. Prueba de nuevo en un momento.',
};

/**
 * «El portal no está habilitado» NO es lo mismo que «falló» (O1, auditoría del 13-09).
 *
 * - `no-habilitado`: falta la URL del micro o el `agencyId`, o el micro responde 401 (hoy el
 *   bearer de Supabase no es el owner-JWT que exige) o 404 (flag apagado / ruta que no existe).
 *   Ése sí es «Próximamente».
 * - `fallo`: 403, 5xx, red caída o una respuesta que no se puede leer. Antes caía en el mismo
 *   `null` y el propietario veía «Próximamente» sobre una caída, sin forma de reintentar.
 *   `error` es el fallo entero (status, `code`, cuerpo en `detalle`) para pintarlo con el
 *   traductor o con `<FalloDeCarga>`; `status` es el suyo y `mensaje`, la frase del traductor.
 */
export type ResultadoDelPortal<T> =
  | { estado: 'ok'; data: T }
  | { estado: 'no-habilitado' }
  | { estado: 'fallo'; status: number; mensaje: string; error: ApiError };

function falloDelPortal(error: ApiError): { estado: 'fallo'; status: number; mensaje: string; error: ApiError } {
  return {
    estado: 'fallo',
    status: error.status,
    mensaje: mensajeParaLaPersona(error, OPCIONES_DEL_MENSAJE),
    error,
  };
}

const STATUS_DE_NO_HABILITADO = new Set([401, 404]);

async function pedirAlPortal<T>(
  agencyId: string | null,
  path: string,
  leer: (res: Response) => Promise<T | null>,
): Promise<ResultadoDelPortal<T>> {
  const base = ownerBase(agencyId);
  if (!base) return { estado: 'no-habilitado' };
  let res: Response;
  try {
    res = await agentFetch(`${base}${path}`);
  } catch (err) {
    // Con el micro caído y el back sano, `agentFetch` ya lo dice como el 503
    // del «asistente» (ARREGLOS-4): esa frase, no «la conexión».
    return falloDelPortal(err instanceof ApiError ? err : falloSinRespuesta());
  }
  if (STATUS_DE_NO_HABILITADO.has(res.status)) return { estado: 'no-habilitado' };
  // El status y el cuerpo entero (`code`, `message`, `campos`, `referencia`).
  if (!res.ok) return falloDelPortal(await falloDelMicro(res));
  try {
    const data = await leer(res);
    return data === null ? { estado: 'no-habilitado' } : { estado: 'ok', data };
  } catch {
    return falloDelPortal(respuestaIlegible(res.status));
  }
}

/** GET tipado contra el agent con el estado: distingue «no habilitado» de «falló». */
export function ownerGetConEstado<T>(
  agencyId: string | null,
  path: string,
): Promise<ResultadoDelPortal<T>> {
  return pedirAlPortal<T>(agencyId, path, async (res) => {
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  });
}

/** GET de un binario (PDF) contra el agent, con el estado. */
export function ownerGetBlobConEstado(
  agencyId: string | null,
  path: string,
): Promise<ResultadoDelPortal<Blob>> {
  return pedirAlPortal<Blob>(agencyId, path, (res) => res.blob());
}

/** GET tipado contra el agent, scoped al propietario. `null` = no-disponible (o falló). */
export async function ownerGet<T>(agencyId: string | null, path: string): Promise<T | null> {
  const r = await ownerGetConEstado<T>(agencyId, path);
  return r.estado === 'ok' ? r.data : null;
}

/** GET de un binario (PDF) contra el agent. `null` = no-disponible (o falló). */
export async function ownerGetBlob(agencyId: string | null, path: string): Promise<Blob | null> {
  const r = await ownerGetBlobConEstado(agencyId, path);
  return r.estado === 'ok' ? r.data : null;
}

/**
 * Resultado de una acción (POST). A diferencia de los GET (que degradan a null), una acción
 * distingue éxito de error para poder mostrarle al propietario el motivo real (p.ej. WYSIWYS
 * `terms_changed`, o CAS `conflict` si otro click ganó). `status: 0` = agent no cableado / red caída.
 */
export interface OwnerActionResult<T> {
  ok: boolean;
  /** El status del fallo (el de `fallo`); 0 = portal sin cablear o el `fetch` no salió. */
  status: number;
  data: T | null;
  /**
   * El `error` del cuerpo del micro (un código: `terms_changed`, `conflict`), o
   * 'unavailable'/'network'/`RESPUESTA_ILEGIBLE`. Sirve para DECIDIR; nunca se muestra.
   */
  error: string | null;
  /**
   * 02-10-2026 · El fallo entero, para el traductor: un `ApiError` con status, `code` y el cuerpo
   * en `detalle` (status 0 sólo si el `fetch` no salió). Falta si salió bien o si el portal no
   * está cableado (`error: 'unavailable'`).
   */
  fallo?: ApiError;
}

/** POST tipado contra el agent, con semántica de acción (no degrade silencioso). */
export async function ownerPost<T>(
  agencyId: string | null,
  path: string,
  body: unknown,
): Promise<OwnerActionResult<T>> {
  const base = ownerBase(agencyId);
  if (!base) return { ok: false, status: 0, data: null, error: 'unavailable' };
  let res: Response;
  try {
    res = await agentFetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Con el micro caído y el back sano, `agentFetch` ya lo dice como el 503
    // del «asistente» (ARREGLOS-4).
    if (err instanceof ApiError) return { ok: false, status: err.status, data: null, error: 'unavailable', fallo: err };
    // Sin respuesta: lo único que es «la conexión».
    return { ok: false, status: 0, data: null, error: 'network', fallo: falloSinRespuesta() };
  }
  let cuerpo: unknown = null;
  let legible = true;
  try {
    const text = await res.text();
    cuerpo = text ? JSON.parse(text) : null;
  } catch {
    legible = false;
  }
  if (!res.ok) {
    // El mismo `ApiError` que el resto de las llamadas al micro, con el cuerpo ya leído.
    const fallo = await falloDelMicro({
      status: res.status,
      json: () => (legible ? Promise.resolve(cuerpo) : Promise.reject(new SyntaxError('cuerpo ilegible'))),
    });
    const codigo =
      cuerpo && typeof cuerpo === 'object' && typeof (cuerpo as { error?: unknown }).error === 'string'
        ? (cuerpo as { error: string }).error
        : `Error ${res.status}`;
    return { ok: false, status: res.status, data: null, error: codigo, fallo };
  }
  if (!legible) {
    // Un 2xx que no se puede leer NO es la red: contestó. Es nuestro.
    const fallo = respuestaIlegible(res.status);
    return { ok: false, status: fallo.status, data: null, error: CODIGO_RESPUESTA_ILEGIBLE, fallo };
  }
  return { ok: true, status: res.status, data: cuerpo as T, error: null };
}
