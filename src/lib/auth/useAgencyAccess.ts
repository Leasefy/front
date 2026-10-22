'use client';

import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { isAgencyManager, isAgencyMember } from './agency-roles';

/**
 * Hook para gatear UI por rol de agencia. Devuelve flags booleanos calculados a partir del
 * PermissionsContext.
 *
 * Fuera del layout inmobiliaria (ej. rutas de inquilino) el contexto es null —
 * en ese caso retornamos `isMember: false` y `isManager: false` para que los guards
 * de contratos no se activen accidentalmente en rutas que no son de agencia.
 */
export function useAgencyAccess() {
  const perms = usePermissionsContextSafe();

  if (!perms) {
    return {
      isManager: false,
      isMember: false,
      usaLosMensajes: false,
      isLoading: false,
      isOutsideAgencyLayout: true,
    };
  }

  const { isAdmin, agencyRole, isLoading, canAccess } = perms;

  return {
    isManager: isAgencyManager({ isAdmin, agencyRole }),
    // 21-10-2026: por el permiso «Mensajes» (o por el rol con un back anterior).
    usaLosMensajes: isAdmin || canAccess('mensajes', 'view'),
    isMember: isAgencyMember({ isAdmin, agencyRole }),
    isLoading,
    isOutsideAgencyLayout: false,
  };
}
