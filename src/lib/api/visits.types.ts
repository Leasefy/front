/**
 * Backend types for visit endpoints
 * Maps to /visits controller in NestJS backend
 */

export interface BackendVisit {
  id: string;
  candidateId: string;
  candidateName: string;
  propertyId: string;
  propertyTitle: string;
  requestedDate: string;
  requestedTime: string;
  status: string;
  candidateMessage?: string;
  landlordNotes?: string;
  cancellationReason?: string;
  rescheduledFrom?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitDto {
  propertyId: string;
  candidateId?: string;
  requestedDate: string;
  requestedTime: string;
  notes?: string;
}

export interface CancelVisitDto {
  reason: string;
}

export interface RescheduleVisitDto {
  date: string;
  time: string;
}
