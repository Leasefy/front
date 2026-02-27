'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { applicationsApi } from '@/lib/api/applications.service';
import type { TenantApplicationView } from '@/lib/api/applications.service';
import type { Application } from '@/lib/types/application';

// ============================================================================
// useMyApplications - tenant's own applications
// ============================================================================

export function useMyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.getMine();
      setApplications(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando aplicaciones';
      setError(message);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  return { applications, isLoading, error, refetch: fetchMine };
}

// ============================================================================
// useTenantApplications - tenant display-oriented list with active/completed
// ============================================================================

const ACTIVE_STATUSES = new Set(['submitted', 'under_review', 'pre_approved']);

export function useTenantApplications() {
  const [applications, setApplications] = useState<TenantApplicationView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.getMineForDisplay();
      setApplications(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando aplicaciones';
      setError(message);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const active = useMemo(
    () => applications.filter((a) => ACTIVE_STATUSES.has(a.status)),
    [applications]
  );

  const completed = useMemo(
    () => applications.filter((a) => !ACTIVE_STATUSES.has(a.status)),
    [applications]
  );

  return { applications, active, completed, isLoading, error, refetch: fetchMine };
}

// ============================================================================
// useTenantApplication - single application for tenant display
// ============================================================================

export function useTenantApplication(id: string | null | undefined) {
  const [application, setApplication] = useState<TenantApplicationView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setApplication(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    applicationsApi
      .getByIdForDisplay(id)
      .then((app) => {
        if (!cancelled) {
          setApplication(app);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando aplicación');
          setApplication(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { application, isLoading, error };
}

// ============================================================================
// useApplication - single application by ID
// ============================================================================

export function useApplication(id: string | null | undefined) {
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setApplication(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    applicationsApi
      .getById(id)
      .then((app) => {
        if (!cancelled) {
          setApplication(app);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando aplicación');
          setApplication(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { application, isLoading, error };
}

// ============================================================================
// usePropertyApplications - landlord view of applications for a property
// ============================================================================

export function usePropertyApplications(propertyId: string | null | undefined) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!propertyId) {
      setApplications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.getByProperty(propertyId);
      setApplications(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando aplicaciones';
      setError(message);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { applications, isLoading, error, refetch: fetch };
}
