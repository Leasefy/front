'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { applicationsApi } from '@/lib/api/applications.service';
import { contractsApi } from '@/lib/api/contracts.service';
import type { TenantApplicationView } from '@/lib/api/applications.service';
import type { Application } from '@/lib/types/application';
import type { Contract } from '@/lib/types/contract';
import type { TenantApplicationStatus } from '@/lib/types/tenant-application';

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
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    applicationsApi
      .getMine()
      .then((result) => {
        if (!cancelled) {
          setApplications(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando aplicaciones');
          setApplications([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { applications, isLoading, error, refetch: fetchMine };
}

// ============================================================================
// useTenantApplications - tenant display-oriented list with active/completed
// ============================================================================

/**
 * Clasifica una aplicación como "completada" según:
 * - Estados terminales de la app (rejected/withdrawn/contract_failed).
 * - `approved` solo se considera completada cuando el contrato ya está vigente
 *   (`active` o `expired`). Mientras el proceso de contrato esté en curso
 *   (draft/pending firmas/rejected_pending_modifications/signed) la app sigue "en proceso".
 *
 * Esto acompaña la UX: el tenant sigue viendo la aplicación en "En Proceso" hasta que
 * el contrato realmente arranque a regir.
 */
function isApplicationCompleted(
  status: TenantApplicationStatus,
  contract: Contract | undefined,
): boolean {
  if (status === 'rejected' || status === 'withdrawn' || status === 'contract_failed') return true;
  if (status === 'approved') {
    if (!contract) return false;
    return contract.status === 'active' || contract.status === 'expired';
  }
  return false;
}

export function useTenantApplications() {
  const [applications, setApplications] = useState<TenantApplicationView[]>([]);
  const [contractsByApp, setContractsByApp] = useState<Record<string, Contract>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Traemos apps y contratos en paralelo: el criterio active/completed para `approved`
      // depende del status del contrato asociado.
      const [apps, contracts] = await Promise.all([
        applicationsApi.getMineForDisplay(),
        contractsApi.getMine().catch(() => [] as Contract[]),
      ]);
      setApplications(apps);
      const map: Record<string, Contract> = {};
      for (const c of contracts) {
        if (c.applicationId) map[c.applicationId] = c;
      }
      setContractsByApp(map);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando aplicaciones';
      setError(message);
      setApplications([]);
      setContractsByApp({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const active = useMemo(
    () => applications.filter((a) => !isApplicationCompleted(a.status, contractsByApp[a.id])),
    [applications, contractsByApp],
  );

  const completed = useMemo(
    () => applications.filter((a) => isApplicationCompleted(a.status, contractsByApp[a.id])),
    [applications, contractsByApp],
  );

  return { applications, active, completed, contractsByApp, isLoading, error, refetch: fetchMine };
}

// ============================================================================
// useTenantApplication - single application for tenant display
// ============================================================================

export function useTenantApplication(id: string | null | undefined) {
  const [application, setApplication] = useState<TenantApplicationView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) {
      setApplication(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const app = await applicationsApi.getByIdForDisplay(id);
      setApplication(app);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando aplicación');
      setApplication(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

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

  return { application, isLoading, error, refetch };
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
    if (!propertyId) {
      setApplications([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    applicationsApi
      .getByProperty(propertyId)
      .then((result) => {
        if (!cancelled) {
          setApplications(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando aplicaciones');
          setApplications([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return { applications, isLoading, error, refetch: fetch };
}
