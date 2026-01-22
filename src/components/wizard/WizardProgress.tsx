'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/types/application';

// ============================================================================
// Props
// ============================================================================

interface WizardProgressProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * WizardProgress - 6-step progress indicator
 * Luxterra minimal style with purple accent for current step
 */
export function WizardProgress({
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: WizardProgressProps) {
  const handleStepClick = (step: number) => {
    // Only allow clicking on completed steps or current step
    if (completedSteps.includes(step) || step === currentStep) {
      onStepClick?.(step);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop progress */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress line background */}
          <div className="absolute top-5 left-0 w-full h-[2px] bg-gray-200" />

          {/* Progress line filled */}
          <div
            className="absolute top-5 left-0 h-[2px] bg-primary transition-all duration-500"
            style={{
              width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%`,
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {WIZARD_STEPS.map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = step.id === currentStep;
              const isClickable = isCompleted || isCurrent;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'flex flex-col items-center group',
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                  )}
                >
                  {/* Step circle */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-[2px] flex items-center justify-center transition-all duration-300',
                      'border-2',
                      isCompleted
                        ? 'bg-primary border-primary text-white'
                        : isCurrent
                        ? 'bg-white border-primary text-primary'
                        : 'bg-white border-gray-200 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium transition-colors',
                      isCurrent
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-gray-700'
                        : 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile progress - compact pill style */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Paso {currentStep} de {WIZARD_STEPS.length}
          </span>
          <span className="text-sm text-gray-500">
            {WIZARD_STEPS[currentStep - 1]?.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-[2px] overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width: `${(currentStep / WIZARD_STEPS.length) * 100}%`,
            }}
          />
        </div>

        {/* Step dots - clickable on mobile too */}
        <div className="flex justify-between mt-3">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isClickable = isCompleted || isCurrent;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  'w-8 h-8 rounded-[2px] flex items-center justify-center text-xs font-medium transition-all',
                  isCompleted
                    ? 'bg-primary text-white'
                    : isCurrent
                    ? 'bg-primary/10 text-primary border border-primary'
                    : 'bg-gray-100 text-gray-400',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                )}
                aria-label={`Ir al paso ${step.id}: ${step.label}`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
