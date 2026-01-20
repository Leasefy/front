/**
 * Mock landlord data for dashboard testing
 * Associates 12 mock candidates with 3 properties
 */

import { mockProperties } from './mock-properties';
import { MOCK_CANDIDATES } from './mock-candidates';
import type { LandlordProperty, LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';

// ============================================================================
// Candidate Assignments
// ============================================================================

// Distribute 12 candidates across 3 properties with varied statuses
// Property 1: 5 candidates (1A, 2B, 1C, 1D)
// Property 2: 4 candidates (1A, 1B, 2C)
// Property 3: 3 candidates (2B, 1C)

const CANDIDATE_ASSIGNMENTS: Array<{
  candidateId: string;
  propertyId: string;
  status: LandlordCandidateStatus;
}> = [
  // Property 1 (prop-001): Chapinero Alto - 5 candidates
  { candidateId: 'cand-001', propertyId: 'prop-001', status: 'pre-approved' }, // Level A
  { candidateId: 'cand-003', propertyId: 'prop-001', status: 'pending' },      // Level B
  { candidateId: 'cand-004', propertyId: 'prop-001', status: 'pending' },      // Level B
  { candidateId: 'cand-007', propertyId: 'prop-001', status: 'more-info' },    // Level C
  { candidateId: 'cand-011', propertyId: 'prop-001', status: 'rejected' },     // Level D

  // Property 2 (prop-002): Usaquen - 4 candidates
  { candidateId: 'cand-002', propertyId: 'prop-002', status: 'approved' },     // Level A
  { candidateId: 'cand-005', propertyId: 'prop-002', status: 'pending' },      // Level B
  { candidateId: 'cand-008', propertyId: 'prop-002', status: 'pending' },      // Level C
  { candidateId: 'cand-010', propertyId: 'prop-002', status: 'more-info' },    // Level C

  // Property 3 (prop-006): El Poblado - 3 candidates
  { candidateId: 'cand-006', propertyId: 'prop-006', status: 'pending' },      // Level B
  { candidateId: 'cand-009', propertyId: 'prop-006', status: 'pending' },      // Level C
  { candidateId: 'cand-012', propertyId: 'prop-006', status: 'rejected' },     // Level D
];

// ============================================================================
// Build Landlord Candidates
// ============================================================================

function buildLandlordCandidates(): Map<string, LandlordCandidate[]> {
  const candidateMap = new Map<string, LandlordCandidate[]>();

  for (const assignment of CANDIDATE_ASSIGNMENTS) {
    const candidate = MOCK_CANDIDATES.find((c) => c.id === assignment.candidateId);
    if (!candidate) continue;

    const landlordCandidate: LandlordCandidate = {
      id: candidate.id,
      fullName: candidate.fullName,
      photo: candidate.photo,
      age: candidate.age,
      occupation: candidate.occupation,
      riskLevel: candidate.riskLevel,
      numericScore: candidate.numericScore,
      appliedAt: candidate.appliedAt,
      status: assignment.status,
      propertyId: assignment.propertyId,
      statusChangedAt: assignment.status !== 'pending'
        ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    };

    const existing = candidateMap.get(assignment.propertyId) || [];
    existing.push(landlordCandidate);
    candidateMap.set(assignment.propertyId, existing);
  }

  // Sort candidates by score (descending) within each property
  for (const [propertyId, candidates] of candidateMap.entries()) {
    candidates.sort((a, b) => b.numericScore - a.numericScore);
    candidateMap.set(propertyId, candidates);
  }

  return candidateMap;
}

// ============================================================================
// Property-Candidate Mapping
// ============================================================================

const CANDIDATE_MAP = buildLandlordCandidates();

/**
 * Get candidates for a specific property
 */
export function getCandidatesForProperty(propertyId: string): LandlordCandidate[] {
  return CANDIDATE_MAP.get(propertyId) || [];
}

/**
 * Record of property ID to sorted candidates
 */
export const PROPERTY_CANDIDATES: Record<string, LandlordCandidate[]> = {
  'prop-001': getCandidatesForProperty('prop-001'),
  'prop-002': getCandidatesForProperty('prop-002'),
  'prop-006': getCandidatesForProperty('prop-006'),
};

// ============================================================================
// Landlord Properties
// ============================================================================

function buildLandlordProperties(): LandlordProperty[] {
  const propertyIds = ['prop-001', 'prop-002', 'prop-006'];

  return propertyIds.map((propId) => {
    const baseProperty = mockProperties.find((p) => p.id === propId);
    if (!baseProperty) {
      throw new Error(`Property ${propId} not found in mock data`);
    }

    const candidates = getCandidatesForProperty(propId);
    const pendingCount = candidates.filter((c) => c.status === 'pending').length;
    const preApprovedCount = candidates.filter((c) => c.status === 'pre-approved').length;
    const approvedCount = candidates.filter((c) => c.status === 'approved').length;

    return {
      ...baseProperty,
      candidateCount: candidates.length,
      pendingCount,
      preApprovedCount,
      approvedCount,
      candidates,
    };
  });
}

/**
 * Landlord's properties with candidate counts
 */
export const LANDLORD_PROPERTIES: LandlordProperty[] = buildLandlordProperties();

/**
 * Get a single landlord property by ID
 */
export function getLandlordProperty(propertyId: string): LandlordProperty | undefined {
  return LANDLORD_PROPERTIES.find((p) => p.id === propertyId);
}

// ============================================================================
// Summary Helpers
// ============================================================================

/**
 * Get summary stats for all landlord properties
 */
export function getLandlordSummary() {
  const totalCandidates = LANDLORD_PROPERTIES.reduce((sum, p) => sum + p.candidateCount, 0);
  const pendingReview = LANDLORD_PROPERTIES.reduce((sum, p) => sum + p.pendingCount, 0);
  const preApproved = LANDLORD_PROPERTIES.reduce((sum, p) => sum + p.preApprovedCount, 0);
  const approved = LANDLORD_PROPERTIES.reduce((sum, p) => sum + p.approvedCount, 0);

  return {
    totalProperties: LANDLORD_PROPERTIES.length,
    totalCandidates,
    pendingReview,
    preApproved,
    approved,
  };
}

/**
 * Get all candidates across all properties, sorted by score
 */
export function getAllLandlordCandidates(): LandlordCandidate[] {
  return LANDLORD_PROPERTIES
    .flatMap((p) => p.candidates || [])
    .sort((a, b) => b.numericScore - a.numericScore);
}
