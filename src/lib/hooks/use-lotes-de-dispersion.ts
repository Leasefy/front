'use client';

/**
 * Los lotes de dispersión en pantalla: la lista y uno solo.
 *
 * No usan `useApiData` de `useInmobiliaria` porque no está exportado; el
 * patrón es el mismo: estado + `refetch` estable + refresco automático cuando
 * una acción toca el recurso (`apiClient` invalida `lotes-de-dispersion` en
 * cada POST a esas rutas, desde esta pantalla o desde cualquier otra).
 *
 * El error se guarda CRUDO (`unknown`) para que `FalloDeCarga` decida qué
 * decir — un 404 y una caída de red no se resuelven igual.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  lotesDeDispersionApi,
  RECURSO_DE_LOTES,
  type FiltrosDeLotes,
  type LoteResumen,
  type VistaDelLote,
} from '@/lib/api/lotes-de-dispersion.service';
import { useRefrescoAutomatico } from './use-refresco-automatico';

interface Estado<T> {
  datos: T | null;
  cargando: boolean;
  error: unknown;
}

/** Un fetch con guardia contra respuestas viejas que llegan después de un cambio de filtro. */
function useConsulta<T>(hacer: () => Promise<T>, clave: string) {
  const [estado, setEstado] = useState<Estado<T>>({ datos: null, cargando: true, error: null });
  const ultima = useRef(0);
  const hacerRef = useRef(hacer);
  hacerRef.current = hacer;

  const refetch = useCallback(async () => {
    const n = ++ultima.current;
    setEstado((prev) => ({ ...prev, cargando: true }));
    try {
      const datos = await hacerRef.current();
      if (n !== ultima.current) return;
      setEstado({ datos, cargando: false, error: null });
    } catch (error) {
      if (n !== ultima.current) return;
      // Se conserva lo que había: un refresco que falla no borra la tabla.
      setEstado((prev) => ({ datos: prev.datos, cargando: false, error }));
    }
  }, []);

  useEffect(() => {
    void refetch();
    // `clave` es el string de los filtros: cambia → se vuelve a pedir.
  }, [refetch, clave]);

  useRefrescoAutomatico([RECURSO_DE_LOTES], refetch);

  const setDatos = useCallback((datos: T) => {
    setEstado({ datos, cargando: false, error: null });
  }, []);

  return { ...estado, refetch, setDatos };
}

export function useLotesDeDispersion(filtros: FiltrosDeLotes) {
  const clave = `${filtros.month ?? ''}|${filtros.estado ?? ''}`;
  const { datos, cargando, error, refetch } = useConsulta<LoteResumen[]>(
    () => lotesDeDispersionApi.listar(filtros),
    clave,
  );
  return { lotes: datos ?? [], cargando, error, refetch };
}

export function useLoteDeDispersion(id: string) {
  const { datos, cargando, error, refetch, setDatos } = useConsulta<VistaDelLote>(
    () => lotesDeDispersionApi.ver(id),
    id,
  );
  return { vista: datos, cargando, error, refetch, setVista: setDatos };
}
