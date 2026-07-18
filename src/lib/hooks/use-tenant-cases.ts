'use client';

/**
 * use-tenant-cases.ts — v7-03 (CASO-01) unified tenant CASE aggregator.
 *
 * `useTenantCases()` is a READ PROJECTION: it composes the tenant's EXISTING
 * source hooks (payment requests + current-period info + primary lease context +
 * application-journey) into a single normalized `TenantCase[]`. It adds NO new
 * fetch and NO new authz surface — every source is already JWT-scoped to the
 * tenant (`/…/mine`). It NEVER recomputes a saldo, an SLA, or a status: each row's
 * estado/tone/label/events are mapped from that row's own fields via the pure,
 * total mappers in `tenant-case.ts`.
 *
 * Rows are emitted ONLY for real sources:
 *   - `'pago'`      — non-terminal payment requests + (optionally) a "próximo pago"
 *                     row when the current period needs action (see double-count fix).
 *   - `'aplicacion'`— non-terminal application-journey rows (contract-signing state
 *                     is already folded into `active` by useTenantApplications).
 *
 * Forward-ref types (pqrs/mantenimiento/acuerdo/contrato) contribute ZERO rows —
 * they are honest "Próximamente" sections rendered by the hub page (v7-03-02),
 * never fabricated cases. There is no hardcoded/placeholder case array here.
 */

import { useCallback, useMemo } from 'react';
import {
  useMyPaymentRequests,
  useLeases,
  useLeasePaymentInfo,
} from '@/lib/hooks/useLeases';
import { useTenantApplications } from '@/lib/hooks/useApplications';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import type { Lease } from '@/lib/types/lease';
import type { BackendTenantPaymentRequest } from '@/lib/api/tenant-payment-requests.types';
import type { TenantApplicationView } from '@/lib/api/applications.service';
import {
  type CaseEvent,
  type TenantCase,
  applicationStatusToLabel,
  applicationStatusToTone,
  paymentStatusToLabel,
  paymentStatusToTone,
} from '@/lib/types/tenant-case';

const RESPONSABLE_INMOBILIARIA = 'Inmobiliaria';
const PAGOS_LINK = '/inquilino/pagos';
const POLL_INTERVAL_MS = 30_000;

/** Non-terminal payment request statuses — the only ones that surface as a case. */
const OPEN_PAYMENT_STATUSES: ReadonlySet<BackendTenantPaymentRequest['status']> = new Set([
  'PENDING_VALIDATION',
  'DISPUTED',
  'REJECTED',
]);

