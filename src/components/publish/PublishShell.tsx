'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, SpinnerGap, PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { PUBLISH_STEPS } from '@/lib/types/publish';

interface PublishShellProps {
  children: React.ReactNode;
}

export function PublishShell({ children }: PublishShellProps) {
  const router = useRouter();
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
    submissionError,
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
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1a1c]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-10 bg-white dark:bg-[#222224] border-b border-neutral-200 dark:border-neutral-700">
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </button>
        </div>

        {/* Mobile progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-900 dark:text-white">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {currentStepConfig?.label}
            </span>
          </div>
          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[320px] xl:w-[360px] bg-white dark:bg-[#222224] border-r border-neutral-200 dark:border-neutral-700 lg:sticky lg:top-0 lg:h-screen">
          {/* Header */}
          <div className="p-6 xl:p-8 border-b border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </button>

            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
              Publicar Inmueble
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Completa la información de tu propiedad para publicarla
            </p>
          </div>

          {/* Current step info */}
          <div className="p-6 xl:p-8 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
              {currentStepConfig?.description}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
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
                          completedSteps.includes(step.id) ? 'bg-indigo-600' : 'bg-neutral-200 dark:bg-neutral-700'
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
                            ? 'bg-indigo-600 border-indigo-600'
                            : isCurrent
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-white dark:bg-[#222224] border-neutral-300 dark:border-neutral-600'
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
                            ? 'text-neutral-900 dark:text-white'
                            : isCompleted
                            ? 'text-neutral-700 dark:text-neutral-300'
                            : 'text-neutral-400 dark:text-neutral-500'
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
            <div className="bg-white dark:bg-[#222224] rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              {/* Desktop step header */}
              <div className="hidden lg:block px-6 py-5 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-medium">
                    {currentStep}
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-neutral-900 dark:text-white">
                      {currentStepConfig?.description}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Paso {currentStep} de {totalSteps}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile step header */}
              <div className="lg:hidden px-4 py-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-base font-medium text-neutral-900 dark:text-white">
                  {currentStepConfig?.description}
                </h3>
              </div>

              {/* Form content */}
              <div className="px-4 py-6 lg:px-6 lg:py-8">
                {children}
              </div>

              {/* Error message */}
              {submissionError && (
                <div className="mx-4 mb-4 lg:mx-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                  <WarningCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{submissionError}</p>
                </div>
              )}

              {/* Compass */}
              <div className="px-4 pb-6 lg:px-6 lg:pb-8">
                <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isFirstStep || isSubmitting}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
                      'rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224]',
                      'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600',
                      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      isFirstStep && 'invisible'
                    )}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Atrás</span>
                  </button>

                  {/* Step indicator (mobile) */}
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 sm:hidden">
                    {currentStep}/{totalSteps}
                  </span>

                  {/* Next/Submit button */}
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed || isSubmitting}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium',
                      'rounded-xl bg-indigo-600 text-white',
                      'hover:bg-indigo-700 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <SpinnerGap className="h-4 w-4 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : isLastStep ? (
                      <>
                        <span>Publicar inmueble</span>
                        <PaperPlaneTilt className="h-4 w-4" />
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

            {/* FloppyDisk indicator */}
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-4">
              Tu progreso se guarda automáticamente
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
