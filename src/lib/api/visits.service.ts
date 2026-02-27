/**
 * Visits API service
 * Endpoints for scheduling and managing property visits
 */

import { apiClient } from './client';
import type { BackendVisit, CreateVisitDto, CancelVisitDto, RescheduleVisitDto } from './visits.types';
import type { Visit, VisitStatus } from '@/lib/types/visit';

// ============================================================================
// Status mapping (UPPERCASE backend -> lowercase frontend)
// ============================================================================

const VISIT_STATUS_MAP: Record<string, VisitStatus> = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

// ============================================================================
// Mapper
// ============================================================================

function mapBackendVisit(bv: BackendVisit): Visit {
  return {
    id: bv.id,
    candidateId: bv.candidateId,
    candidateName: bv.candidateName,
    propertyId: bv.propertyId,
    propertyTitle: bv.propertyTitle,
    requestedDate: bv.requestedDate,
    requestedTime: bv.requestedTime,
    status: VISIT_STATUS_MAP[bv.status] ?? bv.status as VisitStatus,
    candidateMessage: bv.candidateMessage,
    landlordNotes: bv.landlordNotes,
    cancellationReason: bv.cancellationReason,
    rescheduledFrom: bv.rescheduledFrom,
    createdAt: bv.createdAt,
  };
}

// ============================================================================
// Service
// ============================================================================

export const visitsApi = {
  /** GET /visits/mine - list landlord's visits */
  async getMine(): Promise<Visit[]> {
    const raw = await apiClient.get<BackendVisit[]>('/visits/mine');
    return raw.map(mapBackendVisit);
  },

  /** GET /visits/:id - get single visit */
  async getById(id: string): Promise<Visit> {
    const raw = await apiClient.get<BackendVisit>(`/visits/${id}`);
    return mapBackendVisit(raw);
  },

  /** POST /visits - create a new visit */
  async create(dto: CreateVisitDto): Promise<Visit> {
    const raw = await apiClient.post<BackendVisit>('/visits', dto);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/confirm - confirm a visit */
  async confirm(id: string): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/confirm`);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/reject - reject a visit */
  async reject(id: string): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/reject`);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/cancel - cancel a visit */
  async cancel(id: string, dto: CancelVisitDto): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/cancel`, dto);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/reschedule - reschedule a visit */
  async reschedule(id: string, dto: RescheduleVisitDto): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/reschedule`, dto);
    return mapBackendVisit(raw);
  },
};
