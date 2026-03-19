/**
 * Visit types for property viewing scheduling
 * Used in landlord panel to manage candidate property visits
 */

export type VisitStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Visit {
  id: string;
  candidateId: string;
  candidateName: string;
  propertyId: string;
  propertyTitle: string;
  requestedDate: string;
  requestedTime: string;
  status: VisitStatus;
  candidateMessage?: string;
  landlordNotes?: string;
  cancellationReason?: string;
  rescheduledFrom?: string; // id of original visit
  createdAt: string;
}

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: 'Solicitada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};
