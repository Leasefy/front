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
import { ownerSeleccionApi } from '@/lib/api/owner-seleccion.service';
import { ownerSolicitudesApi } from '@/lib/api/owner-solicitudes.service';
import type { OwnerPerfil } from '@/lib/api/owner-portal.types';
import type { EleccionProceso, EleccionComparacion } from '@/lib/api/owner-seleccion.types';
import type { Solicitud, SolicitudDetalle } from '@/lib/api/owner-solicitudes.types';
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

export interface UseOwnerProcesosResult {
  procesos: EleccionProceso[];
  isLoading: boolean;
  unavailable: boolean;
  agencyId: string | null;
}

/**
 * Lista de procesos de elección del propietario (F2). `unavailable` = portal no cableado
 * (sin agencyId) → "Próximamente". Una lista vacía CON agencyId es un estado legítimo
 * ("no tenés procesos de elección"), NO "Próximamente" — lo distingue la página.
 */
export function useOwnerProcesos(): UseOwnerProcesosResult {
  const agencyId = useOwnerAgencyId();
  const [procesos, setProcesos] = useState<EleccionProceso[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!agencyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    ownerSeleccionApi.getProcesos(agencyId).then((p) => {
      if (!alive) return;
      setProcesos(p);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId]);

  return { procesos, isLoading, unavailable: !agencyId, agencyId };
}

export interface UseOwnerComparacionResult {
  comparacion: EleccionComparacion | null;
  isLoading: boolean;
  unavailable: boolean;
  agencyId: string | null;
  /** Fuerza recarga de la comparación (p.ej. tras `terms_changed`). */
  reload: () => void;
}

/** Comparación de postulados de un proceso (F2), con `reload` para el caso WYSIWYS `terms_changed`. */
export function useOwnerComparacion(processId: string): UseOwnerComparacionResult {
  const agencyId = useOwnerAgencyId();
  const [comparacion, setComparacion] = useState<EleccionComparacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!agencyId || !processId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    ownerSeleccionApi.getComparacion(agencyId, processId).then((c) => {
      if (!alive) return;
      setComparacion(c);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId, processId, nonce]);

  const unavailable = !agencyId || (!isLoading && comparacion === null);
  return { comparacion, isLoading, unavailable, agencyId, reload: () => setNonce((n) => n + 1) };
}

export interface UseOwnerSolicitudesResult {
  solicitudes: Solicitud[];
  isLoading: boolean;
  unavailable: boolean;
  agencyId: string | null;
}

/**
 * Lista de solicitudes del propietario (F4). `unavailable` = portal no cableado. Una lista vacía
 * CON agencyId es estado legítimo ("no tenés solicitudes") — lo distingue la página.
 */
export function useOwnerSolicitudes(): UseOwnerSolicitudesResult {
  const agencyId = useOwnerAgencyId();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!agencyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    ownerSolicitudesApi.getSolicitudes(agencyId).then((s) => {
      if (!alive) return;
      setSolicitudes(s);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId]);

  return { solicitudes, isLoading, unavailable: !agencyId, agencyId };
}

export interface UseOwnerSolicitudResult {
  detalle: SolicitudDetalle | null;
  isLoading: boolean;
  unavailable: boolean;
  agencyId: string | null;
}

/** Detalle + timeline de una solicitud (F4). */
export function useOwnerSolicitud(requestId: string): UseOwnerSolicitudResult {
  const agencyId = useOwnerAgencyId();
  const [detalle, setDetalle] = useState<SolicitudDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!agencyId || !requestId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    ownerSolicitudesApi.getSolicitud(agencyId, requestId).then((d) => {
      if (!alive) return;
      setDetalle(d);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [agencyId, requestId]);

  const unavailable = !agencyId || (!isLoading && detalle === null);
  return { detalle, isLoading, unavailable, agencyId };
}
