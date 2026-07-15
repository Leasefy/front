'use client';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { Check, Circle, Clock } from '@phosphor-icons/react';
import type { ContractStep } from '@/lib/types/contract';

// ============================================================================
// TextTs
// ============================================================================

export interface ContractTimelineProps {
  /** Contract timeline steps */
  steps: ContractStep[];
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ContractTimeline - Vertical timeline showing contract signing progress
 *
 * Follows Deel-style design:
 * - Clear visual progression with step indicators
 * - Current step highlighted
 * - Completed steps with checkmarks
 * - Pending steps grayed out
 * - Connecting lines between steps
 */
export function ContractTimeline({ steps, className }: ContractTimelineProps) {
  return (
    <div className={cn('space-y-0', className)} role="list" aria-label="Progreso del contrato">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4" role="listitem">
            {/* Step indicator column */}
            <div className="flex flex-col items-center">
              {/* Circle indicator */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  step.status === 'completed' && 'bg-success text-white',
                  step.status === 'current' && 'bg-primary text-primary-fg ring-4 ring-primary/20',
                  step.status === 'pending' && 'bg-surface-muted text-fg-muted'
                )}
              >
                {step.status === 'completed' ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : step.status === 'current' ? (
                  <Clock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden="true" />
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    'mt-2 h-12 w-0.5 transition-colors',
                    step.status === 'completed' ? 'bg-success' : 'bg-surface-muted'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Step content column */}
            <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
              <h4
                className={cn(
                  'text-sm font-medium transition-colors',
                  step.status === 'completed' && 'text-success',
                  step.status === 'current' && 'text-fg',
                  step.status === 'pending' && 'text-fg-muted'
                )}
              >
                {step.title}
              </h4>
              <p
                className={cn(
                  'mt-1 text-xs',
                  step.status === 'pending' ? 'text-fg-muted' : 'text-fg-muted'
                )}
              >
                {step.description}
              </p>
              {step.completedAt && (
                <p className="mt-1 text-xs text-fg-muted">{formatDate(step.completedAt)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
