'use client';

import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS } from '@/lib/types/application';

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
 * WizardNavigation - Back/Next/Submit buttons
 * Luxterra button style with rounded-sm corners
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
  const isLastStep = currentStep === totalSteps;
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
        'flex items-center justify-between pt-6 border-t border-gray-100',
        className
      )}
    >
      {/* Back button */}
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className={cn(
          'gap-2',
          isFirstStep && 'invisible' // Keep space but hide
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Atras</span>
      </Button>

      {/* Step indicator - center (mobile only) */}
      <span className="text-sm text-gray-500 sm:hidden">
        {currentStep}/{totalSteps}
      </span>

      {/* Next/Submit button */}
      <Button
        type="button"
        onClick={handleNextClick}
        disabled={!isValid || isSubmitting}
        className="gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : isReviewStep ? (
          <>
            <span>Enviar solicitud</span>
            <Send className="h-4 w-4" />
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Continuar</span>
            <span className="sm:hidden">Siguiente</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
