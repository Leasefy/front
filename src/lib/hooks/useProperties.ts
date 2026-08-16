'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { propertiesApi, type PaginatedProperties } from '@/lib/api/properties.service';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';
import type { Property } from '@/lib/types/property';
import type { PaginationMeta } from '@/lib/api/properties.types';
import { esNoExiste } from '@/lib/errores/clasificar';
import { useRefrescoAutomatico } from './use-refresco-automatico';

/*
 * `errorCrudo` guarda el error TAL CUAL, además del mensaje.
 *
 * `error` se aplasta a string con `err.message`, y ahí se pierde el status
 * HTTP. Sin status, `clasificarFallo` no puede distinguir un 404 —«esto no
 * existe», sin reintentar— de un 500 o un fallo de red —«probá de nuevo»—, así
 * que las cuatro estados colapsan a uno. Medido: un 404 salía como «problema
 * nuestro, probá de nuevo», mandando a reintentar algo que nunca va a existir.
 *
 * Se agrega en vez de cambiar el tipo de `error`: 77 consumidores lo pintan
 * como string y seguirían funcionando igual.
 */

// ============================================================================
// useProperties - list with filters & pagination
// ============================================================================

export function useProperties(filters: PropertyFiltersParams = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  // Serialize filters to detect changes
  const filtersKey = JSON.stringify(filters);
  const prevFiltersKey = useRef(filtersKey);

  const fetchProperties = useCallback(async (params: PropertyFiltersParams) => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await propertiesApi.list(params);
      setProperties(result.data);
      setMeta(result.meta);
    } catch (err) {
      setErrorCrudo(err);
      const message = err instanceof Error ? err.message : 'Error cargando propiedades';
      setError(message);
      setProperties([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const parsed: PropertyFiltersParams = JSON.parse(filtersKey);
    fetchProperties(parsed);
    prevFiltersKey.current = filtersKey;
  }, [filtersKey, fetchProperties]);

  const refetch = useCallback(() => {
    const parsed: PropertyFiltersParams = JSON.parse(filtersKey);
    fetchProperties(parsed);
  }, [filtersKey, fetchProperties]);

  useRefrescoAutomatico(['properties', 'propiedades'], refetch);
  return { properties, meta, isLoading, error, errorCrudo, refetch };
}

// ============================================================================
// useProperty - single property by ID
// ============================================================================

export function useProperty(id: string | null | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  useEffect(() => {
    if (!id) {
      setProperty(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);

    propertiesApi
      .getById(id)
      .then((p) => {
        if (!cancelled) {
          setProperty(p);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorCrudo(err);
          setError(err instanceof Error ? err.message : 'Error cargando propiedad');
          setProperty(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { property, isLoading, error, errorCrudo };
}

// ============================================================================
// useMyProperties - landlord's own properties
// ============================================================================

export function useMyProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchMine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await propertiesApi.getMine();
      setProperties(result);
    } catch (err) {
      setErrorCrudo(err);
      const message = err instanceof Error ? err.message : 'Error cargando propiedades';
      setError(message);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  useRefrescoAutomatico(['properties', 'propiedades'], fetchMine);
  return { properties, isLoading, error, errorCrudo, refetch: fetchMine };
}

// ============================================================================
// useWishlistedProperties - resolve a list of property IDs to full properties
// ============================================================================

/**
 * Resuelve una lista de ids de inmuebles a objetos completos.
 *
 * Los guardados se piden de a uno por id —no cruzando contra el top-N— para
 * que algo guardado no desaparezca sólo por caerse de la página destacada.
 *
 * ⚠️ Acá «no se pudo traer» y «ya no está publicado» son DOS cosas distintas y
 * antes se trataban igual. Cada pedido llevaba un `.catch(() => null)`, así que
 * `Promise.all` no podía rechazar nunca: `errorCrudo` era código muerto. Con la
 * red caída los cinco pedidos morían, la lista quedaba en `[]` y la pantalla
 * decía **«No tenés propiedades guardadas»** — a alguien que sí las tiene.
 *
 * Ahora se mira POR QUÉ falló cada uno:
 *   404      → el inmueble se bajó. Se descuenta y se cuenta aparte.
 *   cualquier otra cosa → no se pudo traer. Eso es un fallo y se dice.
 */
export function useWishlistedProperties(ids: string[]) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);
  /** Guardadas que el backend ya no tiene: las bajaron, no fallaron. */
  const [yaNoDisponibles, setYaNoDisponibles] = useState(0);
  const [intento, setIntento] = useState(0);

  // Serialize ids to a stable key so the effect only re-runs on real changes.
  const idsKey = ids.join(',');

  useEffect(() => {
    const idList = idsKey ? idsKey.split(',') : [];

    if (idList.length === 0) {
      setProperties([]);
      setIsLoading(false);
      setError(null);
      setErrorCrudo(null);
      setYaNoDisponibles(0);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);

    Promise.all(
      idList.map(async (id) => {
        try {
          return { encontrada: await propertiesApi.getById(id) };
        } catch (err) {
          return { fallo: err };
        }
      }),
    ).then((resultados) => {
      if (cancelled) return;

      // Se conserva el orden de la wishlist.
      const encontradas = resultados
        .map((r) => ('encontrada' in r ? r.encontrada : null))
        .filter((p): p is Property => p !== null);
      const fallos = resultados.flatMap((r) => ('fallo' in r ? [r.fallo] : []));
      const bajadas = fallos.filter((e) => esNoExiste(e));
      const caidas = fallos.filter((e) => !esNoExiste(e));

      setProperties(encontradas);
      setYaNoDisponibles(bajadas.length);
      // Sólo es un fallo si NO se pudo traer nada: si algo llegó, mostrar lo
      // que hay es mejor que tapar la lista entera con un cartel.
      if (caidas.length > 0 && encontradas.length === 0) {
        setErrorCrudo(caidas[0]);
        setError(caidas[0] instanceof Error ? caidas[0].message : 'Error cargando propiedades');
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey, intento]);

  return {
    properties,
    isLoading,
    error,
    errorCrudo,
    yaNoDisponibles,
    refetch: () => setIntento((n) => n + 1),
  };
}

// ============================================================================
// useFeaturedProperties - for homepage / tenant dashboard
// ============================================================================

export function useFeaturedProperties(limit: number = 6) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);

    propertiesApi
      .list({ limit, page: 1 })
      .then((result) => {
        if (!cancelled) {
          setProperties(result.data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorCrudo(err);
          setError(err instanceof Error ? err.message : 'Error cargando propiedades');
          setProperties([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { properties, isLoading, error, errorCrudo };
}
