'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { apiClient, getAccessToken } from '@/lib/api/client';
import type { MemberPermissionsResponse } from '@/lib/api/inmobiliaria.service';
import { useAuth } from '@/lib/auth';
import {
  isAgentModule,
  resolveAgentModuleAccess,
  type AgentModulePermissions,
} from '@/lib/auth/agent-module-access';

type AgentPermissions = AgentModulePermissions;

/**
 * En qué punto está la resolución del acceso a los módulos del AGENTE
 * (cobranza, cotizador). Ver el comentario largo donde se calcula.
 */
export type AgentAccessStatus = 'resolviendo' | 'resuelto' | 'sin-verificar';

interface PermissionsContextValue {
  permissions: MemberPermissionsResponse | null;
  isLoading: boolean;
  /**
   * Tri-estado. Mientras sea `resolviendo`, un `canAccess(...)` en false
   * significa «todavía no sé», NO «no tenés permiso»: hay que esperar, no
   * negar. `sin-verificar` es «el agente no contestó»: tampoco se niega, se
   * dice que no pudimos verificar y se ofrece reintentar.
   */
  agentAccessStatus: AgentAccessStatus;
  /** True cuando el agente CONTESTÓ. Compat con feat/recorrido-inmobiliaria. */
  agentPermsResolved: boolean;
  error: string | null;
  canAccess: (module: string, action: string) => boolean;
  isAdmin: boolean;
  agencyRole: string | null;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

async function fetchAgentPermissions(agencyId: string): Promise<AgentPermissions | null> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!agentUrl) return null;
  const token = getAccessToken();
  // NOTE — issue the fetch even when no token is in memory yet. In production
  // without a session the backend returns 401 and `!res.ok` keeps us at
  // `agentPerms = null` (same as the previous early-return). In test contexts
  // the network mock intercepts before reaching the backend, so route.fulfill
  // can supply the canonical full-access response without the test needing to
  // patch the in-memory `_accessToken` singleton from src/lib/api/client.ts.
  // Net: zero behavior change in production, route.fulfill becomes reachable.
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const res = await fetch(`${agentUrl}/api/agency/${agencyId}/my-permissions`, {
    headers,
  });
  if (!res.ok) return null;
  return (await res.json()) as AgentPermissions;
}

/**
 * Auth-context shape persisted by the inmobiliaria login flow. When a real
 * Supabase session is not present (tests, post-logout, transient), the auth
 * provider's `agency` field is null but the localStorage entry still encodes
 * the agency identifier — read it here so the permissions fetch can fire and
 * the layout gate releases. Mirrors the localStorage-fallback pattern used in
 * ProtectedRoute.tsx (line 49-60).
 */
function readAgencyIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('arriendo-facil-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { agencyId?: string; agency?: { id?: string } };
    return parsed.agencyId ?? parsed.agency?.id ?? null;
  } catch {
    return null;
  }
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { agency, agencyMembershipChecked } = useAuth();
  // Prefer the live auth-context agency; fall back to localStorage so the
  // first paint after a hard refresh (and the synthetic Playwright test seed)
  // still triggers fetchAgentPermissions. Without this fallback, the cobranza
  // layout's `canAccess('cobranza','view')` permanently returns false when
  // the Supabase session has not hydrated yet (auth-context is loading).
  const agencyId = agency?.id ?? readAgencyIdFromStorage();
  const [permissions, setPermissions] = useState<MemberPermissionsResponse | null>(null);
  const [agentPerms, setAgentPerms] = useState<AgentPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Para QUÉ agencia terminó el último fetch. `undefined` = todavía ninguno.
   *
   * Sin esto hay una ventana en la que `isLoading` ya es false (del ciclo
   * anterior, cuando `agencyId` era null) mientras el nuevo `agencyId` recién
   * llegó y su fetch aún no arrancó. En esa ventana `agentPerms` sigue en null
   * y los módulos del agente —que fallan CERRADO— se leen como «denegado».
   */
  const [resolvedFor, setResolvedFor] = useState<string | null | undefined>(
    undefined,
  );

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Decouple the two fetches: a monolith outage must NOT reject the whole
      // Promise.all and null out agent permissions (cobranza/cotizador access),
      // and an agent-service outage must not block the legacy modules. Each
      // call fails independently to null.
      const [legacy, agent] = await Promise.all([
        apiClient
          .get<MemberPermissionsResponse>('/inmobiliaria/agency/my-permissions')
          .catch(() => null),
        agencyId ? fetchAgentPermissions(agencyId).catch(() => null) : Promise.resolve(null),
      ]);
      setPermissions(legacy);
      setAgentPerms(agent);
      if (!legacy) setError('No se pudieron cargar los permisos de la agencia');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching permissions';
      console.error('[PermissionsContext]', message);
      setError(message);
    } finally {
      setResolvedFor(agencyId);
      setIsLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * `canAccess('cobranza')` en false tiene TRES causas y una pantalla no puede
   * tratarlas igual:
   *
   *   · todavía se está averiguando        → `resolviendo`   (esperar)
   *   · el agente no contestó (caído/401)  → `sin-verificar` (decir eso, ofrecer reintentar)
   *   · el agente contestó que no          → `resuelto`      (negar de verdad)
   *
   * El bug era colapsar los tres en «no tienes acceso». Dos matices:
   *
   * 1. Con `agencyId` null el fetch al agente NI SE DISPARA. La sonda de
   *    membresía es fire-and-forget —`auth.isLoading` se libera ANTES de que
   *    termine— así que hay un tramo con sesión válida y agencia desconocida.
   *    `agencyMembershipChecked` cierra el caso legítimo: sonda asentada y sin
   *    agencia = no es usuario de agencia, negar está bien.
   * 2. `resolvedFor === agencyId` cierra la ventana en la que `isLoading` ya
   *    bajó (del ciclo anterior) pero el fetch del `agencyId` nuevo no arrancó.
   *
   * Ver `resolveAgentModuleAccess` en agent-module-access.ts para las posturas
   * por módulo (cobranza y cotizador fallan CERRADO).
   */
  const cicloAlDia = !isLoading && resolvedFor === agencyId;
  const sinAgenciaConfirmado = agencyId === null && agencyMembershipChecked;

  const agentAccessStatus: AgentAccessStatus = !cicloAlDia
    ? 'resolviendo'
    : agentPerms !== null || sinAgenciaConfirmado
      ? 'resuelto'
      : agencyId === null
        ? 'resolviendo' // la sonda todavía no asentó: no sabemos, no negamos
        : 'sin-verificar'; // había a quién preguntar y el agente no contestó

  /**
   * Compat con `feat/recorrido-inmobiliaria`, que ya expone este flag con la
   * misma semántica: el agente CONTESTÓ. Sumado al guard de ciclo al día.
   */
  const agentPermsResolved = cicloAlDia && agentPerms !== null;

  const canAccess = useCallback(
    (module: string, action: string): boolean => {
      if (isLoading) return false;
      if (isAgentModule(module)) {
        // Posture per module lives in agent-module-access.ts:
        // cobranza/cotizador fail CLOSED; estudio/matching treat an ABSENT
        // payload key as ALLOWED (mergeable in any order with the agent PR).
        return resolveAgentModuleAccess(agentPerms, module, action);
      }
      if (!permissions) return false;
      if (permissions.isAdmin) return true;
      const effectivePerms = permissions.effectivePermissions;
      // Fail CLOSED: only the explicit sentinel grants full access. A missing,
      // null, or malformed permissions payload must deny non-admin users
      // instead of accidentally granting every module.
      if (effectivePerms === 'FULL_ACCESS') return true;
      if (!effectivePerms || typeof effectivePerms !== 'object') return false;
      const modulePerms = (effectivePerms as Record<string, string[]>)[module];
      if (!modulePerms) return false;
      return modulePerms.includes(action);
    },
    [permissions, agentPerms, isLoading],
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      isLoading,
      agentAccessStatus,
      agentPermsResolved,
      error,
      canAccess,
      isAdmin: permissions?.isAdmin ?? false,
      agencyRole: permissions?.role ?? null,
      refetch: fetchPermissions,
    }),
    [
      permissions,
      isLoading,
      agentAccessStatus,
      agentPermsResolved,
      error,
      canAccess,
      fetchPermissions,
    ],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/** Throws if used outside PermissionsProvider — for pages inside the inmobiliaria layout. */
export function usePermissionsContext(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within PermissionsProvider');
  }
  return context;
}

/** Returns null if used outside PermissionsProvider — for shared components used across layouts. */
export function usePermissionsContextSafe(): PermissionsContextValue | null {
  return useContext(PermissionsContext);
}
