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
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            Configura tu agencia
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Completa estos pasos para aprovechar al máximo Leasefy
          </p>
        </div>
        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
          {completionPercent}% completado
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
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
                className="h-5 w-5 text-emerald-500 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Circle
                weight="regular"
                className="h-5 w-5 text-neutral-400 dark:text-neutral-500 shrink-0"
                aria-hidden="true"
              />
            )}

            {/* Label */}
            <span
              className={cn(
                'flex-1 text-sm',
                step.completed
                  ? 'text-neutral-400 dark:text-neutral-500 line-through'
                  : 'text-neutral-700 dark:text-neutral-300'
              )}
            >
              {step.label}
            </span>

            {/* Action Link */}
            {step.action && !step.completed && (
              <Link
                href={step.action.href}
                className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
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
