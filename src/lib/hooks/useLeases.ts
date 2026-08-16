'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { leasesApi } from '@/lib/api/leases.service';
import { tenantPaymentRequestsApi } from '@/lib/api/tenant-payment-requests.service';
import type { Lease, Payment, LeaseSummaryStats } from '@/lib/types/lease';
import type { BackendPaymentInfo } from '@/lib/api/leases.types';
import type { BackendTenantPaymentRequest } from '@/lib/api/tenant-payment-requests.types';
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
// useLeases — list leases for the authenticated user with stats & helpers
// ============================================================================

export function useLeases() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchLeases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await leasesApi.getMine();
      setLeases(result);
    } catch (err) {
      setErrorCrudo(err);
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
        (sum, l) => sum + l.monthlyRent + (l.adminFee ?? 0),
        0
      ),
      pendingPayments: 0,
      latePayments: 0,
    };
  }, [leases]);

  useRefrescoAutomatico(['leases', 'contratos', 'cobros'], fetchLeases);

  return {
    leases,
    isLoading,
    error, errorCrudo,
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
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchLease = useCallback(async () => {
    if (!id) {
      setLease(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await leasesApi.getById(id);
      setLease(result);
    } catch (err) {
      setErrorCrudo(err);
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

  return { lease, isLoading, error, errorCrudo, refetch: fetchLease };
}

// ============================================================================
// useLeasePayments — payments for a specific lease
// ============================================================================

export function useLeasePayments(leaseId: string | null) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchPayments = useCallback(async () => {
    if (!leaseId) {
      setPayments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await leasesApi.getPayments(leaseId);
      setPayments(
        result.sort(
          (a, b) =>
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        )
      );
    } catch (err) {
      setErrorCrudo(err);
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
    error, errorCrudo,
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
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await leasesApi.getMyPayments();
      setPayments(
        result.sort(
          (a, b) =>
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        )
      );
    } catch (err) {
      setErrorCrudo(err);
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
    error, errorCrudo,
    refetch: fetchPayments,
    getForLease,
    getNextPayment,
  };
}

// ============================================================================
// useMyPaymentRequests — TenantPaymentRequest del tenant (fuente única del
// historial: incluye PENDING_VALIDATION, APPROVED, REJECTED, etc).
// ============================================================================

export function useMyPaymentRequests() {
  const [requests, setRequests] = useState<BackendTenantPaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await tenantPaymentRequestsApi.getMine();
      setRequests(result);
    } catch (err) {
      setErrorCrudo(err);
      const message = err instanceof Error ? err.message : 'Error cargando pagos';
      setError(message);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getForLease = useCallback(
    (leaseId: string) => requests.filter((r) => r.leaseId === leaseId),
    [requests]
  );

  return {
    requests,
    isLoading,
    error, errorCrudo,
    refetch: fetchRequests,
    getForLease,
  };
}

// ============================================================================
// useLeasePaymentInfo — info del período actual del lease (monto, status,
// motivo de rechazo). Necesario para gating del CTA "Pagar arriendo".
// ============================================================================

export function useLeasePaymentInfo(leaseId: string | null) {
  const [info, setInfo] = useState<BackendPaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null);

  const fetchInfo = useCallback(async () => {
    if (!leaseId) {
      setInfo(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setErrorCrudo(null);
    try {
      const result = await leasesApi.getPaymentInfo(leaseId);
      setInfo(result);
    } catch (err) {
      setErrorCrudo(err);
      const message = err instanceof Error ? err.message : 'Error cargando info de pago';
      setError(message);
      setInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { info, isLoading, error, errorCrudo, refetch: fetchInfo };
}
