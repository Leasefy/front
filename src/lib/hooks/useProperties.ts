'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { propertiesApi, type PaginatedProperties } from '@/lib/api/properties.service';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';
import type { Property } from '@/lib/types/property';
import type { PaginationMeta } from '@/lib/api/properties.types';

// ============================================================================
// useProperties - list with filters & pagination
// ============================================================================

export function useProperties(filters: PropertyFiltersParams = {}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize filters to detect changes
  const filtersKey = JSON.stringify(filters);
  const prevFiltersKey = useRef(filtersKey);

  const fetchProperties = useCallback(async (params: PropertyFiltersParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await propertiesApi.list(params);
      setProperties(result.data);
      setMeta(result.meta);
    } catch (err) {
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

  return { properties, meta, isLoading, error, refetch };
}

// ============================================================================
// useProperty - single property by ID
// ============================================================================

export function useProperty(id: string | null | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProperty(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

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
          setError(err instanceof Error ? err.message : 'Error cargando propiedad');
          setProperty(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { property, isLoading, error };
}

// ============================================================================
// useMyProperties - landlord's own properties
// ============================================================================

export function useMyProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await propertiesApi.getMine();
      setProperties(result);
    } catch (err) {
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

  return { properties, isLoading, error, refetch: fetchMine };
}

// ============================================================================
// useFeaturedProperties - for homepage / tenant dashboard
// ============================================================================

export function useFeaturedProperties(limit: number = 6) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

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
          setError(err instanceof Error ? err.message : 'Error cargando propiedades');
          setProperties([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { properties, isLoading, error };
}
