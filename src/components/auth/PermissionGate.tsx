'use client';

import { type ReactNode } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Lock } from '@phosphor-icons/react';

interface PermissionGateProps {
  /** Module to check (e.g. 'cobros', 'reportes', 'properties') */
  module: string;
  /** Action to check (e.g. 'view', 'create', 'edit', 'delete', 'export') */
  action: string;
  /** Content to render when the user has access */
  children: ReactNode;
  /** Custom fallback when access is denied. If omitted, shows a default "no access" message. Pass null to render nothing. */
  fallback?: ReactNode | null;
}

/**
 * Conditionally renders children based on the current user's permissions.
 * Uses the usePermissions hook which fetches from GET /users/me/permissions.
 *
 * Usage:
 * ```tsx
 * <PermissionGate module="cobros" action="edit">
 *   <EditCobroForm />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ module, action, children, fallback }: PermissionGateProps) {
  const { canAccess, isLoading } = usePermissions();

  // While loading, render nothing to avoid flash
  if (isLoading) return null;

  if (canAccess(module, action)) {
    return <>{children}</>;
  }

  // Custom fallback (null = render nothing)
  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  // Default "no access" message
  return (
    <div className="flex flex-col items-center justify-center rounded-xl px-6 py-14 text-center bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <Lock weight="duotone" className="h-5 w-5 text-neutral-400" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
        Acceso restringido
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
        No tienes permiso para acceder a esta seccion. Contacta al administrador de tu agencia.
      </p>
    </div>
  );
}
