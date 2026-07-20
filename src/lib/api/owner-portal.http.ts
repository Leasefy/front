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

/** GET tipado contra el agent, scoped al propietario. `null` = no-disponible. */
export async function ownerGet<T>(agencyId: string | null, path: string): Promise<T | null> {
  const base = ownerBase(agencyId);
  if (!base) return null;
  try {
    const res = await globalThis.fetch(`${base}${path}`, { headers: agentAuthHeaders() });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

/** GET de un binario (PDF) contra el agent. `null` = no-disponible. */
export async function ownerGetBlob(agencyId: string | null, path: string): Promise<Blob | null> {
  const base = ownerBase(agencyId);
  if (!base) return null;
  try {
    const res = await globalThis.fetch(`${base}${path}`, { headers: agentAuthHeaders() });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
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
