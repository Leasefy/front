/**
 * Portal del Propietario — capa HTTP de bajo nivel compartida por los servicios owner-facing
 * (v8-02). Centraliza el transporte **browser → agent DIRECTO** (`NEXT_PUBLIC_AGENT_URL`) con
 * `agentAuthHeaders()` y el **degrade honesto**: cualquier fallo (agent URL/agencyId ausente,
 * !res.ok incl. 401/403/404 por flag-OFF, red/CORS/parse) → `null` = no-disponible → "Próximamente".
 *
 * ⚠️ El bearer de hoy es el token de Supabase; el portal exige el owner-JWT HS256 del monolito
 * (con `agencyId`). Hasta que Victor lo cablee, `agencyId` es null para un landlord → todo degrada.
 * (Ver `useOwnerAgencyId` y HANDOFF-VICTOR.)
 */
import { agentAuthHeaders } from './agent-auth';

function ownerBase(agencyId: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base || !agencyId) return null;
  return `${base}/api/portal/${agencyId}/propietario`;
}

/**
 * «El portal no está habilitado» NO es lo mismo que «falló» (O1, auditoría del 13-09).
 *
 * - `no-habilitado`: falta la URL del micro o el `agencyId`, o el micro responde 401 (hoy el
 *   bearer de Supabase no es el owner-JWT que exige) o 404 (flag apagado / ruta que no existe).
 *   Ése sí es «Próximamente».
 * - `fallo`: 403, 5xx, red caída o una respuesta que no se puede leer. Antes caía en el mismo
 *   `null` y el propietario veía «Próximamente» sobre una caída, sin forma de reintentar.
 */
export type ResultadoDelPortal<T> =
  | { estado: 'ok'; data: T }
  | { estado: 'no-habilitado' }
  | { estado: 'fallo'; status: number; mensaje: string };

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
    res = await globalThis.fetch(`${base}${path}`, { headers: agentAuthHeaders() });
  } catch {
    return { estado: 'fallo', status: 0, mensaje: 'No hubo conexión con el portal.' };
  }
  if (STATUS_DE_NO_HABILITADO.has(res.status)) return { estado: 'no-habilitado' };
  if (!res.ok) {
    return { estado: 'fallo', status: res.status, mensaje: `El portal respondió ${res.status}.` };
  }
  try {
    const data = await leer(res);
    return data === null ? { estado: 'no-habilitado' } : { estado: 'ok', data };
  } catch {
    return { estado: 'fallo', status: res.status, mensaje: 'La respuesta del portal no se pudo leer.' };
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
  status: number;
  data: T | null;
  /** Mensaje de error del back (o 'unavailable'/'network') — para traducir a copy de usuario. */
  error: string | null;
}

/** POST tipado contra el agent, con semántica de acción (no degrade silencioso). */
export async function ownerPost<T>(
  agencyId: string | null,
  path: string,
  body: unknown,
): Promise<OwnerActionResult<T>> {
  const base = ownerBase(agencyId);
  if (!base) return { ok: false, status: 0, data: null, error: 'unavailable' };
  try {
    const res = await globalThis.fetch(`${base}${path}`, {
      method: 'POST',
      headers: agentAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const errMsg =
        parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : `Error ${res.status}`;
      return { ok: false, status: res.status, data: null, error: errMsg };
    }
    return { ok: true, status: res.status, data: parsed as T, error: null };
  } catch {
    return { ok: false, status: 0, data: null, error: 'network' };
  }
}
