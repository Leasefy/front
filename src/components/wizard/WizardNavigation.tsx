'use client';

import { ArrowLeft, ArrowRight, PaperPlaneTilt } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/types/application';
import { Button } from '@/components/ui/button';

// ============================================================================
// Props
// ============================================================================

interface WizardNavigationProps {
  currentStep: number;
  totalSteps?: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isValid?: boolean;
  isSubmitting?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * WizardNavigation - Pill-style navigation buttons
 * Black primary button, subtle outline secondary
 */
export function WizardNavigation({
  currentStep,
  totalSteps = WIZARD_STEPS.length,
  onBack,
  onNext,
  onSubmit,
  isValid = true,
  isSubmitting = false,
  className,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isReviewStep = currentStep === totalSteps;

  const handleNextClick = () => {
    if (isReviewStep && onSubmit) {
      onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between pt-6 border-t border-border',
        className
      )}
    >
      {/* Back button */}
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className={cn(isFirstStep && 'invisible')}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Atras</span>
      </Button>

      {/* Step indicator - center (mobile only) */}
      <span className="text-sm text-muted-foreground sm:hidden">
        {currentStep}/{totalSteps}
      </span>

      {/* Next/Submit button */}
      <Button
        onClick={handleNextClick}
        disabled={!isValid || isSubmitting}
        isLoading={isSubmitting}
        hideArrow
      >
        {isSubmitting ? (
          <span>Enviando...</span>
        ) : isReviewStep ? (
          <>
            <span>Enviar solicitud</span>
            <PaperPlaneTilt className="h-4 w-4" />
          </>
        ) : (
          <>
            <span>Continuar</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
