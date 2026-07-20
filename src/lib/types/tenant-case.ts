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
 * v7-06 (SOLI-02) folds PQRS/maintenance in via `pqrsToCase`, REUSING the shared
 * `PqrsEstado`/`CostoResponsable` vocabulary (never a parallel enum). That mapper
 * still NORMALIZES-not-computes: it projects the source estado/timestamps and
 * carries the raw SLA/cost fields verbatim on an OPTIONAL `solicitud` metadata
 * block. It does NOT derive the SLA — the sanctioned business-day estimate is a
 * PRESENTATION concern (v7-06-03/04). The "never recompute a saldo/SLA/status"
 * doctrine holds.
 *
 * v7-07 (ACUE-01) folds approved acuerdos de pago in via `acuerdoToCase`, REUSING
 * the agent's single `AcuerdoDetail`/`AcuerdoInstallment` record shape (never a
 * parallel model). It too NORMALIZES-not-computes: it projects the plan
 * `status`/timestamps and carries the raw `totalDueCop`/`installments`/`paymentUrl`
 * verbatim on an OPTIONAL `acuerdo` metadata block — it does NOT recompute a saldo
 * (PITFALLS 9; the agent is the sole saldo authority — the cuota plan renders
 * verbatim downstream). `detailLink` is the dedicated interactive
 * `/inquilino/acuerdos/[id]`. The "never recompute a saldo/SLA/status" doctrine holds.
 *
 * Consumer-law note (Ley 1480, PITFALLS 8): `CaseTone` deliberately omits an
 * alarm/danger level so the type cannot express an alarmist tone. `en_cotizacion`
 * caps at `'attention'`; reparacion/urgente never reach an alarm color. Labels
 * here are factual — no credit-bureau references, no urgency/countdown copy.
 */

import type {
  AcuerdoDetail,
  AcuerdoInstallment,
} from '@/lib/api/tenant-acuerdos.types';
import type {
  CostoResponsable,
  PqrsEstado,
  SolicitudPqrs,
} from '@/lib/api/pqrs.types';
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
  /**
   * PQRS-only pass-through metadata (v7-06). Carries the raw source estado, the
   * creation timestamp, and the optional SLA/cost fields so the detail/list layer
   * can render the SLA estimate + cost responsibility (SOLI-03/04). These are
   * PROJECTED verbatim — the SLA is NOT computed here (that estimate lives in the
   * presentation layer). Internal responsible-party ids / agency notes are
   * intentionally excluded (CASO-02).
   */
  solicitud?: {
    estado: PqrsEstado;
    createdAt: string;
    slaVenceAt?: string;
    costoResponsable?: CostoResponsable;
    cotizacionMonto?: number;
    cotizacionId?: string;
    cotizacionAprobadaAt?: string;
  };
  /**
   * Acuerdo-only pass-through metadata (v7-07). Carries the agent's plan `status`,
   * the single `totalDueCop`, the `installments[]` (rendered VERBATIM downstream),
   * the server-provided `paymentUrl`, and `acceptedAt` so the list/detail layer can
   * render the cuota plan (ACUE-01). These are PROJECTED verbatim — NO saldo is
   * recomputed here (PITFALLS 9; the agent is the sole saldo authority). Internal
   * `debtorId` / audit fields are intentionally excluded (CASO-02 IDOR).
   */
  acuerdo?: {
    status: string;
    totalDueCop: number;
    installments: AcuerdoInstallment[];
    paymentUrl: string | null;
    acceptedAt: string | null;
  };
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

// ============================================================================
// PQRS / mantenimiento — pure, TOTAL mappers + pass-through projection (v7-06)
// ============================================================================

const RESPONSABLE_INMOBILIARIA = 'Inmobiliaria';

/**
 * PQRS estado → tone. In-flight states are `info`; `en_cotizacion` caps at
 * `'attention'` (the tenant may need to approve a quote — SOLI-04); terminal
 * states settle to `neutral`. Total over the 6-member `PqrsEstado` via
 * `assertNever`; the return type is `CaseTone`, which cannot express an alarm
 * level — so `reparacion`/urgente never map to an alarm color (Ley 1480).
 */
export function pqrsStatusToTone(estado: PqrsEstado): CaseTone {
  switch (estado) {
    case 'recibida':
    case 'asignada':
    case 'en_proceso':
      return 'info';
    case 'en_cotizacion':
      return 'attention';
    case 'resuelta':
    case 'cerrada':
      return 'neutral';
    default:
      return assertNever(estado);
  }
}

/**
 * PQRS estado → factual es-CO label. Mirrors the agency's own vocabulary — no
 * urgency/countdown copy, no credit-bureau references.
 */
export function pqrsStatusToLabel(estado: PqrsEstado): string {
  switch (estado) {
    case 'recibida':
      return 'Recibida';
    case 'asignada':
      return 'Asignada';
    case 'en_proceso':
      return 'En proceso';
    case 'en_cotizacion':
      return 'En cotización';
    case 'resuelta':
      return 'Resuelta';
    case 'cerrada':
      return 'Cerrada';
    default:
      return assertNever(estado);
  }
}

/**
 * `SolicitudPqrs` → `TenantCase`. A pure PROJECTION mirroring `paymentRequestToCase`:
 * it normalizes estado/timestamps and PASSES THROUGH the raw SLA/cost fields on the
 * optional `solicitud` metadata — it does NOT compute the SLA (the sanctioned
 * business-day estimate is a presentation concern, v7-06-03/04). `tipo` `reparacion`
 * lands in the `'mantenimiento'` lane; every other tipo in `'pqrs'`. Events are built
 * from SOURCE timestamps only — nothing synthesized/padded.
 */
