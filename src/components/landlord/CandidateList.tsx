'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { CandidateCard } from './CandidateCard';
import { useDecisions } from '@/lib/context/DecisionContext';
import type { LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';
import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// Types
// ============================================================================

export interface CandidateListProps {
  /** Array of candidates to display */
  candidates: LandlordCandidate[];
  /** Property ID for contract generation */
  propertyId: string;
  /** Callback when user clicks "Ver mas" */
  onViewDetails: (id: string) => void;
  /** Callback when user makes a decision */
  onDecision: (id: string, status: LandlordCandidateStatus) => void;
  /** Whether to group by risk level */
  groupByLevel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const LEVEL_ORDER: RiskLevel[] = ['A', 'B', 'C', 'D'];

const LEVEL_LABELS: Record<RiskLevel, string> = {
  A: 'Excelentes',
  B: 'Buenos',
  C: 'Regulares',
  D: 'Riesgosos',
};

// Status priority for sorting (lower = higher priority)
const STATUS_PRIORITY: Record<LandlordCandidateStatus, number> = {
  'approved': 0,
  'pre-approved': 1,
  'more-info': 2,
  'pending': 3,
  'rejected': 4,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort candidates by score (highest first)
 */
function sortCandidatesByScore(candidates: LandlordCandidate[]): LandlordCandidate[] {
  return [...candidates].sort((a, b) => b.numericScore - a.numericScore);
}

/**
 * Sort candidates by status first, then by score
 * Status order: approved > pre-approved > more-info > pending > rejected
 */
function sortCandidatesByStatusAndScore(
  candidates: LandlordCandidate[],
  getStatus: (id: string) => LandlordCandidateStatus
): LandlordCandidate[] {
  return [...candidates].sort((a, b) => {
    const statusA = getStatus(a.id);
    const statusB = getStatus(b.id);
    const priorityDiff = STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB];

    // If same status priority, sort by score
    if (priorityDiff === 0) {
      return b.numericScore - a.numericScore;
    }

    return priorityDiff;
  });
}

/**
 * Group candidates by risk level
 */
function groupCandidatesByLevel(
  candidates: LandlordCandidate[]
): Map<RiskLevel, LandlordCandidate[]> {
  const groups = new Map<RiskLevel, LandlordCandidate[]>();

  for (const level of LEVEL_ORDER) {
    const levelCandidates = candidates.filter((c) => c.riskLevel === level);
    if (levelCandidates.length > 0) {
      groups.set(level, sortCandidatesByScore(levelCandidates));
    }
  }

  return groups;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CandidateList - Grid of candidate cards for comparison
 *
 * Features:
 * - Desktop: 2 columns, 3-4 visible at once
 * - Mobile: 1 column, scrollable
 * - Sorted by score (best first)
 * - Optional grouping by risk level
 * - Empty state when no candidates
 */
export function CandidateList({
  candidates,
  propertyId,
  onViewDetails,
  onDecision,
  groupByLevel = false,
  className,
}: CandidateListProps) {
  const { getDecision } = useDecisions();

  // Get all candidate IDs for pre-approval limit checks
  const allCandidateIds = useMemo(
    () => candidates.map((c) => c.id),
    [candidates]
  );

  // Helper to get current status from context or candidate
  const getStatus = (id: string): LandlordCandidateStatus => {
    const decision = getDecision(id);
    const candidate = candidates.find((c) => c.id === id);
    return decision?.status || candidate?.status || 'pending';
  };

  // Sort candidates by status first, then by score
  const sortedCandidates = useMemo(
    () => sortCandidatesByStatusAndScore(candidates, getStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates, getDecision]
  );

  const groupedCandidates = useMemo(
    () => (groupByLevel ? groupCandidatesByLevel(candidates) : null),
    [candidates, groupByLevel]
  );

  // Empty state
  if (candidates.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[2px] border border-dashed border-slate-300 bg-slate-50',
          className
        )}
      >
        <EmptyState
          icon={Users}
          title="Sin candidatos aun"
          description="Los candidatos apareceran aqui cuando apliquen a esta propiedad."
        />
      </div>
    );
  }

  // Grouped display
  if (groupByLevel && groupedCandidates) {
    return (
      <div className={cn('space-y-8', className)}>
        {LEVEL_ORDER.map((level) => {
          const levelCandidates = groupedCandidates.get(level);
          if (!levelCandidates || levelCandidates.length === 0) return null;

          return (
            <section key={level}>
              {/* Level Header */}
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    level === 'A' && 'bg-emerald-100 text-emerald-700',
                    level === 'B' && 'bg-blue-100 text-blue-700',
                    level === 'C' && 'bg-amber-100 text-amber-700',
                    level === 'D' && 'bg-red-100 text-red-700'
                  )}
                >
                  {level}
                </span>
                <h3 className="text-sm font-medium text-slate-700">
                  {LEVEL_LABELS[level]} ({levelCandidates.length})
                </h3>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {levelCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    propertyId={propertyId}
                    allCandidateIds={allCandidateIds}
                    onViewDetails={onViewDetails}
                    onDecision={onDecision}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // Simple sorted display
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 md:grid-cols-2',
        className
      )}
    >
      {sortedCandidates.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          propertyId={propertyId}
          allCandidateIds={allCandidateIds}
          onViewDetails={onViewDetails}
          onDecision={onDecision}
        />
      ))}
    </div>
  );
}
