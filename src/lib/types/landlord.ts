/**
 * Landlord dashboard types
 * Types for property management and candidate tracking views
 */

import type { Property } from './property';
import type { CandidateBasic } from './candidate';

// ============================================================================
// Candidate Status for Landlord Decisions
// ============================================================================

/**
 * Status of a candidate's application from landlord perspective
 */
export type LandlordCandidateStatus =
  | 'pending'      // Nueva - awaiting review
  | 'pre-approved' // Pre-aprobado - initial approval
  | 'approved'     // Aprobado - final approval
  | 'rejected'     // Rechazado - declined
  | 'more-info';   // Requiere mas informacion

/**
 * Spanish labels for candidate statuses
 */
export const CANDIDATE_STATUS_LABELS: Record<LandlordCandidateStatus, string> = {
  pending: 'Pendiente',
  'pre-approved': 'Pre-aprobado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  'more-info': 'Requiere info',
};

/**
 * Status badge colors for UI
 */
export const CANDIDATE_STATUS_COLORS: Record<LandlordCandidateStatus, string> = {
  pending: 'bg-muted text-foreground',
  'pre-approved': 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  'more-info': 'bg-amber-100 text-amber-700',
};

// ============================================================================
// Landlord Candidate (Extended for Dashboard Views)
// ============================================================================

/**
 * Candidate with landlord-specific status tracking
 */
export interface LandlordCandidate extends CandidateBasic {
  status: LandlordCandidateStatus;
  appliedAt: string;
  statusChangedAt?: string;
  notes?: string;
  propertyId: string;
}

// ============================================================================
// Landlord Property (Property with Application Counts)
// ============================================================================

/**
 * Property with aggregated candidate counts for dashboard cards
 */
export interface LandlordProperty extends Property {
  candidateCount: number;
  pendingCount: number;
  preApprovedCount: number;
  approvedCount: number;
  candidates?: LandlordCandidate[];
}

// ============================================================================
// Dashboard Summary
// ============================================================================

/**
 * Aggregate stats for the dashboard header
 */
export interface DashboardSummary {
  totalProperties: number;
  totalCandidates: number;
  pendingReview: number;
  preApproved: number;
  approved: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate dashboard summary from properties
 */
export function calculateDashboardSummary(properties: LandlordProperty[]): DashboardSummary {
  return properties.reduce(
    (acc, prop) => ({
      totalProperties: acc.totalProperties + 1,
      totalCandidates: acc.totalCandidates + prop.candidateCount,
      pendingReview: acc.pendingReview + prop.pendingCount,
      preApproved: acc.preApproved + prop.preApprovedCount,
      approved: acc.approved + prop.approvedCount,
    }),
    {
      totalProperties: 0,
      totalCandidates: 0,
      pendingReview: 0,
      preApproved: 0,
      approved: 0,
    }
  );
}
