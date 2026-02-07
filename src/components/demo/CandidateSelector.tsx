'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LevelBadge } from '@/components/score';
import type { CandidateBasic } from '@/lib/types/candidate';
import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// TextTs
// ============================================================================

export interface CandidateSelectorProps {
  /** List of candidates to display */
  candidates: CandidateBasic[];
  /** Currently selected candidate ID */
  selectedId: string;
  /** Callback when selection changes */
  onChange: (candidateId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CandidateSelector - Dropdown for selecting mock candidates
 *
 * Groups candidates by risk level (A, B, C, D) for easy navigation.
 * Shows level badge and name for each candidate.
 *
 * Used in demo/testing pages for switching between candidate profiles.
 */
export function CandidateSelector({
  candidates,
  selectedId,
  onChange,
  className,
}: CandidateSelectorProps) {
  // Group candidates by risk level
  const groupedCandidates = candidates.reduce(
    (acc, candidate) => {
      if (!acc[candidate.riskLevel]) {
        acc[candidate.riskLevel] = [];
      }
      acc[candidate.riskLevel].push(candidate);
      return acc;
    },
    {} as Record<RiskLevel, CandidateBasic[]>
  );

  // Order of levels to display
  const levelOrder: RiskLevel[] = ['A', 'B', 'C', 'D'];

  // Get selected candidate for display
  const selectedCandidate = candidates.find((c) => c.id === selectedId);

  return (
    <Select value={selectedId} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          {selectedCandidate && (
            <div className="flex items-center gap-2">
              <LevelBadge level={selectedCandidate.riskLevel} size="sm" />
              <span>{selectedCandidate.fullName}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {levelOrder.map((level) => {
          const levelCandidates = groupedCandidates[level];
          if (!levelCandidates || levelCandidates.length === 0) return null;

          return (
            <SelectGroup key={level}>
              <SelectLabel className="flex items-center gap-2">
                <LevelBadge level={level} size="sm" />
                <span>Nivel {level}</span>
              </SelectLabel>
              {levelCandidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {candidate.numericScore}
                    </span>
                    <span>{candidate.fullName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
