'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LevelBadge } from '@/components/score/LevelBadge';
import { CandidateMetrics } from './CandidateMetrics';
import { AISnippet } from './AISnippet';
import type { LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';
import { MOCK_CANDIDATES } from '@/lib/data/mock-candidates';

// ============================================================================
// Types
// ============================================================================

export interface CandidateCardProps {
  /** The candidate to display */
  candidate: LandlordCandidate;
  /** Callback when user clicks "Ver mas" */
  onViewDetails: (id: string) => void;
  /** Callback when user makes a decision */
  onDecision: (id: string, status: LandlordCandidateStatus) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get full candidate data from mock candidates for extra info
 */
function getFullCandidateData(candidateId: string): Candidate | undefined {
  return MOCK_CANDIDATES.find((c) => c.id === candidateId);
}

/**
 * Derive history rating from candidate data
 */
function getHistoryRating(
  candidate: Candidate
): 'positive' | 'mixed' | 'limited' {
  if (candidate.previousLandlordsCount >= 2) {
    return 'positive';
  }
  if (candidate.previousLandlordsCount === 1) {
    return 'mixed';
  }
  return 'limited';
}

// ============================================================================
// Component
// ============================================================================

/**
 * CandidateCard - Quick comparison card for landlord screening
 *
 * Layout:
 * - Header: Photo, name, occupation, risk badge
 * - Metrics: Income, employment stability, rental history
 * - AI Snippet: Brief assessment summary
 * - Actions: Pre-approve, View More, Reject buttons
 */
export function CandidateCard({
  candidate,
  onViewDetails,
  onDecision,
  className,
}: CandidateCardProps) {
  // Get full candidate data for metrics
  const fullCandidate = getFullCandidateData(candidate.id);

  // Calculate metrics
  const employmentMonths = fullCandidate?.timeAtJob || 0;
  const monthlyIncome = fullCandidate?.totalIncome || 0;
  const historyRating = fullCandidate
    ? getHistoryRating(fullCandidate)
    : 'limited';
  const aiExplanation = fullCandidate?.riskScore.aiExplanation || '';

  return (
    <Card
      className={cn(
        'flex flex-col transition-shadow hover:shadow-md',
        className
      )}
    >
      {/* Header: Photo + Info + Badge */}
      <CardHeader className="flex-row items-start gap-4 pb-3">
        {/* Photo Placeholder */}
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {candidate.photo ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${candidate.photo})` }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-medium text-slate-400">
              {candidate.fullName
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </div>
          )}
        </div>

        {/* Name and Occupation */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">
            {candidate.fullName.split(' ').slice(0, 2).join(' ')}
          </h3>
          <p className="text-sm text-slate-600 truncate">
            {candidate.occupation}
          </p>
          <p className="text-xs text-slate-500">
            {candidate.age} anos
          </p>
        </div>

        {/* Risk Badge */}
        <LevelBadge level={candidate.riskLevel} size="md" />
      </CardHeader>

      {/* Metrics Section */}
      <CardContent className="border-t border-slate-100 py-3">
        <CandidateMetrics
          income={monthlyIncome}
          employmentMonths={employmentMonths}
          historyRating={historyRating}
          variant="compact"
        />
      </CardContent>

      {/* AI Snippet */}
      <CardContent className="border-t border-slate-100 py-3">
        <AISnippet
          explanation={aiExplanation}
          level={candidate.riskLevel}
          maxLength={150}
        />
      </CardContent>

      {/* Action Buttons */}
      <CardFooter className="flex gap-2 border-t border-slate-100 pt-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={() => onDecision(candidate.id, 'pre-approved')}
        >
          Pre-aprobar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onViewDetails(candidate.id)}
        >
          Ver mas
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDecision(candidate.id, 'rejected')}
        >
          Rechazar
        </Button>
      </CardFooter>
    </Card>
  );
}
