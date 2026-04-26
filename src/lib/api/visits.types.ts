/**
 * Backend types for visit endpoints
 * Maps to /visits controller in NestJS backend
 */

// ============================================================================
// Slots
// ============================================================================

export interface VisitSlot {
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:mm" (24h)
  endTime: string;    // "HH:mm" (24h)
  isAvailable: boolean;
}

export interface SlotsResponse {
  startDate: string;
  endDate: string;
  slots: VisitSlot[];
}

// ============================================================================
// Visit entity
// ============================================================================

export interface BackendVisit {
  id: string;
  propertyId: string;
  tenantId: string;
  status: string;      // PENDING | ACCEPTED | COMPLETED | REJECTED | CANCELLED | RESCHEDULED
  visitType: string;   // IN_PERSON | VIRTUAL
  visitDate: string;   // ISO "2026-04-12T00:00:00.000Z"
  startTime: string;   // "HH:mm"
  tenantNotes?: string;
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    landlordId: string;
    landlord: { id: string; firstName: string; lastName: string; email: string };
  };
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateVisitDto {
  propertyId: string;
  date: string;                        // "YYYY-MM-DD"
  startTime: string;                   // "HH:mm" (24h)
  visitType?: 'IN_PERSON' | 'VIRTUAL'; // default IN_PERSON
  notes?: string;                      // max 500 chars
}

export interface CancelVisitDto {
  reason: string;
}

export interface RescheduleVisitDto {
  newDate: string;       // "YYYY-MM-DD"
  newStartTime: string;  // "HH:mm" (24h)
  reason?: string;
}
