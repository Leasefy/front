/**
 * Portal del Propietario — hooks del front (v8-01, frontend-first).
 *
 * Establecen el patrón que consumen las olas v8-02..v8-05: resolver `agencyId`, llamar al
 * servicio owner-portal y degradar honesto a "no-disponible" (→ "Próximamente") mientras el
 * back esté flag-OFF o el owner-JWT no esté cableado.
 */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/use-auth';
import { ownerPortalApi } from '@/lib/api/owner-portal.service';
import type { OwnerPerfil } from '@/lib/api/owner-portal.types';

/**
 * Resuelve el `agencyId` del propietario para las rutas `/api/portal/{agencyId}/propietario/*`.
 *
 * ⚠️ Hoy el `landlord` NO carga `agencyId` en el auth del front — `AuthState.agency` sólo se
 * puebla para roles AGENT/INMOBILIARIA. El owner-JWT HS256 del monolito traerá el `agencyId`
 * cuando Victor cablee el portal; hasta entonces esto devuelve `null` y todo el portal degrada
 * a "Próximamente" de forma honesta (análogo a las Assumptions A1-A4 de v7). Cuando exista la
 * sesión de propietario, este resolver es el único punto a actualizar.
 */
export function useOwnerAgencyId(): string | null {
  const { agency } = useAuth();
  return agency?.id ?? null;
}

export interface UseOwnerPerfilResult {
  perfil: OwnerPerfil | null;
  isLoading: boolean;
  /** true = portal no disponible todavía (flag-OFF / owner-JWT no cableado) → mostrar "Próximamente". */
  unavailable: boolean;
  agencyId: string | null;
}

/** GET /perfil (F1) con degrade honesto. `unavailable` gobierna el empty-state "Próximamente". */
export function useOwnerPerfil(): UseOwnerPerfilResult {
  const agencyId = useOwnerAgencyId();
  const [perfil, setPerfil] = useState<OwnerPerfil | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!agencyId) {
      setPerfil(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    ownerPortalApi.getPerfil(agencyId).then((p) => {
      if (!alive) return;
      setPerfil(p);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId]);

  const unavailable = !agencyId || (!isLoading && perfil === null);
  return { perfil, isLoading, unavailable, agencyId };
}
