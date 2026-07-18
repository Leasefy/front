/**
 * tenant-case.ts — v7-03 (CASO-01) unified tenant CASE view-model.
 *
 * This module is a READ PROJECTION of the tenant's existing source services
 * (tenant-payment-requests + application-journey). It NORMALIZES each source
 * row's own `estado`/timestamps into a neutral `TenantCase`; it NEVER recomputes
 * a saldo, an SLA, or a status (PITFALLS 9; PAGO-01 single-source discipline
 * carried from v7-01). The hook that consumes these mappers emits rows only for
 * `'pago'` and `'aplicacion'` — the forward-ref types (`pqrs`/`mantenimiento`/
 * `acuerdo`/`contrato`) get ZERO rows here and exist in the union purely for
 * v7-06/v7-07 forward-compat.
 *
 * The shape deliberately REUSES `pqrs.types.ts` field names (estado / slaVenceAt /
 * solicitanteTipo) at the v7-06 boundary but EXCLUDES all internal fields — no
 * responsible-party internal id, no agency notes — so it cannot leak cross-tenant
 * data (CASO-02 IDOR). `responsable` is a ROLE string; `id` is the opaque source
 * UUID.
 *
 * Consumer-law note (Ley 1480, PITFALLS 8): `CaseTone` deliberately omits an
 * alarm/danger level so the type cannot express an alarmist tone. Labels here are
 * factual — no credit-bureau references, no urgency/countdown copy.
 */

import type { TenantPaymentRequestStatus } from '@/lib/api/tenant-payment-requests.types';
import {
  APPLICATION_STATUS_LABELS,
  type TenantApplicationStatus,
} from '@/lib/types/tenant-application';

// ============================================================================
// View-model types
// ============================================================================

/**
 * The full nominal union of case types for forward-compat. The `useTenantCases`
 * aggregator only EMITS `'pago'` and `'aplicacion'`; the remaining members are
 * declared for v7-06/v7-07 (they contribute zero rows today).
 */
export type CaseType = 'pago' | 'aplicacion' | 'pqrs' | 'mantenimiento' | 'acuerdo' | 'contrato';

/**
 * Neutral tone scale, capped at `'attention'`. There is intentionally NO alarm
 * level — the type literally cannot express one (PITFALLS 8 / CASO-04).
 */
export type CaseTone = 'neutral' | 'info' | 'attention';

/** A single milestone built from ONE real source timestamp — nothing fabricated. */
export interface CaseEvent {
  id: string;
  label: string;
  timestamp: string;
}

/**
 * A normalized, read-only tenant case. Every field is projected from a source
 * row; none is computed. Internal fields (responsible-party id, agency notes) are
 * intentionally absent (CASO-02).
 */
export interface TenantCase {
  /** Opaque source UUID — never a guessable sequence. */
  id: string;
  type: CaseType;
  /** e.g. "Pago de julio 2026", "Postulación — Chapinero". */
  titulo: string;
  /** Read from the source status enum — NOT recomputed. */
  estadoLabel: string;
  /** Mapped neutrally from the source status via a pure, total mapper. */
  tone: CaseTone;
  /** ROLE only, e.g. "Inmobiliaria" — never an internal name/id. */
  responsable: string;
  /** Source updatedAt/validatedAt — a real timestamp only. */
  updatedAt: string;
  /** Route to the existing detail surface. */
  detailLink: string;
  /** Out-link to the source page (/inquilino/pagos, /aplicaciones/[id]). */
  sourceLink: string;
  /** Milestones built from source timestamps only. */
  events: CaseEvent[];
}

// ============================================================================
// Pure, TOTAL source-status mappers
// ============================================================================

function assertNever(x: never): never {
  throw new Error(`Unhandled case status: ${String(x)}`);
}

/**
 * Payment request status → tone. `attention` is the MAXIMUM; a rejected/disputed
 * payment never escalates past it (no alarm level exists).
 */
export function paymentStatusToTone(status: TenantPaymentRequestStatus): CaseTone {
  switch (status) {
    case 'PENDING_VALIDATION':
      return 'info';
    case 'REJECTED':
    case 'DISPUTED':
      return 'attention';
    case 'APPROVED':
    case 'CANCELLED':
      return 'neutral';
    default:
      return assertNever(status);
  }
}

/**
 * Payment request status → factual es label. No credit-bureau references, no
 * urgency/countdown copy — just what happened.
 */
export function paymentStatusToLabel(status: TenantPaymentRequestStatus): string {
  switch (status) {
    case 'PENDING_VALIDATION':
      return 'En validación';
    case 'REJECTED':
      return 'Rechazado — reintentar';
    case 'DISPUTED':
      return 'En disputa';
    case 'APPROVED':
      return 'Aprobado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return assertNever(status);
  }
}

/**
 * Application status → tone. `needs_info` (the tenant must act) is `attention`;
 * in-flight states are `info`; terminal states settle to `neutral`.
 */
export function applicationStatusToTone(status: TenantApplicationStatus): CaseTone {
  switch (status) {
    case 'needs_info':
      return 'attention';
    case 'submitted':
    case 'under_review':
    case 'pre_approved':
    case 'approved':
      return 'info';
    case 'rejected':
    case 'withdrawn':
    case 'contract_failed':
      return 'neutral';
    default:
      return assertNever(status);
  }
}

/**
 * Application status → label. REUSES `APPLICATION_STATUS_LABELS` (single source of
 * truth) — no parallel label map is invented here.
 */
export function applicationStatusToLabel(status: TenantApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status];
}
