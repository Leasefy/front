'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface PageGuardProps {
  /** Module key from effectivePermissions (e.g. "dispersiones", "analytics") */
  module?: string;
  /** Required action — defaults to "view" */
  action?: string;
  /** When true, only isAdmin passes regardless of module permissions */
  adminOnly?: boolean;
  children: ReactNode;
}

/**
 * Wraps page content and blocks rendering + redirects if the current user
 * does not have the required permission. Works via PermissionsContext
 * (single fetch, shared across the inmobiliaria layout).
 *
 * Usage:
 *   export default function SomePage() {
 *     return <PageGuard module="dispersiones"><PageContent /></PageGuard>;
 *   }
 *   function PageContent() { ...hooks and JSX... }
 *
 * The inner component only mounts when access is confirmed, so its hooks
 * never fire for unauthorized users.
 */
export function PageGuard({ module, action = 'view', adminOnly = false, children }: PageGuardProps) {
  const router = useRouter();
  const { canAccess, isAdmin, isLoading } = usePermissions();

  const hasAccess = isAdmin || (adminOnly ? false : (module ? canAccess(module, action) : true));

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      router.replace('/panel/inmobiliaria');
    }
  }, [isLoading, hasAccess, router]);

  if (isLoading || !hasAccess) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