/** es-CO month name (1-12) with the first letter capitalized. */
function monthLabel(month: number, year: number): string {
  const name = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(
    new Date(year, Math.max(0, Math.min(11, month - 1)), 1),
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Second-milestone label for a validated payment request (source timestamp present). */
function paymentValidationEventLabel(status: BackendTenantPaymentRequest['status']): string {
  switch (status) {
    case 'REJECTED':
      return 'Rechazado';
    case 'DISPUTED':
      return 'En disputa';
    case 'APPROVED':
      return 'Validado';
    default:
      return 'Actualizado';
  }
}

function paymentRequestToCase(req: BackendTenantPaymentRequest): TenantCase {
  const events: CaseEvent[] = [
    { id: `${req.id}:submitted`, label: 'Solicitud enviada', timestamp: req.createdAt },
  ];
  if (req.validatedAt) {
    events.push({
      id: `${req.id}:validated`,
      label: paymentValidationEventLabel(req.status),
      timestamp: req.validatedAt,
    });
  }

  return {
    id: req.id,
    type: 'pago',
    titulo: `Pago de ${monthLabel(req.periodMonth, req.periodYear)} ${req.periodYear}`,
    estadoLabel: paymentStatusToLabel(req.status),
    tone: paymentStatusToTone(req.status),
    responsable: RESPONSABLE_INMOBILIARIA,
    updatedAt: req.validatedAt ?? req.updatedAt,
    detailLink: PAGOS_LINK,
    sourceLink: PAGOS_LINK,
    events,
  };
}

function nextPaymentCase(lease: Lease, month: number, year: number): TenantCase {
  return {
    // Derived from the opaque lease UUID — stable, never a guessable sequence.
    id: `proximo-pago:${lease.id}`,
    type: 'pago',
    titulo: `Próximo pago — ${monthLabel(month, year)} ${year}`,
    estadoLabel: 'Por pagar',
    tone: 'info',
    responsable: RESPONSABLE_INMOBILIARIA,
    // Real source timestamp carried by the lease row — nothing fabricated.
    updatedAt: lease.updatedAt,
    detailLink: PAGOS_LINK,
    sourceLink: PAGOS_LINK,
    events: [],
  };
}

function applicationToCase(app: TenantApplicationView): TenantCase {
  const label = applicationStatusToLabel(app.status);
  const events: CaseEvent[] = [
    { id: `${app.id}:submitted`, label: 'Postulación enviada', timestamp: app.submittedAt },
  ];
  // Only add a current-status milestone when the row actually moved.
  if (app.updatedAt && app.updatedAt !== app.submittedAt) {
    events.push({ id: `${app.id}:status`, label, timestamp: app.updatedAt });
  }

  const zone = app.property?.neighborhood ?? app.property?.title ?? null;

  return {
    id: app.id,
    type: 'aplicacion',
    titulo: zone ? `Postulación — ${zone}` : 'Postulación',
    estadoLabel: label,
    tone: applicationStatusToTone(app.status),
    responsable: RESPONSABLE_INMOBILIARIA,
    updatedAt: app.updatedAt,
    detailLink: `/inquilino/aplicaciones/${app.id}`,
    sourceLink: `/inquilino/aplicaciones/${app.id}`,
    events,
  };
}

export interface UseTenantCasesResult {
  cases: TenantCase[];
  openCasesCount: number;
  primaryLease: Lease | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTenantCases(): UseTenantCasesResult {
  const {
    requests,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useMyPaymentRequests();

  const {
    getActive,
    isLoading: leasesLoading,
    error: leasesError,
    refetch: refetchLeases,
  } = useLeases();

  const primaryLease = getActive()[0] ?? null;

  const {
    info: paymentInfo,
    isLoading: paymentInfoLoading,
    error: paymentInfoError,
    refetch: refetchPaymentInfo,
  } = useLeasePaymentInfo(primaryLease?.id ?? null);

  const {
    active: activeApplications,
    isLoading: applicationsLoading,
    error: applicationsError,
    refetch: refetchApplications,
  } = useTenantApplications();

  const cases = useMemo<TenantCase[]>(() => {
    const out: TenantCase[] = [];

    // PAGO — non-terminal payment requests (single source of truth).
    for (const req of requests) {
      if (OPEN_PAYMENT_STATUSES.has(req.status)) {
        out.push(paymentRequestToCase(req));
      }
    }

    // PRÓXIMO PAGO — only when the current period has nothing yet (NONE) AND a
    // primary lease exists. A REJECTED current period is intentionally SKIPPED:
    // that period is already represented by its request-derived "pago" row above,
    // so emitting a second row here would inflate openCasesCount (checker fix).
    if (primaryLease && paymentInfo?.currentPeriodStatus === 'NONE') {
      out.push(
        nextPaymentCase(primaryLease, paymentInfo.currentPeriod.month, paymentInfo.currentPeriod.year),
      );
    }

    // APLICACION — non-terminal application-journey rows.
    for (const app of activeApplications) {
      out.push(applicationToCase(app));
    }

    // Forward-ref types (pqrs/mantenimiento/acuerdo/contrato) emit no rows.
    return out;
  }, [requests, primaryLease, paymentInfo, activeApplications]);

  const isLoading =
    requestsLoading || leasesLoading || paymentInfoLoading || applicationsLoading;

  // Surface the first source error; a single failed source has already degraded
  // to its empty list (403/404 → [] tolerance in the source hooks), so the hub
  // is never fully blanked.
  const error =
    requestsError ?? leasesError ?? paymentInfoError ?? applicationsError ?? null;

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchRequests(),
      refetchLeases(),
      refetchPaymentInfo(),
      refetchApplications(),
    ]);
  }, [refetchRequests, refetchLeases, refetchPaymentInfo, refetchApplications]);

  // Tab-gated aggregate refresh (realtime fallback). The source hooks own their
  // first fetch; this only polls + refreshes on re-focus. No SSE/WebSocket here.
  useVisibilityPolling(() => void refetch(), POLL_INTERVAL_MS, !isLoading);

  return {
    cases,
    openCasesCount: cases.length,
    primaryLease: primaryLease ?? null,
    isLoading,
    error,
    refetch,
  };
}
