'use client';

import { useState } from 'react';
import { Check, X, FileQuestion, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDecisions } from '@/lib/context/DecisionContext';
import type { LandlordCandidateStatus } from '@/lib/types/landlord';

// ============================================================================
// Types
// ============================================================================

export interface DecisionButtonsProps {
  /** ID of the candidate */
  candidateId: string;
  /** Current status (from context or mock data) */
  currentStatus?: LandlordCandidateStatus;
  /** Display variant: card = compact, detail = full with all options */
  variant: 'card' | 'detail';
  /** Callback after a decision is made */
  onDecision?: (status: LandlordCandidateStatus) => void;
  /** Callback for opening reject confirmation dialog */
  onRejectConfirm?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DecisionButtons - Reusable decision action buttons for candidates
 *
 * Card variant (compact):
 * [Pre-aprobar] [Rechazar]
 *
 * Detail variant (full):
 * [Pre-aprobar] [Aprobar] [Rechazar] [Mas info]
 * (with current status indicator)
 */
export function DecisionButtons({
  candidateId,
  currentStatus = 'pending',
  variant,
  onDecision,
  onRejectConfirm,
  className,
}: DecisionButtonsProps) {
  const { setDecision, clearDecision } = useDecisions();
  const [isUpdating, setIsUpdating] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDecision = (status: LandlordCandidateStatus) => {
    // For reject, trigger confirmation if callback provided
    if (status === 'rejected' && onRejectConfirm) {
      onRejectConfirm();
      return;
    }

    setIsUpdating(true);
    setDecision(candidateId, status);
    onDecision?.(status);

    // Brief visual feedback
    setTimeout(() => setIsUpdating(false), 300);
  };

  const handleReset = () => {
    clearDecision(candidateId);
    onDecision?.('pending');
  };

  // ---------------------------------------------------------------------------
  // Render: Card Variant (compact)
  // ---------------------------------------------------------------------------

  if (variant === 'card') {
    return (
      <div className={cn('flex gap-2', className)}>
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          className={cn(
            'flex-1 transition-colors',
            currentStatus === 'pre-approved'
              ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
          )}
          onClick={() => handleDecision('pre-approved')}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Pre-aprobar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isUpdating}
          className={cn(
            'flex-1 transition-colors',
            currentStatus === 'rejected'
              ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              : 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
          )}
          onClick={() => handleDecision('rejected')}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Rechazar
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Detail Variant (full)
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-3', className)}>
      {/* Primary Actions Row */}
      <div className="flex flex-wrap gap-2">
        {/* Pre-approve Button */}
        <Button
          size="sm"
          variant={currentStatus === 'pre-approved' ? 'default' : 'outline'}
          disabled={isUpdating}
          className={cn(
            'transition-colors',
            currentStatus === 'pre-approved'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700'
          )}
          onClick={() => handleDecision('pre-approved')}
        >
          <Check className="mr-1.5 h-4 w-4" />
          Pre-aprobar
        </Button>

        {/* Approve Button */}
        <Button
          size="sm"
          variant={currentStatus === 'approved' ? 'default' : 'outline'}
          disabled={isUpdating}
          className={cn(
            'transition-colors',
            currentStatus === 'approved'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
          )}
          onClick={() => handleDecision('approved')}
        >
          <Check className="mr-1.5 h-4 w-4" />
          Aprobar
        </Button>

        {/* Reject Button */}
        <Button
          size="sm"
          variant={currentStatus === 'rejected' ? 'default' : 'outline'}
          disabled={isUpdating}
          className={cn(
            'transition-colors',
            currentStatus === 'rejected'
              ? 'bg-red-600 hover:bg-red-700'
              : 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
          )}
          onClick={() => handleDecision('rejected')}
        >
          <X className="mr-1.5 h-4 w-4" />
          Rechazar
        </Button>
      </div>

      {/* Secondary Actions Row */}
      <div className="flex flex-wrap gap-2">
        {/* Request More Info Button */}
        <Button
          size="sm"
          variant={currentStatus === 'more-info' ? 'default' : 'outline'}
          disabled={isUpdating}
          className={cn(
            'transition-colors',
            currentStatus === 'more-info'
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700'
          )}
          onClick={() => handleDecision('more-info')}
        >
          <FileQuestion className="mr-1.5 h-4 w-4" />
          Solicitar mas info
        </Button>

        {/* Reset Button (only show if not pending) */}
        {currentStatus !== 'pending' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isUpdating}
            className="text-slate-500 hover:text-slate-700"
            onClick={handleReset}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Restablecer
          </Button>
        )}
      </div>
    </div>
  );
}
