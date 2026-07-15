'use client'

import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'
import { WIZARD_STEPS, wizardStepIndex } from './wizard-steps'

export interface OnboardingWizardStepperProps {
  currentStep: OnboardingWizardStep | null
}

/**
 * 6-step visual stepper. The active step is derived from `currentStep`
 * (the hook's rehydrated state) — never local component state — so a page
 * refresh mid-wizard renders on the correct step automatically.
 *
 * Pattern: numbered circle + connector line, following the stepper the old
 * inmobiliaria onboarding used (`git log` pre-Cadence version), re-tokenized
 * to Cadence semantic classes (bg-primary / text-on-primary / border-border).
 */
export function OnboardingWizardStepper({ currentStep }: OnboardingWizardStepperProps) {
  const activeIndex = wizardStepIndex(currentStep)

  return (
    <ol
      aria-label="Progreso del registro de la inmobiliaria"
      className="flex items-center gap-1.5 sm:gap-2"
    >
      {WIZARD_STEPS.map((step, idx, arr) => {
        const isDone = idx < activeIndex
        const isCurrent = idx === activeIndex

        return (
          <li key={step.key} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2">
              <div
                data-testid={`wizard-step-${step.key}`}
                data-active={isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-mono tabular-nums transition-colors',
                  isDone
                    ? 'bg-primary border-2 border-primary text-primary-fg'
                    : isCurrent
                      ? 'bg-surface border-2 border-primary text-primary'
                      : 'bg-surface border border-border text-fg-subtle',
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" weight="bold" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'hidden md:inline text-xs font-medium',
                  isCurrent ? 'text-primary' : isDone ? 'text-fg' : 'text-fg-subtle',
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < arr.length - 1 && (
              <div className={cn('w-3 sm:w-6 h-0.5 transition-colors', isDone ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
