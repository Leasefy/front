/**
 * Visit types for property viewing scheduling
 * Used in landlord panel to manage candidate property visits
 */

export type VisitStatus =
  | 'requested'   // PENDING
  | 'confirmed'   // ACCEPTED
  | 'completed'   // COMPLETED
  | 'cancelled'   // CANCELLED
  | 'no_show'     // NO_SHOW
  | 'rejected'    // REJECTED
  | 'rescheduled' // RESCHEDULED

export type VisitType = 'IN_PERSON' | 'VIRTUAL'

export interface Visit {
  id: string;
  /** tenantId from backend */
  candidateId: string;
  /** tenant.firstName + lastName */
  candidateName: string;
  propertyId: string;
  /** property.title */
  propertyTitle: string;
  /** visitDate normalized to YYYY-MM-DD */
  requestedDate: string;
  /** startTime in HH:mm (24h) */
  requestedTime: string;
  status: VisitStatus;
  visitType: VisitType;
  /** tenantNotes from backend */
  candidateMessage?: string;
  landlordNotes?: string;
  cancellationReason?: string;
  rescheduledFrom?: string;
  createdAt: string;
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested:   'Solicitada',
  confirmed:   'Confirmada',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
  rejected:    'Rechazada',
  rescheduled: 'Reprogramada',
};
