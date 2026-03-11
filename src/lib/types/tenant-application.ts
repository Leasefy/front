/**
 * Tenant application tracking types
 * Types for tenant-facing application status and timeline views
 */

// ============================================================================
// Tenant Application Status
// ============================================================================

/**
 * Application status from tenant perspective
 * Maps to landlord actions but with tenant-friendly naming
 */
export type TenantApplicationStatus =
  | 'submitted'     // Application sent, awaiting review
  | 'under_review'  // Landlord is reviewing
  | 'pre_approved'  // Initial approval, pending final decision
  | 'approved'      // Final approval - accepted!
  | 'rejected'      // Declined
  | 'withdrawn';    // Tenant cancelled application

/**
 * Spanish labels for tenant-facing status display
 */
export const APPLICATION_STATUS_LABELS: Record<TenantApplicationStatus, string> = {
  submitted: 'Enviada',
  under_review: 'En revision',
  pre_approved: 'Pre-aprobada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
};

/**
 * Status badge colors following Phase 5 pattern
 * Format: "bg-[color]-100 text-[color]-700"
 */
export const APPLICATION_STATUS_COLORS: Record<TenantApplicationStatus, string> = {
  submitted: 'bg-muted text-foreground',
  under_review: 'bg-plan-status-blue-bg text-plan-status-blue',
  pre_approved: 'bg-plan-status-purple-bg text-plan-status-purple',
  approved: 'bg-plan-status-green-bg text-plan-status-green',
  rejected: 'bg-plan-status-red-bg text-plan-status-red',
  withdrawn: 'bg-plan-status-yellow-bg text-plan-status-yellow',
};

// ============================================================================
// Application Event Types
// ============================================================================

/**
 * Event types for application timeline
 */
export type ApplicationEventType =
  | 'created'           // Application started
  | 'submitted'         // Application submitted
  | 'documents_verified' // Documents reviewed
  | 'under_review'      // Landlord began review
  | 'pre_approved'      // Pre-approval granted
  | 'approved'          // Final approval
  | 'rejected'          // Application declined
  | 'withdrawn';        // Tenant withdrew

/**
 * Single event in application timeline
 */
export interface ApplicationEvent {
  id: string;
  type: ApplicationEventType;
  timestamp: string;
  description: string;
}

// ============================================================================
// Tenant Application
// ============================================================================

/**
 * Full application from tenant perspective
 * Includes status, timeline, and property reference
 */
export interface TenantApplication {
  id: string;
  propertyId: string;
  trackingCode: string;
  status: TenantApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  events: ApplicationEvent[];
}

// ============================================================================
// Status Progress Mapping
// ============================================================================

/**
 * Progress percentage for each status
 * Used for progress bar visualization
 */
const STATUS_PROGRESS: Record<TenantApplicationStatus, number> = {
  submitted: 20,
  under_review: 40,
  pre_approved: 70,
  approved: 100,
  rejected: 100,
  withdrawn: 100,
};

/**
 * Get progress percentage for a given status
 * @param status - Current application status
 * @returns Progress value from 0-100
 */
export function getStatusProgress(status: TenantApplicationStatus): number {
  return STATUS_PROGRESS[status];
}

/**
 * Check if application is in a final state
 */
export function isApplicationFinal(status: TenantApplicationStatus): boolean {
  return status === 'approved' || status === 'rejected' || status === 'withdrawn';
}

/**
 * Check if application can be withdrawn
 * Only non-final applications can be withdrawn
 */
export function canWithdraw(status: TenantApplicationStatus): boolean {
  return !isApplicationFinal(status);
}
