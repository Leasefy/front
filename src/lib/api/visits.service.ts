/**
 * Visits API service
 * Endpoints for scheduling and managing property visits
 */

import { apiClient } from './client';
import type { BackendVisit, CreateVisitDto, CancelVisitDto, RescheduleVisitDto, SlotsResponse } from './visits.types';
import type { Visit, VisitStatus, VisitType } from '@/lib/types/visit';

// ============================================================================
// Status mapping (UPPERCASE backend → lowercase frontend)
// ============================================================================

const VISIT_STATUS_MAP: Record<string, VisitStatus> = {
  PENDING:     'requested',
  ACCEPTED:    'confirmed',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',
  NO_SHOW:     'no_show',
  REJECTED:    'rejected',
  RESCHEDULED: 'rescheduled',
};

// ============================================================================
// Mapper
// ============================================================================

function mapBackendVisit(bv: BackendVisit): Visit {
  const date = bv.visitDate
    ? bv.visitDate.split('T')[0]  // "2026-04-12T00:00:00.000Z" → "2026-04-12"
    : '';

  return {
    id:               bv.id,
    candidateId:      bv.tenantId,
    candidateName:    `${bv.tenant.firstName} ${bv.tenant.lastName}`,
    propertyId:       bv.propertyId,
    propertyTitle:    bv.property.title,
    requestedDate:    date,
    requestedTime:    bv.startTime,
    status:           VISIT_STATUS_MAP[bv.status] ?? (bv.status.toLowerCase() as VisitStatus),
    visitType:        (bv.visitType as VisitType) ?? 'IN_PERSON',
    candidateMessage: bv.tenantNotes,
    createdAt:        bv.createdAt,
  };
}

// ============================================================================
// Service
// ============================================================================

export const visitsApi = {
  /**
   * GET /visits/properties/:propertyId/slots — public, no auth required.
   * Max range 30 days, min 2h anticipation.
   */
  async getSlots(propertyId: string, startDate: string, endDate: string): Promise<SlotsResponse> {
    return apiClient.get<SlotsResponse>(
      `/visits/properties/${propertyId}/slots?startDate=${startDate}&endDate=${endDate}`
    );
  },

  /** GET /visits/mine — TENANT gets own visits, LANDLORD gets visits for their properties */
  async getMine(): Promise<Visit[]> {
    const raw = await apiClient.get<BackendVisit[]>('/visits/mine');
    return raw.map(mapBackendVisit);
  },

  /** GET /visits/:id */
  async getById(id: string): Promise<Visit> {
    const raw = await apiClient.get<BackendVisit>(`/visits/${id}`);
    return mapBackendVisit(raw);
  },

  /** POST /visits — TENANT only. Returns 201 with created visit. */
  async create(dto: CreateVisitDto): Promise<Visit> {
    const raw = await apiClient.post<BackendVisit>('/visits', dto);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/accept */
  async confirm(id: string): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/accept`);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/reject */
  async reject(id: string): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/reject`);
    return mapBackendVisit(raw);
  },

  /** PATCH /visits/:id/cancel */
  async cancel(id: string, dto: CancelVisitDto): Promise<Visit> {
    const raw = await apiClient.patch<BackendVisit>(`/visits/${id}/cancel`, dto);
    return mapBackendVisit(raw);
  },

  /**
   * POST /visits/:id/reschedule
   * Creates a new PENDING visit and marks the original as RESCHEDULED.
   * visitType is inherited automatically.
   */
  async reschedule(id: string, dto: RescheduleVisitDto): Promise<Visit> {
    const raw = await apiClient.post<BackendVisit>(`/visits/${id}/reschedule`, dto);
    return mapBackendVisit(raw);
  },
};
