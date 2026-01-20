/**
 * Mock tenant applications data for development
 * 6 applications in various states referencing real properties
 */

import type {
  TenantApplication,
  TenantApplicationStatus,
  ApplicationEvent,
  ApplicationEventType,
} from '../types/tenant-application';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a tracking code in format AF-XXXXXX
 */
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AF-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create events based on final status
 * Generates a realistic timeline leading to the current status
 */
function createEventsForStatus(
  status: TenantApplicationStatus,
  submittedAt: string
): ApplicationEvent[] {
  const events: ApplicationEvent[] = [];
  const baseDate = new Date(submittedAt);
  let eventId = 1;

  // Always start with created event (before submission)
  const createdDate = new Date(baseDate);
  createdDate.setHours(createdDate.getHours() - 2);
  events.push({
    id: `event-${eventId++}`,
    type: 'created',
    timestamp: createdDate.toISOString(),
    description: 'Solicitud iniciada',
  });

  // Submission event
  events.push({
    id: `event-${eventId++}`,
    type: 'submitted',
    timestamp: baseDate.toISOString(),
    description: 'Solicitud enviada al propietario',
  });

  // If just submitted, stop here
  if (status === 'submitted') {
    return events;
  }

  // Withdrawn case - add withdrawal event
  if (status === 'withdrawn') {
    const withdrawnDate = new Date(baseDate);
    withdrawnDate.setDate(withdrawnDate.getDate() + 1);
    events.push({
      id: `event-${eventId++}`,
      type: 'withdrawn',
      timestamp: withdrawnDate.toISOString(),
      description: 'Solicitud retirada por el inquilino',
    });
    return events;
  }

  // Under review event (1 day after submission)
  const reviewDate = new Date(baseDate);
  reviewDate.setDate(reviewDate.getDate() + 1);
  events.push({
    id: `event-${eventId++}`,
    type: 'under_review',
    timestamp: reviewDate.toISOString(),
    description: 'El propietario esta revisando tu solicitud',
  });

  if (status === 'under_review') {
    return events;
  }

  // Documents verified (2 days after submission)
  const docsDate = new Date(baseDate);
  docsDate.setDate(docsDate.getDate() + 2);
  events.push({
    id: `event-${eventId++}`,
    type: 'documents_verified',
    timestamp: docsDate.toISOString(),
    description: 'Documentos verificados correctamente',
  });

  // Pre-approval event (3 days after submission)
  if (status === 'pre_approved' || status === 'approved') {
    const preApprovalDate = new Date(baseDate);
    preApprovalDate.setDate(preApprovalDate.getDate() + 3);
    events.push({
      id: `event-${eventId++}`,
      type: 'pre_approved',
      timestamp: preApprovalDate.toISOString(),
      description: 'Pre-aprobacion otorgada - pendiente confirmacion final',
    });
  }

  if (status === 'pre_approved') {
    return events;
  }

  // Final decision events (4-5 days after submission)
  if (status === 'approved') {
    const approvalDate = new Date(baseDate);
    approvalDate.setDate(approvalDate.getDate() + 5);
    events.push({
      id: `event-${eventId++}`,
      type: 'approved',
      timestamp: approvalDate.toISOString(),
      description: 'Felicitaciones! Tu solicitud ha sido aprobada',
    });
  }

  if (status === 'rejected') {
    const rejectionDate = new Date(baseDate);
    rejectionDate.setDate(rejectionDate.getDate() + 4);
    events.push({
      id: `event-${eventId++}`,
      type: 'rejected',
      timestamp: rejectionDate.toISOString(),
      description: 'Lo sentimos, tu solicitud no fue aprobada',
    });
  }

  return events;
}

/**
 * Get the updatedAt timestamp from the last event
 */
function getUpdatedAt(events: ApplicationEvent[]): string {
  if (events.length === 0) {
    return new Date().toISOString();
  }
  return events[events.length - 1].timestamp;
}

// ============================================================================
// Mock Applications Data
// ============================================================================

// Pre-generate tracking codes for consistency
const TRACKING_CODES = {
  'app-001': 'AF-K7N3P2',
  'app-002': 'AF-M9R4T6',
  'app-003': 'AF-W2X8J5',
  'app-004': 'AF-H4L9Q1',
  'app-005': 'AF-C6Y3V8',
  'app-006': 'AF-B1Z5F7',
};

