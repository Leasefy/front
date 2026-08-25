/**
 * Portal del Propietario — capa de servicio del front (v8-01, frontend-first).
 *
 * Transporte: **browser → agent-microservice DIRECTO** (`NEXT_PUBLIC_AGENT_URL`), NO el BFF del
 * monolito. El back del portal provisiona CORS específicamente para `/api/portal/*`
 * (HANDOFF-VICTOR arrastrado #3), y los endpoints owner-facing viven en el agent, no en el
 * monolito. Se manda `Authorization: Bearer` vía `agentAuthHeaders()` (mismo patrón que
 * `agentSearch`/cotizador), sin cookies (`credentials` omitido → no rompe el allowlist CORS).
 *
 * ⚠️ Dependencias de ENCENDIDO (Victor — hoy hacen que todo degrade honesto):
 *   1. Flag `PORTAL_PROPIETARIO_ENABLED` OFF → el agent responde 404 a todo `/api/portal/*`.
 *   2. El bearer de hoy es el token de Supabase; el portal exige el **owner-JWT HS256 del
 *      monolito** (con `agencyId` + `sub` + `email`). Hasta que el monolito lo emita, la
 *      resolución de `agencyId` para un landlord no existe en el front (ver `useOwnerAgencyId`).
 *   3. El dominio del front debe entrar en `CORS_ALLOWED_ORIGINS` del agent.
 *
 * Idiom de degrade honesto: cualquier fallo (agent URL ausente, `agencyId` ausente, !res.ok
 * — incl. 401/403/404 por flag-OFF —, red caída/CORS, parse) → `null` = **no-disponible**.
 * La UI traduce `null` a "Próximamente" (DESIGN.md §11). NUNCA se fabrica data.
 */
import { ownerGet } from './owner-portal.http';
import type { OwnerPerfil } from './owner-portal.types';

export const ownerPortalApi = {
  /**
   * GET /perfil — perfil mínimo del propietario autenticado (F1).
   * `null` mientras el portal esté flag-OFF o el owner-JWT no esté cableado.
   */
  getPerfil: (agencyId: string | null): Promise<OwnerPerfil | null> =>
    ownerGet<OwnerPerfil>(agencyId, '/perfil'),
};
