'use client';

import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
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
 * WizardNavigation - Luxterra-style navigation buttons
 * Clean black primary button, subtle outline secondary
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
        'flex items-center justify-between pt-6 border-t border-black/5',
        className
      )}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
          'rounded-sm border border-black/10 bg-white',
          'text-black/70 hover:text-black hover:border-black/20',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          isFirstStep && 'invisible'
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Atras</span>
      </button>

      {/* Step indicator - center (mobile only) */}
      <span className="text-sm text-black/40 sm:hidden">
        {currentStep}/{totalSteps}
      </span>

      {/* Next/Submit button */}
      <button
        type="button"
        onClick={handleNextClick}
        disabled={!isValid || isSubmitting}
        className={cn(
          'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium',
          'rounded-sm bg-black text-white',
          'hover:bg-black/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
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
            <span>Continuar</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
