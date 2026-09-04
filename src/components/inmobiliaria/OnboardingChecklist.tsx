'use client';

import Link from 'next/link';
import { CheckCircle, Circle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAgencyOnboardingStatus } from '@/lib/hooks/useAgencyOnboardingStatus';

// ============================================================================
// OnboardingChecklist
// ============================================================================

/**
 * OnboardingChecklist
 *
 * Displays the agency setup checklist for admin users.
 * Hidden when: all steps are complete, or user is not an ADMIN.
 *
 * Used in: /panel/inmobiliaria (dashboard, top of content)
 */
export function OnboardingChecklist() {
  const { steps, isComplete, completionPercent, isAdmin } = useAgencyOnboardingStatus();

  // Only admins with incomplete setup see this
  if (!isAdmin || isComplete) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary-soft/50 dark:bg-primary/20 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-fg dark:text-white">
            Configura tu agencia
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
            Completa estos pasos para aprovechar al máximo Leasefy
          </p>
        </div>
        <span className="text-sm font-medium text-primary shrink-0">
          {completionPercent}% completado
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-surface-muted dark:bg-ink overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="space-y-3">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-3">
            {/* Status Icon */}
            {step.completed ? (
              <CheckCircle
                weight="fill"
                className="h-5 w-5 text-success shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Circle
                weight="regular"
                className="h-5 w-5 text-fg-subtle dark:text-fg-muted shrink-0"
                aria-hidden="true"
              />
            )}

            {/* Label */}
            <span
              className={cn(
                'flex-1 text-sm',
                step.completed
                  ? 'text-fg-subtle dark:text-fg-muted line-through'
                  : 'text-fg dark:text-fg-subtle'
              )}
            >
              {step.label}
            </span>

            {/* Action Link */}
            {step.action && !step.completed && (
              <Link
                href={step.action.href}
                className="shrink-0 text-xs font-medium text-primary hover:text-primary dark:hover:text-primary hover:underline"
              >
                {step.action.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
