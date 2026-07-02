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

interface PermissionsContextValue {
  permissions: MemberPermissionsResponse | null;
  isLoading: boolean;
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
  const { agency } = useAuth();
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
      setIsLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canAccess = useCallback(
    (module: string, action: string): boolean => {
      // DEV-LOCAL-OVERRIDE (2026-06-14, NO COMMIT): abre todos los módulos en
      // localhost para probar el panel de inmobiliaria con una cuenta tenant.
      // Revertir antes de commit. Buscar "DEV-LOCAL-OVERRIDE".
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return true;
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
      error,
      canAccess,
      // DEV-LOCAL-OVERRIDE (2026-06-14, NO COMMIT): isAdmin=true en localhost
      // para que las entradas de nav con gate de rol (pagos/conciliación/tesorería)
      // también se muestren. Revertir antes de commit. "DEV-LOCAL-OVERRIDE".
      isAdmin:
        (typeof window !== 'undefined' && window.location.hostname === 'localhost')
          ? true
          : (permissions?.isAdmin ?? false),
      agencyRole: permissions?.role ?? null,
      refetch: fetchPermissions,
    }),
    [permissions, isLoading, error, canAccess, fetchPermissions],
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
