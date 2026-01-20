/**
 * Candidate types for tenant applications
 * Used in landlord views to display applicant information with risk scores
 */

import type { RiskScore, RiskLevel } from './risk-score';
import type { EmploymentStatus, DocumentType, MaritalStatus } from './application';

// ============================================================================
// Basic Candidate (List Views)
// ============================================================================

/**
 * Minimal candidate info for list/card views
 * Enough to display a candidate row or card without full details
 */
export interface CandidateBasic {
  id: string;
  fullName: string;
  photo?: string;
  age: number;
  occupation: string;
  riskLevel: RiskLevel;
  numericScore: number;
  appliedAt: string;
}

// ============================================================================
// Full Candidate Profile
// ============================================================================

/**
 * Complete candidate with all details for profile views
 * Extends basic info with personal, employment, income, and application data
 */
export interface Candidate extends CandidateBasic {
  // Personal Information
  documentType: DocumentType;
  documentNumber: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  currentAddress: string;
  timeAtCurrentAddress: number; // months
  maritalStatus: MaritalStatus;
  dependents: number;

  // Employment Information
  employmentStatus: EmploymentStatus;
  companyName?: string;
  industry?: string;
  position?: string;
  contractType?: string;
  timeAtJob?: number; // months
  employerPhone?: string;

  // Income Information
  monthlySalary: number;
  additionalIncome: number;
  totalIncome: number;
  monthlyObligations: number;
  availableForRent: number;

  // Application Metadata
  applicationId: string;
  propertyId: string;
  propertyTitle?: string; // For reference in lists

  // Full Risk Assessment
  riskScore: RiskScore;

  // References Summary
  previousLandlordsCount: number;
  employmentReferencesCount: number;
  personalReferencesCount: number;

  // Document Status
  hasIdDocument: boolean;
  hasIncomeProof: boolean;
  hasEmploymentLetter: boolean;
  hasBankStatements: boolean;
}

// ============================================================================
// Candidate Status
// ============================================================================

/**
 * Application status from landlord perspective
 */
export type CandidateStatus =
  | 'pending'      // Awaiting review
  | 'reviewing'    // Currently being reviewed
  | 'approved'     // Accepted by landlord
  | 'rejected'     // Declined by landlord
  | 'withdrawn';   // Withdrawn by applicant

/**
 * Candidate with status for dashboard views
 */
export interface CandidateWithStatus extends CandidateBasic {
  status: CandidateStatus;
  propertyId: string;
  propertyTitle: string;
  lastActivityAt: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Filters for candidate lists
 */
export interface CandidateFilters {
  riskLevels?: RiskLevel[];
  minScore?: number;
  maxScore?: number;
  status?: CandidateStatus[];
  propertyId?: string;
  search?: string;
}

/**
 * Sort options for candidate lists
 */
export type CandidateSortField =
  | 'numericScore'
  | 'appliedAt'
  | 'fullName'
  | 'totalIncome';

export interface CandidateSortOptions {
  field: CandidateSortField;
  direction: 'asc' | 'desc';
}
