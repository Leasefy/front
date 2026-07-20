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