// Create events for each application
const eventsApp001 = createEventsForStatus('submitted', '2026-01-18T14:30:00Z');
const eventsApp002 = createEventsForStatus('under_review', '2026-01-16T10:00:00Z');
const eventsApp003 = createEventsForStatus('pre_approved', '2026-01-14T09:15:00Z');
const eventsApp004 = createEventsForStatus('approved', '2026-01-10T11:00:00Z');
const eventsApp005 = createEventsForStatus('rejected', '2026-01-12T16:45:00Z');
const eventsApp006 = createEventsForStatus('withdrawn', '2026-01-17T08:30:00Z');

/**
 * Mock tenant applications - 6 applications in various states
 * Each references a valid property from mock-properties.ts
 */
export const MOCK_TENANT_APPLICATIONS: TenantApplication[] = [
  // 1. Submitted - just applied (prop-001 - Chapinero Alto apartment)
  {
    id: 'app-001',
    propertyId: 'prop-001',
    trackingCode: TRACKING_CODES['app-001'],
    status: 'submitted',
    submittedAt: '2026-01-18T14:30:00Z',
    updatedAt: getUpdatedAt(eventsApp001),
    events: eventsApp001,
  },

  // 2. Under review - documents being checked (prop-003 - Teusaquillo studio)
  {
    id: 'app-002',
    propertyId: 'prop-003',
    trackingCode: TRACKING_CODES['app-002'],
    status: 'under_review',
    submittedAt: '2026-01-16T10:00:00Z',
    updatedAt: getUpdatedAt(eventsApp002),
    events: eventsApp002,
  },

  // 3. Pre-approved - landlord interested (prop-005 - La Candelaria room)
  {
    id: 'app-003',
    propertyId: 'prop-005',
    trackingCode: TRACKING_CODES['app-003'],
    status: 'pre_approved',
    submittedAt: '2026-01-14T09:15:00Z',
    updatedAt: getUpdatedAt(eventsApp003),
    events: eventsApp003,
  },

  // 4. Approved - accepted! (prop-007 - Envigado house in Medellin)
  {
    id: 'app-004',
    propertyId: 'prop-007',
    trackingCode: TRACKING_CODES['app-004'],
    status: 'approved',
    submittedAt: '2026-01-10T11:00:00Z',
    updatedAt: getUpdatedAt(eventsApp004),
    events: eventsApp004,
  },

  // 5. Rejected - declined (prop-002 - Usaquen house)
  {
    id: 'app-005',
    propertyId: 'prop-002',
    trackingCode: TRACKING_CODES['app-005'],
    status: 'rejected',
    submittedAt: '2026-01-12T16:45:00Z',
    updatedAt: getUpdatedAt(eventsApp005),
    events: eventsApp005,
  },

  // 6. Withdrawn - tenant cancelled (prop-004 - Rosales penthouse)
  {
    id: 'app-006',
    propertyId: 'prop-004',
    trackingCode: TRACKING_CODES['app-006'],
    status: 'withdrawn',
    submittedAt: '2026-01-17T08:30:00Z',
    updatedAt: getUpdatedAt(eventsApp006),
    events: eventsApp006,
  },
];

// ============================================================================
// Helper Functions for Consumers
// ============================================================================

/**
 * Get application by ID
 */
export function getTenantApplicationById(
  id: string
): TenantApplication | undefined {
  return MOCK_TENANT_APPLICATIONS.find((app) => app.id === id);
}

/**
 * Get application by tracking code
 */
export function getApplicationByTrackingCode(
  trackingCode: string
): TenantApplication | undefined {
  return MOCK_TENANT_APPLICATIONS.find((app) => app.trackingCode === trackingCode);
}

/**
 * Get all applications with a specific status
 */
export function getApplicationsByStatus(
  status: TenantApplicationStatus
): TenantApplication[] {
  return MOCK_TENANT_APPLICATIONS.filter((app) => app.status === status);
}

/**
 * Get active applications (not final states)
 */
export function getActiveApplications(): TenantApplication[] {
  const finalStates: TenantApplicationStatus[] = ['approved', 'rejected', 'withdrawn'];
  return MOCK_TENANT_APPLICATIONS.filter((app) => !finalStates.includes(app.status));
}

/**
 * Get completed applications (final states)
 */
export function getCompletedApplications(): TenantApplication[] {
  const finalStates: TenantApplicationStatus[] = ['approved', 'rejected', 'withdrawn'];
  return MOCK_TENANT_APPLICATIONS.filter((app) => finalStates.includes(app.status));
}
