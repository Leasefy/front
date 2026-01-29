'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { borderRadius, transitions, hoverEffects, cardStyles, badgeStyles } from '@/lib/design-tokens';
import { LevelBadge } from '@/components/score/LevelBadge';
import { CandidateMetrics } from './CandidateMetrics';
import { AISnippet } from './AISnippet';
import { DecisionConfirmation } from './DecisionConfirmation';
import { ContractConfirmation } from './ContractConfirmation';
import { useDecisions, MAX_PRE_APPROVALS } from '@/lib/context/DecisionContext';
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STATUS_COLORS,
  type LandlordCandidate,
  type LandlordCandidateStatus,
} from '@/lib/types/landlord';
import type { Candidate } from '@/lib/types/candidate';
import { MOCK_CANDIDATES } from '@/lib/data/mock-candidates';

// ============================================================================
// Types
// ============================================================================

export interface CandidateCardProps {
  /** The candidate to display */
  candidate: LandlordCandidate;
  /** Property ID for contract generation */
  propertyId: string;
  /** All candidate IDs for this property (for pre-approval limit check) */
  allCandidateIds?: string[];
  /** Callback when user clicks "Ver mas" */
  onViewDetails: (id: string) => void;
  /** Callback when user makes a decision */
  onDecision?: (id: string, status: LandlordCandidateStatus) => void;
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
 * - Header: Photo, name, occupation, risk badge, status badge
 * - Metrics: Income, employment stability, rental history
 * - AI Snippet: Brief assessment summary
 * - Actions: Pre-approve, View More, Reject buttons
 *
 * Features:
 * - Integrates with DecisionContext for state persistence
 * - Shows current status badge when decision made
 * - Visual styling changes for decided candidates
 */
export function CandidateCard({
  candidate,
  propertyId,
  allCandidateIds = [],
  onViewDetails,
  onDecision,
  className,
}: CandidateCardProps) {
  const { getDecision, setDecision, canPreApprove, getPreApprovedCount } = useDecisions();
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showContractConfirm, setShowContractConfirm] = useState(false);

  // Get current decision from context
  const decision = getDecision(candidate.id);
  const currentStatus = decision?.status || candidate.status || 'pending';

  // Pre-approval limit check
  const preApprovedCount = getPreApprovedCount(allCandidateIds);
  const canStillPreApprove = canPreApprove(allCandidateIds);

  // Get full candidate data for metrics
  const fullCandidate = getFullCandidateData(candidate.id);

  // Calculate metrics
  const employmentMonths = fullCandidate?.timeAtJob || 0;
  const monthlyIncome = fullCandidate?.totalIncome || 0;
  const historyRating = fullCandidate
    ? getHistoryRating(fullCandidate)
    : 'limited';
  const aiExplanation = fullCandidate?.riskScore.aiExplanation || '';

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDecision = (status: LandlordCandidateStatus) => {
    if (status === 'rejected') {
      setShowRejectConfirm(true);
      return;
    }

    // Check pre-approval limit
    if (status === 'pre-approved' && !canStillPreApprove && currentStatus !== 'pre-approved') {
      toast.error(`Maximo ${MAX_PRE_APPROVALS} pre-aprobados`, {
        description: 'Debes rechazar o quitar la pre-aprobacion de otro candidato primero.',
      });
      return;
    }

    setDecision(candidate.id, status);
    onDecision?.(candidate.id, status);

    // Show confirmation dialog or toast
    if (status === 'approved') {
      // Show contract generation dialog
      setShowContractConfirm(true);
    } else if (status === 'pre-approved') {
      toast.success('Candidato pre-aprobado', {
        description: `${preApprovedCount + 1} de ${MAX_PRE_APPROVALS} pre-aprobados`,
      });
    }
  };

  const handleRejectConfirm = () => {
    setDecision(candidate.id, 'rejected');
    onDecision?.(candidate.id, 'rejected');
    setShowRejectConfirm(false);
    toast.info('Candidato rechazado');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Card styling based on status
  const cardClassName = cn(
    cardStyles.interactive,
    'flex flex-col',
    currentStatus === 'rejected' && 'opacity-60',
    currentStatus === 'approved' && 'ring-2 ring-emerald-200',
    currentStatus === 'pre-approved' && 'ring-2 ring-blue-200',
    className
  );

  return (
    <>
      <Card className={cardClassName}>
        {/* Header: Photo + Info + Badge */}
        <CardHeader className="flex-row items-start gap-4 pb-3">
          {/* Photo Placeholder */}
          <div className={cn(
            'h-14 w-14 flex-shrink-0 overflow-hidden',
            borderRadius.sm,
            'bg-muted'
          )}>
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
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">
                {candidate.fullName.split(' ').slice(0, 2).join(' ')}
              </h3>
              {/* Status Badge */}
              {currentStatus !== 'pending' && (
                <span
                  className={cn(
                    badgeStyles.pill,
                    'px-2 py-0.5 flex-shrink-0',
                    CANDIDATE_STATUS_COLORS[currentStatus]
                  )}
                >
                  {CANDIDATE_STATUS_LABELS[currentStatus]}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 truncate">
              {candidate.occupation}
            </p>
            <p className="text-xs text-slate-500">{candidate.age} anos</p>
          </div>

          {/* Risk Badge */}
          <LevelBadge level={candidate.riskLevel} size="md" />
        </CardHeader>

        {/* Metrics Section */}
        <CardContent className={cn('border-t border-border py-3')}>
          <CandidateMetrics
            income={monthlyIncome}
            employmentMonths={employmentMonths}
            historyRating={historyRating}
            variant="compact"
          />
        </CardContent>

        {/* AI Snippet */}
        <CardContent className={cn('border-t border-border py-3')}>
          <AISnippet
            explanation={aiExplanation}
            level={candidate.riskLevel}
            maxLength={150}
          />
        </CardContent>

        {/* Action Buttons */}
        <CardFooter className={cn('flex gap-2 border-t border-border pt-3')}>
          {/* Primary: Aprobar (black) */}
          <Button
            size="sm"
            variant="default"
            className={cn(
              'flex-1',
              currentStatus === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
            )}
            onClick={() => handleDecision('approved')}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Aprobar
          </Button>
          {/* Secondary: Pre-aprobar */}
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'flex-1 transition-colors',
              currentStatus === 'pre-approved' && 'bg-blue-50 text-blue-700 border-blue-300'
            )}
            onClick={() => handleDecision('pre-approved')}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Pre-aprobar
          </Button>
          {/* Ver mas */}
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails(candidate.id)}
          >
            Ver más
          </Button>
        </CardFooter>
      </Card>

      {/* Reject Confirmation Dialog */}
      <DecisionConfirmation
        action="reject"
        candidateName={candidate.fullName}
        isOpen={showRejectConfirm}
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
      />

      {/* Contract Generation Dialog */}
      <ContractConfirmation
        candidateName={candidate.fullName}
        propertyId={propertyId}
        candidateId={candidate.id}
        isOpen={showContractConfirm}
        onClose={() => setShowContractConfirm(false)}
      />
    </>
  );
}
