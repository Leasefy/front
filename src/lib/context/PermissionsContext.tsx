'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { apiClient } from '@/lib/api/client';
import type { MemberPermissionsResponse } from '@/lib/api/inmobiliaria.service';

// ============================================================================
// Context
// ============================================================================

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

// ============================================================================
// Provider
// ============================================================================

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<MemberPermissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MemberPermissionsResponse>(
        '/inmobiliaria/agency/my-permissions'
      );
      setPermissions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching permissions';
      console.error('[PermissionsContext]', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canAccess = useCallback(
    (module: string, action: string): boolean => {
      if (!permissions || isLoading) return false;
      if (permissions.isAdmin) return true;
      const effectivePerms = permissions.effectivePermissions;
      if (!effectivePerms || effectivePerms === 'FULL_ACCESS') return true;
      const modulePerms = (effectivePerms as Record<string, string[]>)[module];
      if (!modulePerms) return false;
      return modulePerms.includes(action);
    },
    [permissions, isLoading],
  );

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        isLoading,
        error,
        canAccess,
        isAdmin: permissions?.isAdmin ?? false,
        agencyRole: permissions?.role ?? null,
        refetch: fetchPermissions,
      }}
    >
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
