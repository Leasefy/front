'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { estaSinSenal, useSinSenal } from '@/lib/hooks/use-sin-senal';
import type { AgencyRole } from '@/lib/auth/agency-roles';

interface PageGuardProps {
  /** Module key from effectivePermissions (e.g. "dispersiones", "analytics") */
  module?: string;
  /** Alternativas a `module`: alcanza con UNO (la agenda: operaciones o pipeline). */
  modulos?: readonly string[];
  /** Required action — defaults to "view" */
  action?: string;
  /** When true, only isAdmin passes regardless of module permissions */
  adminOnly?: boolean;
  /**
   * Agency-role gate, mirroring the nav `roles` filter in the inmobiliaria
   * layout: a non-admin user must have an agencyRole that is in this list.
   * isAdmin always bypasses (Supabase service-role / super-admin users).
   * Combines with `module` (both must pass when both are provided).
   */
  roles?: AgencyRole[];
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
export function PageGuard({ module, modulos, action = 'view', adminOnly = false, roles, children }: PageGuardProps) {
  const router = useRouter();
  const { canAccess, isAdmin, isLoading, agencyRole } = usePermissions();
  const sinSenal = useSinSenal();

  const moduleAllowed =
    modulos && modulos.length > 0
      ? modulos.some((m) => canAccess(m, action))
      : module
        ? canAccess(module, action)
        : true;
  const roleAllowed =
    !roles || roles.length === 0
      ? true
      : agencyRole !== null && (roles as string[]).includes(agencyRole);
  const hasAccess = isAdmin || (adminOnly ? false : moduleAllowed && roleAllowed);

  /*
   * 🔴 Sin señal NO se expulsa a nadie.
   *
   * Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
   * que hace el inventario debería poder agregar todo sin señal». Los permisos
   * salen de `GET /inmobiliaria/agency/my-permissions`; sin red esa llamada no
   * vuelve, `permissions` queda en null y `canAccess` devuelve false —que acá
   * significaba «no tienes permiso» y mandaba a la persona al inicio del panel
   * justo cuando abría la ficha dentro del apartamento.
   *
   * Es el mismo criterio que ya tiene ProtectedRoute con un perfil degradado:
   * no se pudo PREGUNTAR no es lo mismo que la respuesta fue NO. Y no afloja
   * ninguna frontera real: sin red no hay dato del back que mostrar, lo único
   * que se ve es la copia que ESTE dispositivo guardó con sesión válida, y
   * cualquier llamada que salga sigue llevando el JWT y la decide el back.
   *
   * `navigator.onLine === false` es la única señal que se cree (ver
   * `use-sin-senal.ts`): un `true` no prueba nada, un `false` sí.
   */
  const noSePudoPreguntar = sinSenal && !hasAccess;

  useEffect(() => {
    // Se pregunta al navegador EN ESTE INSTANTE y no al estado: el estado se
    // llena en un efecto, y en el primer montaje —que es cuando se decide
    // redirigir— todavía vale `false`. Esa carrera expulsaba igual.
    if (!isLoading && !hasAccess && !estaSinSenal()) {
      router.replace('/panel/inmobiliaria');
    }
  }, [isLoading, hasAccess, sinSenal, router]);

  if (noSePudoPreguntar) {
    return <>{children}</>;
  }

  if (isLoading || !hasAccess) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-[#1A40FF]/30 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
