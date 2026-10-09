'use client';

/**
 * Las lecturas de Niti · calidad para la pestaña «Calidad» de Portales: el
 * resumen y la lista paginada. Cada una con { data, cargando, error, recargar }.
 *
 * Mismo cuidado que `use-payu.ts`: `data` es SIEMPRE la de los filtros
 * pedidos —mientras llega la del filtro nuevo, la del anterior no se muestra ni
 * un instante— y sólo la última respuesta escribe. Refrescar con los MISMOS
 * filtros (después de decidir una propuesta) sí conserva lo que había mientras
 * llega lo nuevo: la fila no parpadea.
 *
 * Una clave `null` no pide nada: es como se cumple «si Niti está apagado para
 * la inmobiliaria, no se pide la lista».
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { nitiApi } from '@/lib/api/niti.service';
import type { FiltroDeCalidad, PaginaDeCalidad, ResumenDeCalidad } from '@/lib/types/niti';

export interface LecturaDeNiti<T> {
  /** `null` mientras carga por primera vez, si falló, o si no se pidió. */
  data: T | null;
  cargando: boolean;
  error: unknown;
  recargar: () => Promise<void>;
}

function useLectura<T>(clave: string | null, leer: () => Promise<T>): LecturaDeNiti<T> {
  const [estado, setEstado] = useState<{
    clave: string | null;
    data: T | null;
    cargando: boolean;
    error: unknown;
  }>({ clave: null, data: null, cargando: false, error: null });
  const leerRef = useRef(leer);
  leerRef.current = leer;
  const ultimo = useRef(0);

  const recargar = useCallback(async () => {
    if (clave === null) return;
    const n = ++ultimo.current;
    setEstado((s) => ({ ...s, cargando: true }));
    try {
      const data = await leerRef.current();
      if (n !== ultimo.current) return;
      setEstado({ clave, data, cargando: false, error: null });
    } catch (error) {
      if (n !== ultimo.current) return;
      // Con la misma clave se conserva lo que ya había (un refresco que falla
      // no borra la lista); con otra, no hay nada que conservar.
      setEstado((s) => ({ clave, data: s.clave === clave ? s.data : null, cargando: false, error }));
    }
  }, [clave]);

  useEffect(() => {
    void recargar();
    // Al cambiar de filtros o desmontar, lo que esté en vuelo ya no escribe.
    const contador = ultimo;
    return () => {
      contador.current++;
    };
  }, [recargar]);

  if (clave === null) return { data: null, cargando: false, error: null, recargar };
  // Todavía no hay respuesta para ESTA clave: está cargando, aunque el efecto
  // no haya corrido (sin esto, el primer render se leía como «vacío»).
  const pendiente = estado.clave !== clave;
  return {
    data: pendiente ? null : estado.data,
    cargando: pendiente || estado.cargando,
    error: pendiente ? null : estado.error,
    recargar,
  };
}

/** Si Niti está prendido para la inmobiliaria, su última pasada y sus cifras. */
export function useResumenDeNiti(agencyId: string | null | undefined): LecturaDeNiti<ResumenDeCalidad> {
  return useLectura(agencyId ? `resumen|${agencyId}` : null, () => nitiApi.resumen(agencyId as string));
}

export interface FiltrosDeLaListaDeNiti {
  page: number;
  limit: number;
  filtro: FiltroDeCalidad;
}

/**
 * La lista de peor a mejor. `pedir: false` (Niti apagado, o el resumen todavía
 * no dijo si está prendido) no sale ninguna llamada.
 */
export function useInmueblesDeNiti(
  agencyId: string | null | undefined,
  { page, limit, filtro }: FiltrosDeLaListaDeNiti,
  pedir: boolean,
): LecturaDeNiti<PaginaDeCalidad> {
  return useLectura(agencyId && pedir ? `${agencyId}|${filtro}|${page}|${limit}` : null, () =>
    nitiApi.inmuebles(agencyId as string, { page, limit, filtro }),
  );
}
