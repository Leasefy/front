'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { PUBLISH_STEPS } from '@/lib/types/publish';

interface PublishShellProps {
  children: React.ReactNode;
}

export function PublishShell({ children }: PublishShellProps) {
  const {
    currentStep,
    totalSteps,
    completedSteps,
    goToStep,
    prevStep,
    nextStep,
    submitProperty,
    isSubmitting,
    canProceed,
  } = usePublish();

  const currentStepConfig = PUBLISH_STEPS[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const handleNext = () => {
    if (isLastStep) {
      submitProperty();
    } else {
      nextStep();
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-black/5">
        <div className="px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-black/60 hover:text-black transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Link>
        </div>

        {/* Mobile progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-black">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-xs text-black/50">
              {currentStepConfig?.label}
            </span>
          </div>
          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[320px] xl:w-[360px] bg-white border-r border-black/5 lg:sticky lg:top-0 lg:h-screen">
          {/* Header */}
          <div className="p-6 xl:p-8 border-b border-black/5">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-black/60 hover:text-black transition-colors mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </Link>

            <h1 className="text-2xl font-semibold text-black tracking-tight">
              Publicar Inmueble
            </h1>
            <p className="text-sm text-black/50 mt-2">
              Completa la informacion de tu propiedad para publicarla
            </p>
          </div>

          {/* Current step info */}
          <div className="p-6 xl:p-8 border-b border-black/5">
            <h2 className="text-xl font-semibold text-black tracking-tight">
              {currentStepConfig?.description}
            </h2>
            <p className="text-sm text-black/50 mt-2">
              Paso {currentStep} de {totalSteps}
            </p>
          </div>

          {/* Vertical Stepper */}
          <nav className="flex-1 p-6 xl:p-8 overflow-y-auto">
            <div className="relative">
              {PUBLISH_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep;
                const isClickable = isCompleted || isCurrent || step.id === 1;
                const isLast = index === PUBLISH_STEPS.length - 1;

                return (
                  <div key={step.id} className="relative">
                    {/* Connecting line */}
                    {!isLast && (
                      <div
                        className={cn(
                          'absolute left-[11px] top-[28px] w-[2px] h-[32px]',
                          completedSteps.includes(step.id) ? 'bg-black' : 'bg-black/10'
                        )}
                      />
                    )}

                    {/* Step item */}
                    <button
                      type="button"
                      onClick={() => isClickable && goToStep(step.id)}
                      disabled={!isClickable}
                      className={cn(
                        'flex items-center gap-4 w-full py-2 text-left transition-colors',
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                      )}
                    >
                      {/* Circle indicator */}
                      <div
                        className={cn(
                          'relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all',
                          'border-2',
                          isCompleted
                            ? 'bg-black border-black'
                            : isCurrent
                            ? 'bg-black border-black'
                            : 'bg-white border-black/20'
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        ) : null}
                      </div>

                      {/* Step label */}
                      <span
                        className={cn(
                          'text-sm font-medium transition-colors',
                          isCurrent
                            ? 'text-black'
                            : isCompleted
                            ? 'text-black/70'
                            : 'text-black/40'
                        )}
                      >
                        {step.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 lg:px-8 lg:py-12">
            {/* Step content */}
            <div className="bg-white rounded-[2px] border border-black/5 shadow-sm">
              {/* Desktop step header */}
              <div className="hidden lg:block px-6 py-5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white text-sm font-medium">
                    {currentStep}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-black">
                      {currentStepConfig?.description}
                    </h3>
                    <p className="text-sm text-black/50">
                      Paso {currentStep} de {totalSteps}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile step header */}
              <div className="lg:hidden px-4 py-4 border-b border-black/5">
                <h3 className="text-base font-medium text-black">
                  {currentStepConfig?.description}
                </h3>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">
                {children}
              </div>

              {/* Navigation */}
              <div className="px-4 pb-6 lg:px-6 lg:pb-8">
                <div className="flex items-center justify-between pt-6 border-t border-black/5">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isFirstStep || isSubmitting}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
                      'rounded-[2px] border border-black/10 bg-white',
                      'text-black/70 hover:text-black hover:border-black/20',
                      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      isFirstStep && 'invisible'
                    )}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Atras</span>
                  </button>

                  {/* Step indicator (mobile) */}
                  <span className="text-sm text-black/40 sm:hidden">
                    {currentStep}/{totalSteps}
                  </span>

                  {/* Next/Submit button */}
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed || isSubmitting}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium',
                      'rounded-[2px] bg-black text-white',
                      'hover:bg-black/90 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : isLastStep ? (
                      <>
                        <span>Publicar inmueble</span>
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
              </div>
            </div>

            {/* Save indicator */}
            <p className="text-center text-xs text-black/40 mt-4">
              Tu progreso se guarda automaticamente
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
