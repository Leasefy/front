import type { RiskScore } from './risk-score';

/**
 * Tenant evaluation record
 * Tracks payment status, score, and verification
 */
export interface TenantEvaluation {
  id: string;
  tenantId: string;
  status: 'pending' | 'paid' | 'expired';
  score: RiskScore | null;
  paidAt: string | null;
  expiresAt: string | null;
  verificationCode: string | null;
  createdAt: string;
}

/**
 * Payload for sharing a score report via link or PDF
 */
export interface ScoreSharePayload {
  tenantName: string;
  score: RiskScore;
  verificationCode: string;
  generatedAt: string;
  expiresAt: string;
}
