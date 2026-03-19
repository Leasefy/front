'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { visitsApi } from '@/lib/api/visits.service';
import type { Visit } from '@/lib/types/visit';
import type { CreateVisitDto, CancelVisitDto, RescheduleVisitDto } from '@/lib/api/visits.types';

// ============================================================================
// useVisits - list visits with stats and helpers
// ============================================================================

export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await visitsApi.getMine();
      setVisits(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando visitas';
      setError(message);
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: visits.length,
      requested: visits.filter(v => v.status === 'requested').length,
      confirmed: visits.filter(v => v.status === 'confirmed').length,
      completed: visits.filter(v => v.status === 'completed').length,
      cancelled: visits.filter(v => v.status === 'cancelled').length,
      noShow: visits.filter(v => v.status === 'no_show').length,
      confirmedToday: visits.filter(v => v.status === 'confirmed' && v.requestedDate === today).length,
    };
  }, [visits]);

  const getUpcoming = useCallback(() => {
    return visits
      .filter(v => v.status === 'confirmed' || v.status === 'requested')
      .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));
  }, [visits]);

  const getForProperty = useCallback((propertyId: string) => {
    return visits.filter(v => v.propertyId === propertyId);
  }, [visits]);

  return { visits, stats, isLoading, error, refetch: fetchVisits, getUpcoming, getForProperty };
}

// ============================================================================
// useVisit - single visit by id
// ============================================================================

export function useVisit(id: string | null) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setVisit(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    visitsApi
      .getById(id)
      .then((v) => {
        if (!cancelled) {
          setVisit(v);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando visita');
          setVisit(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { visit, isLoading, error };
}

// ============================================================================
// useVisitActions - mutation actions on visits
// ============================================================================

export function useVisitActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirm = useCallback(async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await visitsApi.confirm(id);
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reject = useCallback(async (id: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await visitsApi.reject(id);
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const cancel = useCallback(async (id: string, dto: CancelVisitDto): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await visitsApi.cancel(id, dto);
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reschedule = useCallback(async (id: string, dto: RescheduleVisitDto): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await visitsApi.reschedule(id, dto);
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const create = useCallback(async (dto: CreateVisitDto): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await visitsApi.create(dto);
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { confirm, reject, cancel, reschedule, create, isSubmitting };
}
