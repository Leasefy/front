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
import { ownerFinanzasApi } from '@/lib/api/owner-finanzas.service';
import type { OwnerPerfil } from '@/lib/api/owner-portal.types';
import type {
  FinanzasPortafolio,
  FinanzasInmueble,
  FinanzasInmuebleDetalle,
  FinanzasPagos,
  FinanzasProyeccion,
  FinanzasRecaudoAnual,
} from '@/lib/api/owner-finanzas.types';

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

export interface UseOwnerFinanzasResult {
  portafolio: FinanzasPortafolio | null;
  inmuebles: FinanzasInmueble[];
  proyeccion: FinanzasProyeccion | null;
  recaudoAnual: FinanzasRecaudoAnual | null;
  isLoading: boolean;
  /** true = finanzas no disponibles (flag-OFF / owner-JWT no cableado) → "Próximamente". */
  unavailable: boolean;
  agencyId: string | null;
}

/**
 * Carga el consolidado de "Mi plata" (F3): portafolio + inmuebles + proyección + recaudo anual del
 * año en curso, en paralelo. `unavailable` (portafolio === null tras cargar) gobierna el empty-state.
 */
export function useOwnerFinanzas(): UseOwnerFinanzasResult {
  const agencyId = useOwnerAgencyId();
  const [portafolio, setPortafolio] = useState<FinanzasPortafolio | null>(null);
  const [inmuebles, setInmuebles] = useState<FinanzasInmueble[]>([]);
  const [proyeccion, setProyeccion] = useState<FinanzasProyeccion | null>(null);
  const [recaudoAnual, setRecaudoAnual] = useState<FinanzasRecaudoAnual | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!agencyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const year = new Date().getFullYear();
    Promise.all([
      ownerFinanzasApi.getPortafolio(agencyId),
      ownerFinanzasApi.getInmuebles(agencyId),
      ownerFinanzasApi.getProyeccion(agencyId),
      ownerFinanzasApi.getRecaudoAnual(agencyId, year),
    ]).then(([p, inm, proy, anual]) => {
      if (!alive) return;
      setPortafolio(p);
      setInmuebles(inm);
      setProyeccion(proy);
      setRecaudoAnual(anual);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId]);

  const unavailable = !agencyId || (!isLoading && portafolio === null);
  return { portafolio, inmuebles, proyeccion, recaudoAnual, isLoading, unavailable, agencyId };
}

export interface UseOwnerInmuebleResult {
  detalle: FinanzasInmuebleDetalle | null;
  pagos: FinanzasPagos | null;
  isLoading: boolean;
  unavailable: boolean;
  agencyId: string | null;
}

/**
 * Detalle de un inmueble (F3): detalle + historial de pagos (primera página). `unavailable`
 * (detalle === null tras cargar) gobierna el empty-state "Próximamente".
 */
export function useOwnerInmueble(propertyRef: string): UseOwnerInmuebleResult {
  const agencyId = useOwnerAgencyId();
  const [detalle, setDetalle] = useState<FinanzasInmuebleDetalle | null>(null);
  const [pagos, setPagos] = useState<FinanzasPagos | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!agencyId || !propertyRef) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    Promise.all([
      ownerFinanzasApi.getInmueble(agencyId, propertyRef),
      ownerFinanzasApi.getPagos(agencyId, propertyRef, { limit: 50, offset: 0 }),
    ]).then(([d, p]) => {
      if (!alive) return;
      setDetalle(d);
      setPagos(p);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId, propertyRef]);

  const unavailable = !agencyId || (!isLoading && detalle === null);
  return { detalle, pagos, isLoading, unavailable, agencyId };
}