export function pqrsToCase(s: SolicitudPqrs): TenantCase {
  const events: CaseEvent[] = [
    { id: `${s.id}:recibida`, label: 'Recibida', timestamp: s.createdAt },
  ];
  // A quote milestone only when the request actually moved into cotización.
  if (s.estado === 'en_cotizacion' && s.updatedAt !== s.createdAt) {
    events.push({ id: `${s.id}:cotizacion`, label: 'En cotización', timestamp: s.updatedAt });
  }
  // A resolution milestone only when a real close timestamp exists.
  if (s.resueltaAt) {
    events.push({ id: `${s.id}:resuelta`, label: 'Resuelta', timestamp: s.resueltaAt });
  }

  return {
    id: s.id,
    type: s.tipo === 'reparacion' ? 'mantenimiento' : 'pqrs',
    titulo: s.asunto,
    estadoLabel: pqrsStatusToLabel(s.estado),
    tone: pqrsStatusToTone(s.estado),
    responsable: RESPONSABLE_INMOBILIARIA,
    updatedAt: s.updatedAt,
    // Unified case detail (timeline). sourceLink is the "ver en origen" out-link.
    detailLink: `/inquilino/casos/${encodeURIComponent(s.id)}`,
    sourceLink: '/inquilino/solicitudes',
    events,
    // Pass-through raw metadata — NO SLA math here (presentation layer computes it).
    solicitud: {
      estado: s.estado,
      createdAt: s.createdAt,
      slaVenceAt: s.slaVenceAt,
      costoResponsable: s.costoResponsable,
      cotizacionMonto: s.cotizacionMonto,
      cotizacionId: s.cotizacionId,
      cotizacionAprobadaAt: s.cotizacionAprobadaAt,
    },
  };
}

// ============================================================================
// Acuerdos de pago — pure, TOTAL mappers + pass-through projection (v7-07)
// ============================================================================

/**
 * Acuerdo plan `status` → tone. The agent `status` is a FREE string (not a closed
 * enum), so this is a `switch` with a safe DEFAULT (not `assertNever`): `offered`
 * caps at `'attention'` (the tenant may need to accept the plan — ACUE-02); `active`
 * is `'info'`; `completed`/`cancelled` settle to `'neutral'`; any unknown status
 * degrades to `'info'`. The return type is `CaseTone`, which cannot express an alarm
 * level — a mora/acuerdo case NEVER reaches that color (PITFALLS 8, Ley 1480).
 */
export function acuerdoStatusToTone(status: string): CaseTone {
  switch (status) {
    case 'offered':
      return 'attention';
    case 'active':
      return 'info';
    case 'completed':
    case 'cancelled':
      return 'neutral';
    default:
      return 'info';
  }
}

/**
 * Acuerdo plan `status` → factual es-CO label, with a safe generic default for an
 * unknown status. No credit-bureau references, no urgency/countdown copy — just the
 * plan's state.
 */
export function acuerdoStatusToLabel(status: string): string {
  switch (status) {
    case 'offered':
      return 'Propuesto';
    case 'active':
      return 'Activo';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Acuerdo de pago';
  }
}

/**
 * `AcuerdoDetail` → `TenantCase`. A pure PROJECTION mirroring `pqrsToCase`: it
 * normalizes the plan `status`/timestamps and PASSES THROUGH the raw record
 * (`status`, `totalDueCop`, `installments`, `paymentUrl`, `acceptedAt`) on the
 * OPTIONAL `acuerdo` metadata block — it does NOT compute or recompute a saldo
 * (PITFALLS 9; the agent is the sole saldo authority). `installments` is carried by
 * REFERENCE (no reduce/sum over cuota amounts — no derived saldo field). Events are
 * built from SOURCE timestamps ONLY (`offeredAt`, and `acceptedAt` when present) —
 * nothing synthesized/padded. `detailLink` is the dedicated interactive detail
 * `/inquilino/acuerdos/[id]`; internal `debtorId`/audit fields never cross (CASO-02).
 */
export function acuerdoToCase(p: AcuerdoDetail): TenantCase {
  const events: CaseEvent[] = [
    { id: `${p.planId}:offered`, label: 'Propuesto', timestamp: p.offeredAt },
  ];
  // An acceptance milestone only when a real accept timestamp exists.
  if (p.acceptedAt) {
    events.push({ id: `${p.planId}:accepted`, label: 'Aceptado', timestamp: p.acceptedAt });
  }

  return {
    id: p.planId,
    type: 'acuerdo',
    titulo: 'Acuerdo de pago',
    estadoLabel: acuerdoStatusToLabel(p.status),
    tone: acuerdoStatusToTone(p.status),
    responsable: RESPONSABLE_INMOBILIARIA,
    // Real source timestamps only — accepted when present, else offered.
    updatedAt: p.acceptedAt ?? p.offeredAt,
    // Dedicated interactive acuerdo detail; sourceLink is the "ver en origen" out-link.
    detailLink: `/inquilino/acuerdos/${encodeURIComponent(p.planId)}`,
    sourceLink: '/inquilino/acuerdos',
    events,
    // Pass-through record metadata — NO saldo math here (agent is the sole authority).
    acuerdo: {
      status: p.status,
      totalDueCop: p.totalDueCop,
      installments: p.installments,
      paymentUrl: p.paymentUrl,
      acceptedAt: p.acceptedAt,
    },
  };
}
