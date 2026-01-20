'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CandidateCard } from './CandidateCard';
import type { LandlordCandidate, LandlordCandidateStatus } from '@/lib/types/landlord';
import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// Types
// ============================================================================

export interface CandidateListProps {
  /** Array of candidates to display */
  candidates: LandlordCandidate[];
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
  onViewDetails,
  onDecision,
  groupByLevel = false,
  className,
}: CandidateListProps) {
  // Sort and optionally group candidates
  const sortedCandidates = useMemo(
    () => sortCandidatesByScore(candidates),
    [candidates]
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
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center',
          className
        )}
      >
        <svg
          className="mb-4 h-12 w-12 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-slate-700">
          Sin candidatos aun
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Los candidatos apareceran aqui cuando apliquen a esta propiedad.
        </p>
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
          onViewDetails={onViewDetails}
          onDecision={onDecision}
        />
      ))}
    </div>
  );
}
