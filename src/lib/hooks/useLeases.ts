'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { leasesApi } from '@/lib/api/leases.service';
import type { Lease, Payment, LeaseSummaryStats } from '@/lib/types/lease';

// ============================================================================
// useLeases — list leases for the authenticated user with stats & helpers
// ============================================================================

export function useLeases() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await leasesApi.getMine();
      setLeases(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando arriendos';
      setError(message);
      setLeases([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  const getActive = useCallback(() => {
    return leases.filter(
      (l) => l.status === 'active' || l.status === 'ending_soon'
    );
  }, [leases]);

  const stats: LeaseSummaryStats = useMemo(() => {
    const active = leases.filter((l) => l.status === 'active');
    const endingSoon = leases.filter((l) => l.status === 'ending_soon');
    return {
      activeLeases: active.length,
      endingSoon: endingSoon.length,
      totalMonthlyIncome: active.reduce(
        (sum, l) => sum + l.monthlyRent + l.adminFee,
        0
      ),
      pendingPayments: 0,
      latePayments: 0,
    };
  }, [leases]);

  return {
    leases,
    isLoading,
    error,
    refetch: fetchLeases,
    getActive,
    stats,
  };
}

// ============================================================================
// useLease — single lease by id
// ============================================================================

export function useLease(id: string | null) {
  const [lease, setLease] = useState<Lease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLease = useCallback(async () => {
    if (!id) {
      setLease(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await leasesApi.getById(id);
      setLease(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando arriendo';
      setError(message);
      setLease(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLease();
  }, [fetchLease]);

  return { lease, isLoading, error, refetch: fetchLease };
}

// ============================================================================
// useLeasePayments — payments for a specific lease
// ============================================================================

export function useLeasePayments(leaseId: string | null) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!leaseId) {
      setPayments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await leasesApi.getPayments(leaseId);
      setPayments(
        result.sort(
          (a, b) =>
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando pagos';
      setError(message);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getNextPayment = useCallback((): Payment | undefined => {
    return payments.find((p) => p.status === 'pending');
  }, [payments]);

  const getPaid = useCallback(() => {
    return payments.filter((p) => p.status === 'paid' || p.status === 'late');
  }, [payments]);

  const getPending = useCallback(() => {
    return payments.filter((p) => p.status === 'pending');
  }, [payments]);

  return {
    payments,
    isLoading,
    error,
    refetch: fetchPayments,
    getNextPayment,
    getPaid,
    getPending,
  };
}

// ============================================================================
// useMyPayments — all payments for the authenticated tenant
// ============================================================================

export function useMyPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await leasesApi.getMyPayments();
      setPayments(
        result.sort(
          (a, b) =>
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando pagos';
      setError(message);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getForLease = useCallback(
    (leaseId: string) => {
      return payments.filter((p) => p.leaseId === leaseId);
    },
    [payments]
  );

  const getNextPayment = useCallback(
    (leaseId?: string): Payment | undefined => {
      const filtered = leaseId
        ? payments.filter((p) => p.leaseId === leaseId)
        : payments;
      return filtered.find((p) => p.status === 'pending');
    },
    [payments]
  );

  return {
    payments,
    isLoading,
    error,
    refetch: fetchPayments,
    getForLease,
    getNextPayment,
  };
}
