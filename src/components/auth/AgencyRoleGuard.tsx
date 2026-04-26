'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAgencyAccess } from '@/lib/auth/useAgencyAccess';

interface AgencyRoleGuardProps {
  /**
   * - `managers` → solo ADMIN y AGENTE pasan. Contador/Viewer son redirigidos.
   * - `members`  → cualquier miembro de agencia (ADMIN, AGENTE, CONTADOR, VIEWER) pasa.
   */
  allowed: 'managers' | 'members';
  /** Ruta a la que redirigir si el usuario no cumple. */
  fallbackPath?: string;
  children: ReactNode;
}

/**
 * Gate de acceso por rol de agencia. Úselo para páginas donde el backend todavía
 * no expone el módulo correspondiente en `effectivePermissions` (ej. 'contratos').
 *
 * Cuando el backend agregue el módulo, migrá a `<PageGuard module="..." />` que
 * ya existe en `src/components/auth/PageGuard.tsx`.
 */
export function AgencyRoleGuard({
  allowed,
  fallbackPath = '/panel/inmobiliaria',
  children,
}: AgencyRoleGuardProps) {
  const router = useRouter();
  const { isManager, isMember, isLoading, isOutsideAgencyLayout } = useAgencyAccess();

  // Si estamos fuera del layout inmobiliaria el guard se desactiva —
  // la autenticación de esas rutas es responsabilidad del layout que las envuelve.
  if (isOutsideAgencyLayout) return <>{children}</>;

  const hasAccess = allowed === 'managers' ? isManager : isMember;

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      router.replace(fallbackPath);
    }
  }, [isLoading, hasAccess, router, fallbackPath]);

  if (isLoading || !hasAccess) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
