'use client';

import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';

import { usePuedeEscribir, type PuedeEscribir } from './use-puede-escribir';

/**
 * 🔴 ROLES AUXILIARES (Nico, 20-10-2026): el AUXILIAR CONTABLE registra
 * asientos, egresos y facturas de proveedor, y nada más (espejo de
 * `@TambienElAuxiliarContable` del back). En archivo aparte de
 * `use-puede-escribir.ts` a propósito: las pruebas que simulan ese módulo
 * siguen funcionando, porque esto se apoya en su `usePuedeEscribir`.
 */
export function usePuedeRegistrar(): PuedeEscribir {
  const escritura = usePuedeEscribir();
  const permisos = usePermissionsContextSafe();
  if (escritura.puede) return escritura;
  if (permisos && !permisos.isLoading && permisos.agencyRole === AGENCY_ROLES.AUXILIAR_CONTABLE) {
    return { puede: true, motivo: null, usuarioId: escritura.usuarioId, esAdministrador: false };
  }
  return escritura;
}

/** `true` sólo para el auxiliar contable: ve el libro pero no cierra, no reabre ni reversa. */
export function useSoloRegistraLaContabilidad(): boolean {
  const permisos = usePermissionsContextSafe();
  return Boolean(permisos && !permisos.isLoading && permisos.agencyRole === AGENCY_ROLES.AUXILIAR_CONTABLE);
}
